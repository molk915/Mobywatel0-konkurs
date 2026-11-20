import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { createAssistantServer } from "../server/index.mjs";

async function setup(t) {
  let time = Date.parse("2026-11-18T08:00:00Z");
  const server = createAssistantServer({}, { clock: () => time }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  async function api({ key, body } = {}) {
    const response = await fetch("http://127.0.0.1:" + server.address().port + "/api/wellness/" + (key ? "case" : "session"), {
      method: body ? "POST" : "GET",
      headers: { ...(key ? { Authorization: "Bearer " + key } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body && JSON.stringify(body),
    });
    return { status: response.status, ...await response.json() };
  }
  const start = (profile = "ewa", stage = false) => api({ body: { profile, stage } });
  return { start, command: (key, body) => api({ key, body }), advance: (minutes) => { time += minutes * 60_000; } };
}

const plan = { slot: "parkowa", contact: "aplikacja-demo", checklist: ["documents", "questions"] };

test("wellness shares one referral and approves the reviewed visit with separate inboxes", async (t) => {
  const { start, command, advance } = await setup(t);
  const { token: owner, view: initial } = await start();
  const id = initial.cases[0].referral.id;
  assert.equal((await command(owner, { type: "simulate", event: "result" })).status, 403);
  const incoming = initial.notifications.find((item) => item.target.id === id);
  assert.equal(incoming.target.section, "referrals");
  await command(owner, { type: "read", id: incoming.id });
  const other = await start("aleksandra");
  assert.equal(other.view.cases.length, 0);
  assert.equal((await command(other.token, { type: "book", id, plan })).status, 403);
  const invited = await command(owner, { type: "invite", id, minutes: 15, details: false, prepare: true });
  const helper = invited.view.grants[0].token;
  const guest = (await command(helper)).view;
  assert.equal(guest.cases.length, 1);
  assert.equal(guest.cases[0].referral.detail, "");
  assert.equal(guest.cases[0].referral.place, "");
  assert.equal(guest.records, undefined);
  assert.equal(guest.upcoming, undefined);
  assert.deepEqual(guest.history, []);
  assert.equal(guest.grants[0].token, undefined);
  assert.equal((await command(helper, { type: "read", id: incoming.id })).status, 403);
  assert.equal((await command(helper, { type: "submit", id: "other", plan })).status, 403);
  assert.equal((await command(helper, { type: "submit", id, plan: { ...plan, slot: "invented" } })).status, 400);
  assert.equal((await command(helper, { type: "save", id, plan })).status, 200);
  assert.deepEqual((await command(helper)).view.cases[0].plan, plan);
  const sent = await command(helper, { type: "submit", id, plan });
  const first = sent.view.cases[0].reviewId;
  assert.equal((await command(helper, { type: "approve", id, reviewId: first })).status, 403);
  assert.equal((await command(helper, { type: "save", id, plan })).status, 409);
  assert.equal((await command(owner, { type: "correct", id, reviewId: first, feedback: "Wybierz wcześniejszy termin." })).status, 200);
  assert.equal((await command(helper, { type: "submit", id, plan })).status, 409);
  assert.equal((await command(helper, { type: "submit", id, plan: { ...plan, slot: "nad-rzeka" } })).status, 200);
  const review = (await command(owner)).view;
  assert.equal(review.notifications[0].target.section, "review");
  assert.equal(review.notifications.find((item) => item.id === incoming.id).read, true);
  assert.equal((await command(owner, { type: "approve", id, reviewId: first })).status, 409);
  const latest = review.cases[0].reviewId;
  const results = await Promise.all([command(owner, { type: "approve", id, reviewId: latest }), command(owner, { type: "approve", id, reviewId: latest })]);
  assert.deepEqual(results.map(({ status }) => status).sort(), [200, 409]);
  const outcome = (await command(owner)).view;
  assert.equal(outcome.cases[0].status, "confirmed");
  assert.equal(outcome.upcoming.length, 1);
  assert.equal(outcome.notifications[0].target.id, outcome.upcoming[0].id);
  assert.ok(outcome.history.some((entry) => entry.label === "Zapisano plan wizyty" && entry.actor === "Kacper"));
  assert.match((await command(helper)).view.notifications[0].title, /Ewa zatwierdziła/);
  advance(3 * 24 * 60);
  assert.match((await command(owner)).view.notifications[0].title, /Zbliża się wizyta demo/);
  assert.equal((await command(owner)).view.notifications.filter(({ title }) => title.startsWith("Zbliża się")).length, 1);
});

test("wellness enforces read-only, revocation, expiry, rejection and reset", async (t) => {
  const { start, command, advance } = await setup(t);
  const owner = (await start("ewa", true)).token;
  const id = (await command(owner)).view.cases[0].referral.id;
  const invite = async (prepare) => {
    const { view } = await command(owner, { type: "invite", id, minutes: 5, details: true, prepare });
    return view.grants.at(-1);
  };
  const readonly = await invite(false);
  assert.match((await command(readonly.token)).view.cases[0].referral.detail, /DEMO-OK/);
  assert.equal((await command(readonly.token, { type: "save", id, plan })).status, 403);
  await command(owner, { type: "revoke", grant: readonly.id });
  assert.equal((await command(readonly.token)).status, 410);
  const expiring = await invite(true);
  advance(6);
  assert.equal((await command(expiring.token, { type: "submit", id, plan })).status, 410);
  assert.equal((await command(owner)).view.cases[0].status, "new");
  const before = await invite(true);
  await command(before.token, { type: "save", id, plan });
  await command(owner, { type: "revoke", grant: before.id });
  assert.equal((await command(before.token, { type: "submit", id, plan })).status, 410);
  const after = await invite(true);
  const { view } = await command(after.token, { type: "submit", id, plan });
  const reviewId = view.cases[0].reviewId;
  assert.equal((await command(owner, { type: "reject", id, reviewId, feedback: "" })).status, 400);
  await command(owner, { type: "reject", id, reviewId, feedback: "Termin mi nie odpowiada." });
  assert.equal((await command(after.token)).view.cases[0].status, "declined");
  const simulated = await command(owner, { type: "simulate", event: "result" });
  assert.ok(simulated.view.records.some((record) => record.id === simulated.view.notifications[0].target.id));
  assert.equal((await command(after.token, { type: "simulate", event: "result" })).status, 403);
  await command(owner, { type: "reset" });
  assert.equal((await command(after.token)).status, 401);
  assert.equal((await command(owner)).view.cases.length, 1);
  assert.equal((await command(owner)).view.upcoming.length, 0);
});

test("referral reminders fire once, and shared results and visits use distinct scopes", async (t) => {
  const { start, command, advance } = await setup(t);
  const { token: owner, view } = await start();
  const id = view.cases[0].referral.id;
  const result = view.records.find(({ kind }) => kind === "test");
  const grantResult = await command(owner, { type: "share", resource: { section: "results", id: result.id }, minutes: 15 });
  const guest = grantResult.view.grants[0];
  const given = (await command(guest.token)).view;
  assert.equal(given.sharedRecord.id, result.id);
  assert.deepEqual(given.cases, []);
  for (const field of ["records", "upcoming", "sharedVisit"]) assert.equal(given[field], undefined);
  assert.equal(given.notifications[0].target.id, result.id);
  assert.equal((await command(guest.token, { type: "remind", id, enabled: true })).status, 403);
  assert.equal((await command(owner, { type: "share", resource: { section: "timeline", id: result.id }, minutes: 5 })).status, 400);
  assert.equal((await command(owner, { type: "revoke", grant: guest.id })).status, 200);
  assert.equal((await command(guest.token)).status, 410);
  const set = await command(owner, { type: "remind", id, enabled: true });
  assert.ok(set.view.cases[0].reminderAt);
  advance(24 * 60 + 1);
  const first = (await command(owner)).view;
  assert.equal(first.notifications[0].target.id, id);
  assert.match(first.notifications[0].title, /Przypomnienie o skierowaniu/);
  assert.equal((await command(owner)).view.revision, first.revision);
  const booked = (await command(owner, { type: "book", id, plan })).view.upcoming[0];
  const shareVisit = await command(owner, { type: "share", resource: { section: "visits", id: booked.id }, minutes: 5 });
  const visit = (await command(shareVisit.view.grants.at(-1).token)).view;
  assert.equal(visit.sharedVisit.id, booked.id);
  assert.equal(visit.sharedRecord, undefined);
  assert.equal(visit.upcoming, undefined);
});
