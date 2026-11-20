import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initialScope } from "../src/most/model.ts";
import { createAssistantServer } from "../server/index.mjs";
import { respond } from "../server/assistant.mjs";

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
