import test from "node:test";
import assert from "node:assert/strict";
import { restoreNavigation, searchDocuments } from "../src/navigation.ts";
import { initialCitizen, profiles, freshDraft } from "../src/domain.ts";
import type { Store } from "../src/storage.ts";
const store = (): Store => ({
  version: 1,
  profile: profiles[0].id,
  citizens: Object.fromEntries(profiles.map((p) => [p.id, initialCitizen(p)])),
  largeText: false,
});
test("refresh restores an existing draft but cannot open a nonexistent case", () => {
  const s = store();
  s.citizens[s.profile].drafts.move = { ...freshDraft("move"), step: 2 };
  const value = {
    prototype: true,
    profile: s.profile,
    tab: "cases",
    layer: { type: "flow", kind: "move" },
  };
  assert.equal(restoreNavigation(value, s).layer?.type, "moving");
  assert.equal(
    restoreNavigation({ ...value, layer: { type: "flow", kind: "wallet" } }, s)
      .layer,
    null,
  );
});
test("navigation cannot disclose another profile receipt", () => {
  const s = store();
  assert.deepEqual(
    restoreNavigation(
      {
        prototype: true,
        profile: "kacper",
        tab: "privacy",
        layer: { type: "receipt", receipt: { id: "other" } },
      },
      s,
    ),
    { tab: "home", layer: null },
  );
});
test("document share returns to the selected document", () => {
  const s = store();
  assert.deepEqual(
    restoreNavigation(
      {
        prototype: true,
        profile: s.profile,
        tab: "documents",
        layer: { type: "share", id: 1, returnTo: 1 },
      },
      s,
    ).layer,
    { type: "share", id: 1, returnTo: 1 },
  );
});
test("document search handles accents, multiple words and no results", () => {
  assert.deepEqual(searchDocuments("prawo jazdy", "Karta EKUZ"), [1]);
  assert.deepEqual(searchDocuments("dowod", "Karta EKUZ"), [0]);
  assert.deepEqual(searchDocuments("auto", "Karta EKUZ"), [2]);
  assert.deepEqual(searchDocuments("nieznany", "Karta EKUZ"), []);
  assert.deepEqual(searchDocuments("", "Karta EKUZ"), [0, 1, 2, 3]);
});
