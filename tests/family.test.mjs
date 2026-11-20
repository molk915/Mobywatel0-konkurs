import { test } from "node:test";
import assert from "node:assert/strict";
import { createAssistantServer } from "../server/index.mjs";

const form = { purpose: "Wyjazd wakacyjny", office: "Warszawa – Mokotów" };

async function withApi(run) {
  const server = createAssistantServer({});
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port + "/api/family/";
  async function api(path, token, body) {
    const response = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    assert.equal(response.headers.get("cache-control"), "no-store");
    return { status: response.status, data: await response.json() };
  }
  try {
    const session = await api("session", null, {});
    assert.equal(session.status, 201);
    await run(
      (token) => api("case", token),
      (token, type, revision, fields) => api("case", token, { type, revision, form: fields }),
      session.data,
      () => api("session", null, {}),
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("each role sees its own projection and the server checks writes", () => withApi(async (read, act, owner, create) => {
  const { token: aleksandra, invites: { tomasz, zosia } } = owner;
  assert.equal((await read("unknown")).status, 401);
  assert.equal((await act(tomasz, "save", 0, form)).status, 403);
  assert.equal((await act(zosia, "approve", 0)).status, 403);
  assert.equal((await act(zosia, "save", 0, form)).status, 403);
  assert.equal((await act(aleksandra, "approve", 0)).status, 403);
  assert.equal((await act(aleksandra, "request", 0)).status, 409);
  assert.equal((await act(aleksandra, "save", 0, { ...form, purpose: "Pole spoza listy" })).status, 400);
  const saved = await act(aleksandra, "save", 0, { ...form, pesel: "DEMO" });
  assert.deepEqual(saved.data.view.case.form, form);
  assert.equal((await read(tomasz)).data.view.case, null);
  assert.equal((await act(aleksandra, "request", 1)).status, 200);
  const child = (await read(zosia)).data;
  assert.equal(child.view.role, "zosia");
  assert.equal(child.view.case, null);
  assert.equal(child.invites, undefined);
  assert.deepEqual(child.view.members.filter((member) => member.passport).map(({ id }) => id), ["zosia"]);
  const recipient = (await read(tomasz)).data;
  assert.equal(recipient.invites, undefined);
  assert.equal(recipient.view.case.request.recipient, "tomasz");
  assert.deepEqual(recipient.view.case.history.map(({ type }) => type), ["requested"]);
  const second = (await create()).data;
  assert.equal((await read(second.invites.tomasz)).data.view.case, null);
}));

test("approval finishes preparation and a concurrent conflicting decision is rejected", () => withApi(async (read, act, owner) => {
  const { token: aleksandra, invites: { tomasz } } = owner;
  await act(aleksandra, "save", 0, form);
  await act(aleksandra, "request", 1);
  assert.equal((await act(aleksandra, "save", 2, form)).status, 409);
  const results = await Promise.all([act(tomasz, "approve", 2), act(tomasz, "approve", 2)]);
  assert.deepEqual(results.map(({ status }) => status).sort(), [200, 409]);
  const current = (await read(aleksandra)).data.view.case;
  assert.equal(current.status, "ready");
  assert.deepEqual(current.history.map(({ type }) => type), ["saved", "requested", "approved"]);
  assert.equal((await act(tomasz, "decline", 3)).status, 409);
}));

test("refusal remains in history and the second parent sees new data only after sharing again", () => withApi(async (read, act, owner) => {
  const { token: aleksandra, invites: { tomasz } } = owner;
  await act(aleksandra, "save", 0, form);
  await act(aleksandra, "request", 1);
  assert.equal((await act(tomasz, "decline", 2)).status, 200);
  assert.equal((await read(aleksandra)).data.view.case.status, "declined");
  const revised = { ...form, office: "Warszawa – Wola" };
  assert.equal((await act(aleksandra, "save", 3, revised)).status, 200);
  assert.equal((await read(tomasz)).data.view.case.form.office, form.office);
  assert.equal((await act(aleksandra, "request", 4)).status, 200);
  const current = (await read(tomasz)).data.view.case;
  assert.equal(current.form.office, revised.office);
  assert.deepEqual(current.history.map(({ type }) => type), ["requested", "declined", "requested"]);
  assert.deepEqual(current.history.filter(({ sharedForm }) => sharedForm).map(({ sharedForm }) => sharedForm), [form, revised]);
  assert.equal((await act(tomasz, "approve", 2)).status, 409);
  assert.equal((await act(tomasz, "approve", 5)).status, 200);
}));
