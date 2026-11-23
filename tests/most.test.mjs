import { test } from "node:test";
import assert from "node:assert/strict";
import { createAssistantServer } from "../server/index.mjs";
import { delegationScope, initialScope, sampleAddress, sampleReason } from "../src/most/model.ts";

async function withMost(run) {
  let time = 1_800_000_000_000;
  const server = createAssistantServer({}, { clock: () => time });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const root = "http://127.0.0.1:" + server.address().port + "/api/most/";
  async function call(token, body, route = "case") {
    const response = await fetch(root + route, {
      method: body ? "POST" : "GET",
      headers: {
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    assert.equal(response.headers.get("cache-control"), "no-store");
    return { status: response.status, ...(await response.json()) };
  }
  try {
    const { token, status } = await call(null, {}, "session");
    assert.equal(status, 201);
    const invite = async (scope = initialScope) => (await call(token, { type: "invite", scope })).view.invitation.token;
    await run({ owner: token, call, invite, advance: (ms) => { time += ms; } });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("a trusted person sees only selected cases and loses delegated access on disconnect", () => withMost(async ({ call, advance }) => {
  const create = async (kind, step) => (await call(null, { delegation: { kind, step } }, "session")).token;
  const trust = await create("trusted");
  const link = (await call(trust, { type: "invite", scope: delegationScope })).view.invitation.token;
  assert.equal((await call(link)).view.invitation.status, "waiting");
  const moving = await create("move", 1);
  const grant = { type: "invite", scope: initialScope, trustedOwnerToken: trust };
  assert.equal((await call(moving, grant)).status, 409);
  assert.deepEqual((await call(link, { type: "join" })).view.assignments, []);
  advance(600_001); // The QR acceptance window ended, the relationship is still active.
  const movingAccess = (await call(moving, grant)).view.invitation;
  assert.deepEqual(movingAccess.scope, delegationScope);
  assert.deepEqual((await call(link)).view.assignments, [{ title: "Przeprowadzka", token: movingAccess.token, legacy: true }]);
  const helper = movingAccess.token;
  const shared = (await call(helper)).view;
  assert.deepEqual(shared.delegation, { kind: "move", step: 1 });
  assert.equal(shared.document, undefined);
  assert.deepEqual(shared.files, {});
  assert.equal((await call(helper, { type: "form", address: sampleAddress })).status, 403);
  const note = "Przygotuj kopię umowy oraz potwierdzenie nowego adresu.";
  await call(helper, { type: "response", reason: note });
  assert.equal((await call(helper, { type: "review" })).view.status, "review");
  const { work } = (await call(moving)).view;
  assert.equal(work.reason, note);
  assert.equal((await call(helper, { type: "accept", reviewId: work.reviewId })).status, 403);
  assert.equal((await call(moving, { type: "accept", reviewId: work.reviewId })).view.status, "finished");
  await call(trust, { type: "revoke" });
  const replacement = (await call(trust, { type: "invite", scope: delegationScope })).view.invitation.token;
  assert.deepEqual((await call(replacement, { type: "join" })).view.assignments, []);
  assert.equal((await call(link)).status, 410);
  assert.equal((await call(helper)).status, 410);
}));

test("MOST scopes fields and bars unauthorised work and decisions", () => withMost(async ({ owner, call, invite }) => {
  const helper = await invite({ ...initialScope, form: false, response: false, attachments: false, requestDocument: false, comments: false });
  const guest = await call(helper);
  assert.deepEqual(Object.keys(guest.view.document), ["title", "office", "body"]);
  assert.equal(guest.view.invitation.token, undefined);
  assert.deepEqual(guest.view.files, {});
  assert.deepEqual(guest.view.history, []);
  assert.equal((await call(null)).status, 401);
  assert.equal((await call(helper, { type: "read", id: 1 })).status, 403);
  for (const type of ["form", "response", "attach", "request", "share", "review", "accept", "reject", "correction", "reset", "revoke"])
    assert.equal((await call(helper, { type, role: "owner" })).status, 403, type);
  await call(owner, { type: "form", address: sampleAddress });
  assert.equal((await call(helper)).view.work.address, undefined);
  await call(owner, { type: "revoke" });
  assert.equal((await call(helper)).status, 410);
  assert.equal((await call(helper, { type: "request" })).status, 410);
}));

test("MOST notifies by role, saves read state and validates the complete package", () => withMost(async ({ owner, call, invite }) => {
  const arrival = (await call(owner)).view.notifications[0];
  assert.equal(arrival.type, "letter");
  assert.ok(Date.parse(arrival.at));
  assert.equal(arrival.read, false);
  await call(owner, { type: "read", id: arrival.id });
  assert.equal((await call(owner)).view.notifications[0].read, true);
  const helper = await invite();
  assert.equal((await call(helper)).view.notifications.some(({ type }) => type === "invite"), true);
  assert.equal((await call(helper, { type: "review" })).status, 409);
  assert.equal((await call(helper, { type: "attach", source: "owner" })).status, 403);
  assert.equal((await call(helper, { type: "form", address: "brak" })).status, 400);
  await call(helper, { type: "form", address: sampleAddress });
  await call(helper, { type: "response", reason: sampleReason });
  const waiting = (await call(helper, { type: "request" })).view;
  assert.equal(waiting.status, "document");
  assert.equal((await call(owner)).view.notifications[0].type, "request");
  await call(owner, { type: "share" });
  assert.equal((await call(helper)).view.notifications[0].type, "share");
  assert.match((await call(helper)).view.files.owner.name, /Umowa najmu z dokumentów Ewy/);
  await call(helper, { type: "attach", source: "owner" });
  const review = (await call(helper, { type: "review" })).view;
  assert.equal(review.status, "review");
  assert.equal(review.complete, true);
  assert.equal((await call(helper, { type: "form", address: sampleAddress })).status, 409);
  const first = (await call(owner)).view;
  assert.equal((await call(owner, { type: "send" })).status, 409);
  assert.equal(first.previousPackage, undefined);
  assert.equal(first.notifications[0].type, "review");
  assert.equal(first.work.attachment, "owner");
  await call(owner, { type: "correction", reviewId: first.work.reviewId, text: "Potwierdź adres z kopii." });
  assert.equal((await call(helper)).view.status, "correction");
  assert.equal((await call(helper, { type: "review" })).status, 409);
  await call(helper, { type: "response", reason: sampleReason + " Adres sprawdzono." });
  await call(helper, { type: "review" });
  const second = (await call(owner)).view;
  assert.deepEqual(second.previousPackage, { address: sampleAddress, reason: sampleReason, attachment: "owner" });
  assert.equal(second.work.reason, sampleReason + " Adres sprawdzono.");
  assert.equal((await call(helper)).view.previousPackage, undefined);
  assert.equal((await call(owner, { type: "accept", reviewId: first.work.reviewId })).status, 409);
  const result = await call(owner, { type: "accept", reviewId: second.work.reviewId });
  assert.equal(result.view.notifications[0].type, "accept");
  assert.equal(result.view.status, "finished");
  assert.equal((await call(helper)).view.notifications[0].type, "accept");
  assert.equal((await call(helper, { type: "send" })).status, 403);
  const sent = (await call(owner, { type: "send" })).view;
  assert.ok(sent.sentAt);
  assert.equal((await call(helper)).view.sentAt, sent.sentAt);
  assert.equal((await call(owner, { type: "send" })).view.revision, sent.revision);
  assert.equal((await call(owner, { type: "reject", reviewId: second.work.reviewId })).status, 409);
  await call(owner, { type: "revoke" });
  assert.equal((await call(helper)).status, 410);
  assert.equal((await call(owner)).view.status, "finished");
}));

test("MOST handles rejection, expiry and reset", () => withMost(async ({ owner, call, invite, advance }) => {
  const helper = await invite();
  await call(helper);
  await call(helper, { type: "form", address: sampleAddress });
  await call(helper, { type: "response", reason: sampleReason });
  await call(helper, { type: "attach", source: "helper" });
  await call(helper, { type: "review" });
  const pending = (await call(owner)).view;
  assert.equal((await call(owner, { type: "reject", reviewId: pending.work.reviewId })).view.status, "rejected");
  assert.equal((await call(helper)).view.notifications[0].type, "reject");
  advance(600_000);
  assert.equal((await call(helper)).code, "expired");
  assert.equal((await call(owner)).view.notifications[0].type, "expiry");
  const reset = (await call(owner, { type: "reset" })).view;
  assert.equal(reset.status, "new");
  assert.deepEqual(reset.work, {});
  assert.equal(reset.notifications[0].type, "letter");
  assert.equal((await call(helper)).status, 401);
}));
