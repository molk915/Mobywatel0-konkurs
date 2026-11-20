import { test } from "node:test";
import assert from "node:assert/strict";
import { createAssistantServer } from "../server/index.mjs";
import { initialScope, sampleAddress, sampleReason } from "../src/most/model.ts";

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
  assert.equal(first.notifications[0].type, "review");
  assert.equal(first.work.attachment, "owner");
  await call(owner, { type: "correction", reviewId: first.work.reviewId, text: "Potwierdź adres z kopii." });
  assert.equal((await call(helper)).view.status, "correction");
  assert.equal((await call(helper, { type: "review" })).status, 409);
  await call(helper, { type: "response", reason: sampleReason + " Adres sprawdzono." });
  await call(helper, { type: "review" });
  const second = (await call(owner)).view;
  assert.equal((await call(owner, { type: "accept", reviewId: first.work.reviewId })).status, 409);
  const result = await call(owner, { type: "accept", reviewId: second.work.reviewId });
  assert.equal(result.view.notifications[0].type, "accept");
  assert.equal(result.view.status, "finished");
  assert.equal((await call(helper)).view.notifications[0].type, "accept");
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
