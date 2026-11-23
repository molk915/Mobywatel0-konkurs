import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import http from "node:http";
import test from "node:test";
import { createAssistantServer } from "../server/index.mjs";

const scope = { document: false, reference: false, form: false, response: true, attachments: false, requestDocument: false, comments: false };

async function start(directory, clock, settings = {}) {
  const server = createAssistantServer({ ...settings, MOST_STATE_DIR: directory }, { clock });
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  async function send(path, token, command, status = 200) {
    const result = await fetch(origin + "/api/" + path, {
      method: command ? "POST" : "GET",
      headers: { ...(token && { Authorization: "Bearer " + token }), ...(command && { "Content-Type": "application/json" }) },
      body: command && JSON.stringify(command),
    });
    const data = await result.json();
    assert.equal(result.status, status, JSON.stringify(data));
    return data;
  }
  return { send, close: () => new Promise((resolve) => server.close(resolve)) };
}

async function connect(send, profile = "ewa") {
  const { token: owner } = await send("most/session", null, { delegation: { kind: "trusted" } }, 201);
  const { token: paper } = await send("most/session", null, {}, 201);
  const { token: workflows } = await send("workflows/session", null, { profile }, 201);
  await send("most/control", owner, { type: "bind", workflowKey: workflows, ...(profile === "ewa" && { letterKey: paper }) });
  const invite = await send("most/case", owner, { type: "invite", scope });
  const helper = invite.view.invitation.token;
  await send("most/case", helper, { type: "join" });
  return { owner, paper, workflows, helper };
}
async function grant(send, owner, selection, extra = {}) {
  const control = "most/control";
  const authorized = await send(control, owner, { type: "authorize", selection, ...extra });
  const command = { type: "grant", key: authorized.authorization.key, confirmDemo: true };
  const { view } = await send(control, owner, command);
  await send(control, owner, command, 409);
  return view.grants.find((grant) => grant.resource === selection.resource && grant.status === "active");
}

test("MOST control persists privacy, deadlines, requests, formal demo and the letter operation across restart", async () => {
  const directory = mkdtempSync(join(tmpdir(), "most-control-"));
  let timestamp = Date.parse("2026-06-01T10:00:00Z");
  let api = await start(directory, () => timestamp);
  const control = "most/control";
  try {
    const { owner, paper, helper, workflows } = await connect(api.send);
    const outsider = await connect(api.send, "aleksandra");
    await api.send(control, owner, { type: "bind", workflowKey: outsider.workflows }, 403);
    await api.send(control, paper, undefined, 401);
    await api.send(control, helper, { type: "document", id: "passport" }, 403);
    await api.send(control, outsider.helper, { type: "deadline", id: "inspection", date: "2026-06-20" }, 403);
    const monitoring = await grant(api.send, owner, { resource: "vehicle", actions: ["monitor"], duration: "period", end: "2026-06-01", mode: "owner" });
    assert.equal(monitoring.expires, Date.parse("2026-06-01T22:00:00Z"));
    const doc = await grant(api.send, owner, { resource: "passport", actions: ["view"], duration: "open", mode: "owner" });
    const initial = (await api.send(control, helper)).view;
    assert.deepEqual(initial.deadlines.map((row) => row.id).filter((id) => !id.startsWith("grant:")).sort(), ["inspection", "insurance"]);
    assert.equal(initial.resources.some(({ id }) => id === "tax"), false);
    assert.match((await api.send(control, helper, { type: "assistant", text: "Pokaż wyniki badań Ewy" })).answer.text, /nie udostępnia/);
    assert.match((await api.send(control, helper, { type: "assistant", text: "Pokaż pismo" })).answer.text, /Brakuje/);
    assert.match((await api.send(control, helper, { type: "document", id: "passport" })).document.text, /FIKCYJNY/);
    await api.send(control, helper, { type: "document", id: "passport", download: true }, 403);
    assert.equal((await api.send(control, outsider.helper)).view.grants.length, 0);

    await api.send(control, owner, { type: "deadline", id: "inspection", date: "2026-06-02" });
    const refreshed = (await api.send(control, helper)).view;
    assert.equal(refreshed.deadlines.find(({ id }) => id === "inspection").date, "2026-06-02");
    const notices = refreshed.notifications.filter(({ resource }) => resource === "inspection");
    assert.equal(notices.length, 1);
    await api.send(control, helper, { type: "read", id: notices[0].id });
    assert.equal((await api.send(control, helper)).view.notifications.find(({ id }) => id === notices[0].id).read, true);

    await api.send(control, helper, { type: "request", resource: "letter" });
    const requested = (await api.send(control, owner)).view.requests.find(({ status }) => status === "pending");
    assert.ok(requested);
    const letter = await grant(api.send, owner, { resource: "letter", actions: ["view", "prepare", "attach", "submit"], duration: "open", mode: "confirm", formalRequired: true }, { requestId: requested.id });
    const authorized = (await api.send(control, helper)).view.grants.find(({ id }) => id === letter.id);
    const letterHelper = authorized.href.split("#most=")[1];
    assert.equal(authorized.formal, undefined);
    assert.equal(authorized.waitingForFormal, true);
    assert.equal((await api.send("most/case", letterHelper)).view.invitation.maySubmit, false);
    await api.send(control, owner, { type: "formal-draft", id: letter.id, procedure: "administrative" });
    await api.send(control, owner, { type: "formal-sign", id: letter.id, confirmDemo: true }, 400);
    await api.send(control, owner, { type: "formal-method", id: letter.id, method: "zaufany" });
    await api.send(control, owner, { type: "formal-sign", id: letter.id, confirmDemo: true });
    await api.send(control, owner, { type: "formal-review", id: letter.id });
    const formal = await api.send(control, owner, { type: "formal-result", id: letter.id, accept: true });
    assert.equal(formal.view.grants.find(({ id }) => id === letter.id).formal.status, "checked-demo");
    const formalDocument = await api.send(control, owner, { type: "formal-document", id: letter.id, download: true });
    assert.match(formalDocument.document.text, /Sprawdzono w symulacji/);
    assert.match(formalDocument.document.text, /Pełnomocnik: Kacper Zieliński/);
    await api.send(control, helper, { type: "formal-document", id: letter.id }, 403);
    assert.equal((await api.send("most/case", letterHelper)).view.invitation.maySubmit, true);
    assert.match((await api.send(control, helper, { type: "assistant", text: "Co zawiera pismo?" })).answer.text, /kopię umowy/);
    await api.send("most/case", letterHelper, { type: "openDocument" });
    await api.send("most/case", letterHelper, { type: "form", address: "ul. Lipowa 12/4, 20-020 Lublin" });
    await api.send("most/case", letterHelper, { type: "response", reason: "W imieniu mocodawczyni przekazuję kopię umowy najmu." });
    await api.send("most/case", letterHelper, { type: "attach", source: "helper" });
    const reviewed = await api.send("most/case", letterHelper, { type: "review" });
    const reviewId = reviewed.view.work.reviewId;
    await api.send("most/case", letterHelper, { type: "send", reviewId }, 403);
    const { challenge } = await api.send("most/case", letterHelper, { type: "authorizeSend", reviewId });
    const sent = await api.send("most/case", letterHelper, { type: "send", reviewId, challenge });
    assert.equal(sent.view.receipt.version, reviewId);
    assert.equal(sent.view.receipt.performedBy, "helper");
    const { view } = await api.send(control, owner);
    assert.ok(view.history.some(({ label, detail, grant }) => label === "Wysłano odpowiedź w pokazie" && grant === letter.id && detail.includes(sent.view.receipt.number)));
    assert.ok(view.notifications.some(({ title }) => title.includes("Wykonano operację")));
    assert.equal((await api.send("most/case", paper)).view.receipt.number, sent.view.receipt.number);

    await api.close();
    api = await start(directory, () => timestamp);
    assert.equal((await api.send(control, helper)).view.deadlines.find(({ id }) => id === "inspection").date, "2026-06-02");
    assert.equal((await api.send("most/case", letterHelper)).view.receipt.number, sent.view.receipt.number);
    timestamp = Date.parse("2026-06-01T22:00:00Z");
    assert.equal((await api.send(control, owner)).view.grants.find(({ id }) => id === monitoring.id).status, "expired");
    await api.send(control, helper, { type: "nudge", id: "inspection" }, 403);
    await api.send(control, owner, { type: "revoke", id: doc.id });
    await api.send(control, helper, { type: "document", id: "passport" }, 403);
    await api.send(control, owner, { type: "revoke", id: letter.id });
    await api.send("most/case", letterHelper, { type: "send", reviewId, challenge }, 410);
    assert.ok(!(await api.send(control, helper)).view.grants.length);
    assert.ok((await api.send(control, owner)).view.history.some(({ result }) => result === "Odmówiono"));
    assert.equal((await api.send("workflows", workflows)).items.length, 2);
  } finally {
    await api.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("one owner manages two QR connections with distinct grants and shared deadline changes", async () => {
  const api = await start(undefined, () => Date.parse("2026-06-01T10:00:00Z"));
  const control = "most/control";
  try {
    const { owner, helper } = await connect(api.send);
    const { peer } = await api.send(control, owner, { type: "add-peer" });
    const invite = (await api.send("most/case", peer, { type: "invite", scope })).view.invitation;
    await api.send("most/case", invite.token, { type: "join", profile: "aleksandra" });
    const first = await grant(api.send, owner, { resource: "inspection", actions: ["monitor"], duration: "open", mode: "owner" });
    await grant(api.send, peer, { resource: "vehicle", actions: ["monitor"], duration: "open", mode: "owner" });
    const second = (await api.send(control, invite.token)).view;
    assert.equal(second.connections, undefined);
    assert.ok(second.deadlines.some(({ id }) => id === "insurance"));
    assert.ok(!(await api.send(control, helper)).view.deadlines.some(({ id }) => id === "insurance"));
    await api.send(control, peer, { type: "deadline", id: "inspection", date: "2026-06-08" });
    assert.equal((await api.send(control, helper)).view.deadlines.find(({ id }) => id === "inspection").date, "2026-06-08");
    const overview = (await api.send(control, owner)).view;
    assert.equal(overview.connections.length, 2);
    assert.equal(overview.history.filter(({ label }) => label === "Udzielono dostępu").length, 2);
    assert.ok(overview.history.some(({ label }) => label === "Zmieniono termin"));
    await api.send(control, owner, { type: "revoke", id: first.id });
    assert.ok(!(await api.send(control, helper)).view.deadlines.some(({ id }) => id === "inspection"));
    assert.ok((await api.send(control, invite.token)).view.deadlines.some(({ id }) => id === "inspection"));
  } finally { await api.close(); }
});

test("MOST control delegates only the selected obligation and commits one concurrent payment", async () => {
  const api = await start(undefined, () => Date.parse("2026-06-01T10:00:00Z"));
  try {
    const { owner, helper, workflows } = await connect(api.send, "kacper");
    const control = "most/control";
    const fine = await grant(api.send, owner, { resource: "fine", actions: ["view", "prepare", "pay"], duration: "open", mode: "confirm" });
    const helperView = (await api.send(control, helper)).view;
    const key = helperView.grants.find(({ id }) => id === fine.id).href.split("#workflow=")[1];
    const path = "workflows/delegated";
    assert.deepEqual((await api.send(path, key)).items.map(({ id }) => id), ["fine"]);
    await api.send(path, key, { type: "prepare", id: "tax", revision: 0, input: { method: "blik" } }, 403);
    const prepared = await api.send(path, key, { type: "prepare", id: "fine", revision: 0, input: { method: "blik" } });
    const revision = prepared.items[0].revision;
    await api.send(path, key, { type: "confirm", id: "fine", revision }, 403);
    const { challenge } = await api.send(path, key, { type: "authorize", id: "fine", revision });
    const command = { type: "confirm", id: "fine", revision, challenge };
    const [first, second] = await Promise.all([api.send(path, key, command), api.send(path, key, command)]);
    assert.equal(first.items[0].receipt.number, second.items[0].receipt.number);
    assert.equal(first.items[0].history.filter(({ status }) => status === "paid").length, 1);
    assert.equal(first.items[0].history[0].trusted, undefined);
    assert.equal((await api.send("workflows", workflows)).items.find(({ id }) => id === "fine").receipt.number, first.items[0].receipt.number);
    assert.equal((await api.send(control, owner)).view.history.filter(({ label }) => label === "Opłacono w pokazie").length, 1);
    await api.send(control, owner, { type: "revoke", id: fine.id });
    await api.send(path, key, undefined, 410);
  } finally { await api.close(); }
});

test("a trusted person can start a delegated submission and leave confirmation to the owner", async () => {
  const api = await start(undefined, () => Date.parse("2026-06-01T10:00:00Z"));
  try {
    const { owner, helper, workflows } = await connect(api.send);
    const control = "most/control";
    const grantId = await grant(api.send, owner, { resource: "tax-address", actions: ["view", "prepare"], duration: "case", mode: "owner" });
    const delegated = (await api.send(control, helper)).view.grants.find(({ id }) => id === grantId.id);
    const key = delegated.href.split("#workflow=")[1];
    assert.equal((await api.send("workflows/delegated", key)).items[0].status, "new");
    const input = { city: "Lublin", street: "Lipowa 12", postalCode: "20-020", office: "Urząd skarbowy w Lublinie" };
    const result = await api.send("workflows/delegated", key, { type: "prepare", id: "tax-address", revision: 0, input });
    const command = { type: "confirm", id: "tax-address", revision: result.items[0].revision };
    await api.send("workflows/delegated", key, command, 403);
    await api.send("workflows", workflows, command, 409);
    const review = await api.send("workflows/delegated", key, { ...command, type: "review" });
    assert.equal(review.items[0].approval, "requested");
    const ownerResult = await api.send("workflows", workflows, { ...command, revision: review.items[0].revision });
    assert.equal(ownerResult.items.find(({ id }) => id === "tax-address").performedBy, "owner");
    await api.send("workflows/delegated", key, undefined, 410);
    assert.equal((await api.send(control, owner)).view.grants.find(({ id }) => id === grantId.id).status, "completed");
  } finally { await api.close(); }
});

test("a restricted letter draft survives leaving the case and can be handed off without an attachment", async () => {
  const api = await start(undefined, () => Date.parse("2026-06-01T10:00:00Z"));
  const control = "most/control";
  try {
    const { owner, helper, paper } = await connect(api.send);
    const scope = await grant(api.send, owner, { resource: "letter", actions: ["view", "prepare"], duration: "open", mode: "owner" });
    const view = (await api.send(control, helper)).view;
    assert.deepEqual(view.cases.map(({ id, stage }) => ({ id, stage })), [{ id: "letter", stage: "new" }]);
    const key = view.grants.find(({ id }) => id === scope.id).href.split("#most=")[1];
    await api.send("most/case", key, { type: "saveDraft", draft: { reason: "Szkic" } });
    assert.equal((await api.send("most/case", key)).view.work.reason, "Szkic");
    assert.equal((await api.send(control, helper)).view.cases[0].stage, "draft");
    const reason = "W imieniu właścicielki odpowiadam na wezwanie w sprawie lokalu.";
    const review = (await api.send("most/case", key, { type: "review", draft: { reason } })).view;
    assert.equal(review.status, "review");
    assert.equal(review.complete, false);
    assert.equal((await api.send("most/case", paper)).view.work.reason, reason);
    assert.equal((await api.send(control, owner)).view.cases.find(({ id }) => id === "letter").stage, "review");
    assert.ok((await api.send(control, owner)).view.notifications.some(({ title }) => /Szkic czeka/.test(title)));
    const reviewId = (await api.send("most/case", paper)).view.work.reviewId;
    await api.send("most/case", paper, { type: "accept", reviewId }, 409);
    await api.send("most/case", paper, { type: "resumeDraft", reviewId });
    await api.send("most/case", paper, { type: "form", address: "Lipowa 12/4, 20-020 Lublin" });
    await api.send("most/case", paper, { type: "attach", source: "owner" });
    const complete = (await api.send("most/case", paper, { type: "review" })).view;
    assert.equal(complete.complete, true);
    await api.send("most/case", paper, { type: "accept", reviewId: complete.work.reviewId });
    await api.send("most/case", paper, { type: "send", reviewId: complete.work.reviewId });
    assert.equal((await api.send(control, helper)).view.cases[0].stage, "done");
  } finally { await api.close(); }
});

test("the model can select an allowed context but the server decides what to disclose", async () => {
  const prompts = [];
  const provider = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    prompts.push(JSON.parse(Buffer.concat(chunks)));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { tool_calls: [{
      function: { name: "select_context", arguments: JSON.stringify({ context: "letter" }) },
    }] } }] }));
  });
  await new Promise((resolve, reject) => provider.once("error", reject).listen(0, "127.0.0.1", resolve));
  const api = await start(undefined, () => Date.parse("2026-06-01T10:00:00Z"), {
    ASSISTANT_PROVIDER: "compatible", MODEL_NAME: "test", MODEL_BASE_URL: "http://127.0.0.1:" + provider.address().port,
  });
  const control = "most/control";
  try {
    const { owner, helper } = await connect(api.send);
    const command = { type: "assistant", text: "Wyjaśnij, co mam teraz zrobić." };
    const denied = (await api.send(control, helper, command)).answer;
    assert.equal(denied.provider, "demo");
    assert.ok(!denied.links.length);
    assert.ok(!prompts[0].tools[0].function.parameters.properties.context.enum.includes("letter"));
    const scope = await grant(api.send, owner, { resource: "letter", actions: ["view"], duration: "open", mode: "owner" });
    const allowed = (await api.send(control, helper, command)).answer;
    assert.equal(allowed.provider, "model");
    assert.match(allowed.text, /kopię umowy najmu/);
    assert.equal(allowed.links.length, 1);
    assert.ok(prompts[1].tools[0].function.parameters.properties.context.enum.includes("letter"));
    assert.deepEqual(JSON.parse(prompts[1].messages.find(({ role }) => role === "user").content), { text: command.text });
    await api.send(control, owner, { type: "revoke", id: scope.id });
    assert.equal((await api.send(control, helper, command)).answer.links.length, 0);
  } finally {
    await api.close();
    await new Promise((resolve) => provider.close(resolve));
  }
});
