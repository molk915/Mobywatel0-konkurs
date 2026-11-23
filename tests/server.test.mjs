import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initialScope } from "../src/most/model.ts";
import { createAssistantServer } from "../server/index.mjs";
import { respond } from "../server/assistant.mjs";
import { workflowReply } from "../server/workflow-assistant.mjs";

test("trusted grants authorize one workflow and a separately authorized letter submission", async () => {
  const server = createAssistantServer({});
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + server.address().port;
  const call = async (path, key, body) => {
    const res = await fetch(url + "/api/" + path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(key && { Authorization: "Bearer " + key }) },
      body: body && JSON.stringify(body),
    });
    return { status: res.status, ...await res.json() };
  };
  try {
    const { token: trusted } = await call("most/session", null, { delegation: { kind: "trusted" } });
    const pairing = await call("most/case", trusted, { type: "invite", scope: initialScope });
    const partner = pairing.view.invitation.token;
    const { token: owner } = await call("workflows/session", null, { profile: "kacper" });
    const grant = { type: "grant", id: "fine", trustedToken: trusted };
    assert.equal((await call("workflows", owner, grant)).status, 409);
    await call("most/case", partner, { type: "join" });
    assert.equal((await call("workflows", owner, grant)).status, 200);
    const [{ token: assignment }] = (await call("most/case", partner)).view.assignments;
    assert.deepEqual((await call("workflows/delegated", assignment)).items.map(({ id }) => id), ["fine"]);
    assert.equal((await call("workflows/delegated", assignment, { type: "confirm", id: "tax", revision: 0 })).status, 403);
    assert.equal((await call("workflows/delegated", assignment, { type: "revoke", id: "fine" })).status, 403);
    await call("workflows/delegated", assignment, { type: "prepare", id: "fine", revision: 0, input: { method: "card" } });
    const { items } = await call("workflows/delegated", assignment, { type: "confirm", id: "fine", revision: 1 });
    assert.equal(items[0].performedBy, "trusted");
    assert.deepEqual((await call("workflows", owner)).items.find(({ id }) => id === "fine").receipt, items[0].receipt);
    assert.equal((await call("workflows", owner, { type: "grant", id: "registration", trustedToken: trusted })).status, 200);
    const moving = (await call("most/case", partner)).view.assignments.find(({ title }) => title.includes("stałego")).token;
    await call("workflows/delegated", moving, { type: "prepare", id: "registration", revision: 0,
      input: { street: "Lipowa 12", postalCode: "20-020", city: "Lublin", basis: "lease" } });
    assert.equal((await call("workflows/delegated", moving, { type: "confirm", id: "registration", revision: 1 })).items[0].status, "awaiting");

    const { token: letter } = await call("most/session", null, {});
    const invite = await call("most/case", letter, { type: "invite", scope: initialScope, trustedOwnerToken: trusted, maySubmit: true });
    const helper = invite.view.invitation.token;
    await call("most/case", helper);
    assert.equal((await call("most/case", helper, { type: "send", reviewId: 0 })).status, 409);
    await call("most/case", helper, { type: "form", address: "Lipowa 12, 20-020 Lublin" });
    await call("most/case", helper, { type: "response", reason: "W załączniku przykładowa kopia umowy." });
    await call("most/case", helper, { type: "attach", source: "helper" });
    const review = await call("most/case", helper, { type: "review" });
    const sent = await call("most/case", helper, { type: "send", reviewId: review.view.work.reviewId });
    assert.match(sent.view.receipt.number, /^DEMO-UP-/);
    assert.deepEqual((await call("most/case", letter)).view.receipt, sent.view.receipt);
    await call("most/case", trusted, { type: "revoke" });
    assert.equal((await call("workflows/delegated", assignment)).status, 410);
    assert.equal((await call("most/case", helper)).status, 410);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("workflow payment is isolated, retries after refusal, and persists exactly one receipt across restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "case-restart-"));
  let server;
  async function start() {
    server = createAssistantServer({ MOST_STATE_DIR: directory });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  }
  const call = async (path, key, body) => {
    const response = await fetch("http://127.0.0.1:" + server.address().port + "/api/workflows" + path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(key && { Authorization: "Bearer " + key }) },
      body: body && JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    await start();
    const { data: kacper } = await call("/session", null, { profile: "kacper" });
    const { data: ewa } = await call("/session", null, { profile: "ewa" });
    const { data: aleksandra } = await call("/session", null, { profile: "aleksandra" });
    const operation = { type: "confirm", id: "fine", revision: 0 };
    assert.equal((await call("", null)).status, 401);
    assert.equal((await call("", aleksandra.token, operation)).status, 404);
    assert.equal((await call("", kacper.token, operation)).status, 409);
    const ask = await call("/assistant", kacper.token, { text: "Potwierdź za mnie mandat", profile: "ewa" });
    assert.match(ask.data.message.text, /300,00 zł/);
    assert.equal(ask.data.message.workflowAction, "fine");
    assert.match((await call("/assistant", ewa.token, { text: "Czy mam mandat?" })).data.message.text, /150,00 zł/);
    assert.equal((await call("", kacper.token)).data.items.find(({ id }) => id === "fine").status, "new");
    const prepare = (revision, method) => ({ type: "prepare", id: "fine", revision, input: { method } });
    await call("", kacper.token, prepare(0, "test-failure"));
    const fail = await call("", kacper.token, { ...operation, revision: 1 });
    assert.equal(fail.data.items.find(({ id }) => id === "fine").status, "failed");
    await call("", kacper.token, prepare(2, "blik"));
    const both = await Promise.all([1, 2].map(() => call("", kacper.token, { ...operation, revision: 3 })));
    const receipt = both[0].data.items.find(({ id }) => id === "fine").receipt;
    assert.ok(receipt.number.startsWith("DEMO-"));
    assert.equal((await call("", ewa.token)).data.items.find(({ id }) => id === "fine").status, "new");
    assert.deepEqual(both[1].data.items.find(({ id }) => id === "fine").receipt, receipt);
    await new Promise((resolve) => server.close(resolve));
    await start();
    const revived = (await call("", kacper.token)).data.items.find(({ id }) => id === "fine");
    assert.deepEqual(revived.receipt, receipt);
    assert.equal(revived.history.filter(({ status }) => status === "paid").length, 1);
    assert.equal((await call("", kacper.token, prepare(revived.revision, "card"))).status, 409);
    const paidChat = await call("/assistant", kacper.token, { text: "Tak", context: "fine" });
    assert.match(paidChat.data.message.text, new RegExp(receipt.number));
  } finally {
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});

test("MOST validates file metadata and only owner sends the approved package", async () => {
  const server = createAssistantServer({});
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const api = "http://127.0.0.1:" + server.address().port;
  const call = async (path, key, body) => {
    const response = await fetch(api + path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(key && { Authorization: "Bearer " + key }) },
      body: body && JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    const { data: owner } = await call("/api/most/session", null, {});
    const { data: invited } = await call("/api/most/case", owner.token, { type: "invite", scope: initialScope });
    const helper = invited.view.invitation.token;
    await call("/api/most/case", helper);
    const file = { name: "Umowa demo.pdf", mime: "application/pdf", size: 55, digest: "a".repeat(64) };
    assert.equal((await call("/api/most/case", helper, { type: "upload", file: { ...file, size: 6 * 1024 ** 2 } })).status, 400);
    assert.equal((await call("/api/most/case", owner.token, { type: "send" })).status, 409);
    assert.equal((await call("/api/most/case", helper, { type: "review" })).status, 409);
    await call("/api/most/case", helper, { type: "form", address: "Jasna 8, 00-013 Warszawa" });
    await call("/api/most/case", helper, { type: "response", reason: "Dołączam przykładową kopię umowy." });
    await call("/api/most/case", helper, { type: "upload", file });
    const { data: review } = await call("/api/most/case", helper, { type: "review" });
    const reviewId = (await call("/api/most/case", owner.token)).data.view.work.reviewId;
    assert.equal(review.view.status, "review");
    assert.equal((await call("/api/most/case", helper, { type: "accept", reviewId })).status, 403);
    await call("/api/most/case", owner.token, { type: "accept", reviewId });
    assert.equal((await call("/api/most/case", helper, { type: "send", reviewId })).status, 403);
    assert.equal((await call("/api/most/case", owner.token, { type: "send", reviewId: reviewId - 1 })).status, 409);
    const { data: sent } = await call("/api/most/case", owner.token, { type: "send", reviewId });
    assert.match(sent.view.receipt.number, /^DEMO-UP-/);
    assert.equal(sent.view.work.upload.name, file.name);
    const { data: sentAgain } = await call("/api/most/case", owner.token, { type: "send", reviewId });
    assert.deepEqual(sentAgain.view.receipt, sent.view.receipt);
    const { data: ewa } = await call("/api/workflows/session", null, { profile: "ewa" });
    const message = await call("/api/workflows/assistant", ewa.token, { text: "Co z moim pismem?", letterToken: owner.token });
    assert.match(message.data.message.text, new RegExp(sent.view.receipt.number));
    const privateReply = await call("/api/workflows/assistant", ewa.token, { text: "Co z moim pismem?", letterToken: helper });
    assert.equal(privateReply.data.message, null);
    await call("/api/most/case", owner.token, { type: "revoke" });
    assert.equal((await call("/api/most/case", helper)).status, 410);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("workflow assistant confines provider output to the authorized server record", async () => {
  const session = { items: [{ kind: "fine", status: "new", createdAt: "2026-11-30T23:20:00Z" }] };
  const env = { ASSISTANT_PROVIDER: "compatible", MODEL_BASE_URL: "https://example.invalid/v1", MODEL_NAME: "test" };
  const reply = await workflowReply({ text: "Pokaż zaległą grzywnę" }, session, null, env, async () => ({
    ok: true, json: async () => ({ choices: [{ message: {
      content: "Zapłacono 5000 zł", tool_calls: [{ function: { name: "open_case", arguments: '{"action":"fine"}' } }],
    } }] }),
  }));
  assert.match(reply.text, /300,00 zł/);
  assert.match(reply.text, /Termin płatności: 9\.12\.2026/);
  assert.doesNotMatch(reply.text, /5000|Zapłacono/);
  const fallback = await workflowReply({ text: "Wyprowadzam się" }, session, null, env, async () => { throw new Error("offline"); });
  assert.equal(fallback.workflowAction, "move");
  assert.equal(fallback.fallback, true);
});

test("MOST restores a saved draft and revoked access after restarting the server", async () => {
  const directory = await mkdtemp(join(tmpdir(), "most-restart-"));
  async function start() {
    const server = createAssistantServer({ MOST_STATE_DIR: directory });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return server;
  }
  let server;
  try {
    server = await start();
    const call = (token, command) => fetch("http://127.0.0.1:" + server.address().port + "/api/most/" + (token ? "case" : "session"), {
      method: command ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
      body: command && JSON.stringify(command),
    });
    const { token, view } = await (await call(null, {})).json();
    const invited = await (await call(token, { type: "invite", scope: initialScope })).json();
    const helper = invited.view.invitation.token;
    assert.equal((await call(helper)).status, 200);
    assert.equal((await call(helper, { type: "form", address: "ul. Lipowa 12, Lublin" })).status, 200);
    assert.equal((await call(token, { type: "revoke" })).status, 200);
    await new Promise((resolve) => server.close(resolve));
    server = await start();
    const restored = await (await call(token)).json();
    assert.equal(restored.view.work.address, "ul. Lipowa 12, Lublin");
    assert.equal(restored.view.deadlineAt, view.deadlineAt);
    assert.equal((await call(helper)).status, 410);
  } finally {
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
test("bounded screen and document context produce actions; drafts resume without new data", async () => {
  const context = {
    profileName: "Kacper",
    protected: false,
    screen: "home",
    documentId: 1,
  };
  const share = await respond(
    { text: "Udostępnij ten dokument", context },
    { ASSISTANT_PROVIDER: "demo" },
  );
  assert.equal(share.shareDocumentId, 1);
  assert.equal(share.action, undefined);
  const resume = await respond(
    {
      text: "Kontynuuj sprawę",
      context: {
        ...context,
        documentId: undefined,
        drafts: [{ kind: "move", nextStep: "Nowy adres" }],
      },
    },
    { ASSISTANT_PROVIDER: "demo" },
  );
  assert.equal(resume.action, "move");
  assert.match(resume.text, /Nowy adres/);
  assert.equal(resume.suggestedData, undefined);
  await assert.rejects(
    respond(
      { text: "Pokaż dokument", context: { ...context, documentId: 7 } },
      { ASSISTANT_PROVIDER: "demo" },
    ),
  );
});
test("backend demo uses the same contract and never executes suggested actions", async () => {
  const server = createAssistantServer({ ASSISTANT_PROVIDER: "demo" });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = "http://127.0.0.1:" + server.address().port + "/api/assistant";
  try {
    const body = {
      text: "Przeprowadzam się z Warszawy do Krakowa",
      context: { profileName: "Aleksandra", protected: false },
    };
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.equal(data.action, "move");
    assert.deepEqual(data.suggestedData, { city: "Kraków" });
    assert.equal(data.receipts, undefined);
    const bad = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        context: { profileName: "Realna osoba", protected: false },
      }),
    });
    assert.equal(bad.status, 400);
    const cross = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://unrelated.example",
      },
      body: JSON.stringify(body),
    });
    assert.equal(cross.status, 403);
    const large = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, text: "x".repeat(8500) }),
    });
    assert.equal(large.status, 413);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
test("compatible model tool calls become bounded proposals, never transactions", async () => {
  let request;
  const result = await respond(
    {
      text: "Chcę zmienić adres",
      context: { profileName: "Kacper", protected: false },
    },
    {
      ASSISTANT_PROVIDER: "compatible",
      MODEL_BASE_URL: "http://model.invalid/v1",
      MODEL_NAME: "local-test",
    },
    async (url, options) => {
      request = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      name: "prepare_process",
                      arguments: JSON.stringify({
                        kind: "move",
                        city: "Kraków",
                        explanation: "Przygotujmy plan.",
                        consent: true,
                      }),
                    },
                  },
                ],
              },
            },
          ],
        }),
      };
    },
  );
  assert.equal(request.tools[0].function.name, "prepare_process");
  assert.equal(result.action, "move");
  assert.equal(result.consent, undefined);
  assert.deepEqual(result.suggestedData, { city: "Kraków" });
});
test("contextual assistant returns the existing process; source and destination remain distinct", async () => {
  const context = {
    profileName: "Ewa",
    protected: false,
    process: {
      id: "DEMO-TEST",
      kind: "move",
      nextStep: "Czeka na dokument",
      completed: 1,
      total: 2,
    },
  };
  const result = await respond(
    { text: "Co teraz zrobić?", context },
    { ASSISTANT_PROVIDER: "demo" },
  );
  assert.equal(result.caseId, "DEMO-TEST");
  assert.equal(result.action, undefined);
  assert.match(result.text, /1 z 2/);
});
