import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeLetter,
  caseMeta,
  completeCase,
  DemoAssistant,
  freshDraft,
  initialCitizen,
  profiles,
  sampleLetter,
  validateStep,
  supplyMovingDocument,
  sendMovingDocument,
  receiptNeedsAction,
  receiptNextStep,
  confirmManualOperation,
} from "../src/domain.ts";
test("package remains active until both document and manual step are resolved", () => {
  const d = freshDraft("move");
  Object.assign(d.data, {
    city: "Warszawa",
    street: "Jasna 8",
    postal: "00-013",
    car: "true",
    consent: "true",
  });
  d.step = 3;
  const c = completeCase(initialCitizen(profiles[0]), d),
    id = c.receipts[0].id;
  assert.equal(receiptNeedsAction(c.receipts[0]), true);
  assert.equal(receiptNextStep(c.receipts[0]), "Czeka na dokument");
  const supplied = supplyMovingDocument(c, id, "file", "demo.txt");
  assert.equal(
    receiptNextStep(supplied.receipts[0]),
    "Wyślij zgłoszenie zameldowania",
  );
  const sent = sendMovingDocument(supplied, id);
  const done = confirmManualOperation(sent, id, "car");
  assert.equal(receiptNeedsAction(done.receipts[0]), false);
  assert.equal(done.receipts[0].operations![2].status, "manual-done");
  assert.equal(done.access[0].who, "Ty · lokalne potwierdzenie");
  assert.throws(() => confirmManualOperation(done, id, "car"));
  assert.throws(() => confirmManualOperation(c, id, "meldunek"));
});
test("moving package preserves per-recipient outcomes and safely accepts a local document", () => {
  const d = freshDraft("move");
  Object.assign(d.data, {
    city: "Warszawa",
    street: "Jasna 8",
    postal: "00-013",
    car: "true",
    consent: "true",
  });
  d.step = 3;
  const c = completeCase(initialCitizen(profiles[0]), d),
    r = c.receipts[0];
  assert.deepEqual(
    r.operations!.map((o) => o.status),
    ["needs-document", "accepted", "manual"],
  );
  assert.equal(c.access.length, 5);
  const next = supplyMovingDocument(c, r.id, "file-1", "demo.txt");
  assert.equal(next.receipts[0].operations![0].status, "ready-to-send");
  assert.equal(next.access.length, c.access.length);
  assert.equal(sendMovingDocument(c, r.id), c);
  const sent = sendMovingDocument(next, r.id);
  assert.equal(sent.receipts[0].operations![0].status, "accepted");
  assert.equal(sendMovingDocument(sent, r.id), sent);
  assert.equal(next.receipts[0].operations![2].status, "manual");
  assert.equal(c.receipts[0].operations![0].status, "needs-document");
  assert.throws(() => supplyMovingDocument(next, r.id, "file-2", "other.txt"));
  assert.throws(() =>
    supplyMovingDocument(c, "not-owned", "file-1", "demo.txt"),
  );
});

test("final confirmation cannot bypass missing address or consent", () => {
  const d = freshDraft("move");
  d.step = 3;
  assert.throws(() => completeCase(initialCitizen(profiles[0]), d));
  d.data.consent = "true";
  assert.throws(() => completeCase(initialCitizen(profiles[0]), d));
});
test("moving validates address, keeps selection and produces local receipt", () => {
  const c = initialCitizen(profiles[0]);
  const d = freshDraft("move");
  d.step = 1;
  assert.equal(Object.keys(validateStep(d)).length, 3);
  Object.assign(d.data, {
    city: "Warszawa",
    street: "Jasna 8/12",
    postal: "00-013",
    date: "2026-12-01",
  });
  assert.deepEqual(validateStep(d), {});
  d.step = 3;
  d.data.consent = "true";
  const next = completeCase(c, d);
  assert.equal(next.address, "Warszawa, Jasna 8/12, 00-013");
  assert.equal(next.receipts.length, 1);
  assert.equal(next.access.length, 4);
  assert.equal(c.address, "Gdańsk, ul. Słoneczna 12/4");
  assert.equal(next.protected, false);
});
test("no empty wallet selection; PESEL and lost document are independent", () => {
  const d = freshDraft("wallet");
  Object.assign(d.data, { id: "false", cards: "false", license: "false" });
  assert.ok(validateStep(d).selection);
  Object.assign(d.data, {
    cards: "true",
    pesel: "false",
    report: "false",
    consent: "true",
  });
  d.step = 2;
  const next = completeCase(initialCitizen(profiles[0]), d);
  assert.equal(next.protected, false);
  assert.ok(next.receipts[0].followups.some((x) => x.includes("banku")));
});
test("wallet protection is only applied after deliberate confirmation", () => {
  const c = initialCitizen(profiles[0]),
    d = freshDraft("wallet");
  d.step = 2;
  assert.throws(() => completeCase(c, d));
  assert.equal(c.protected, false);
  d.data.consent = "true";
  assert.equal(completeCase(c, d).protected, true);
});
test("letter flow stores a draft, never claims delivery", () => {
  const d = freshDraft("letter");
  d.step = 3;
  d.data.consent = "true";
  const next = completeCase(initialCitizen(profiles[0]), d);
  assert.equal(next.receipts[0].data.response, d.data.response);
  assert.ok(next.access[0].who.includes("lokalnie"));
  assert.ok(
    next.receipts[0].followups.some((x) => x.includes("oficjalnym kanałem")),
  );
});
test("custom letter does not get a fabricated legal interpretation", () => {
  assert.equal(analyzeLetter(sampleLetter).sample, true);
  const custom = analyzeLetter(
    "To inny dokument z datą 20.12.2026 i inną sprawą administracyjną.",
  );
  assert.equal(custom.sample, false);
  assert.equal(custom.date, "20.12.2026");
  assert.match(custom.summary, /nie interpretuje/);
});
test("assistant routes Polish inflections into processes and discloses demo fallback", async () => {
  const a = new DemoAssistant(),
    context = { profileName: "Kacper", protected: false };
  for (const [input, kind] of [
    ["Przeprowadzam się do Warszawy", "move"],
    ["Zgubiłem portfel", "wallet"],
    ["Nie rozumiem pisma z urzędu", "letter"],
  ]) {
    assert.equal((await a.reply(input, context)).action, kind);
  }
  assert.match(
    (await a.reply("Jaka jest pogoda?", context)).text,
    /bez modelu AI/,
  );
});
test("personas have isolated data, drafts and conversations", () => {
  const a = initialCitizen(profiles[0]),
    b = initialCitizen(profiles[1]);
  a.drafts.move = freshDraft("move");
  a.messages.push({ role: "user", text: "Mój adres" });
  assert.deepEqual(b.drafts, {});
  assert.equal(b.messages.length, 0);
  assert.notEqual(a.access, b.access);
});
test("all process definitions expose a finite review stage", () => {
  for (const kind of ["move", "wallet", "letter"] as const) {
    assert.equal(caseMeta[kind].steps.at(-1), "Sprawdź i zatwierdź");
    assert.equal(freshDraft(kind).step, 0);
  }
});
test("assistant proposes an editable city instead of silently submitting a form", async () => {
  const result = await new DemoAssistant().reply(
    "Przeprowadzam się do Warszawy",
    { profileName: "Ewa", protected: false },
  );
  assert.deepEqual(result.suggestedData, { city: "Warszawa" });
  assert.match(result.text, /Możesz ją zmienić/);
});
