import { test, expect } from "@playwright/test";

test("the identity card shows all required fields and browser back preserves document scroll", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByRole("navigation", { name: "Nawigacja główna" }).getByRole("button", { name: "Dokumenty", exact: true }).click();
  const scroll = page.getByTestId("document-scroll");
  const card = page.locator(".approved-document-list").getByRole("button", { name: /^mDowód/ });
  await card.scrollIntoViewIfNeeded();
  const top = await scroll.evaluate((el) => el.scrollTop);
  await card.click();
  const identity = page.getByRole("dialog").locator(".approved-identity");
  for (const field of ["Imię i nazwisko", "Data urodzenia", "Numer PESEL", "Numer dokumentu", "Ważność", "Obywatelstwo"]) {
    await expect(identity.getByText(field, { exact: true })).toBeVisible();
  }
  await expect(identity.getByRole("img", { name: "Fikcyjny portret: Ewa Wiśniewska" })).toBeVisible();
  await expect(identity.getByText("DEMO", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await scroll.evaluate((el) => el.scrollTop)).toBe(top);
});

test("the document catalog persists each persona's selection independently", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Nawigacja główna" }).getByRole("button", { name: "Dokumenty", exact: true }).click();
  const rows = page.locator(".approved-document-list");
  const driving = rows.getByRole("button", { name: /^mPrawo jazdy/ });
  await page.getByRole("button", { name: "Zarządzaj" }).click();
  const catalog = page.getByRole("dialog", { name: "Katalog dokumentów" });
  await catalog.getByRole("button", { name: "mPrawo jazdy" }).click();
  await catalog.getByRole("button", { name: "Gotowe" }).click();
  await expect(driving).toHaveCount(0);
  const profile = page.getByRole("button", { name: "Profil i ustawienia" });
  await profile.click();
  await page.getByRole("button", { name: /^Kacper / }).click();
  await expect(driving).toHaveCount(1);
  await profile.click();
  await page.getByRole("button", { name: /^Ewa / }).click();
  await expect(driving).toHaveCount(0);
});
