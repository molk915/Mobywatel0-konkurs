import { expect, test, type FrameLocator } from "@playwright/test";
import { previewOrigin } from "./urls";

const btn = (phone: FrameLocator, name: string | RegExp) =>
  phone.getByRole("button", { name, exact: typeof name === "string" });

async function confirmAccess(phone: FrameLocator) {
  await btn(phone, "Sprawdź podsumowanie").click();
  await btn(phone, "Przejdź do potwierdzenia").click();
  await btn(phone, "Potwierdź dostęp w demo").click();
}

test("two-phone dashboard keeps a draft, hands it to Ewa, and shows only Kacper's assigned cases", async ({ page }, testInfo) => {
  test.setTimeout(110_000);
  await page.setViewportSize({ width: 1220, height: 930 });
  await page.goto(previewOrigin + "/?pokaz=most3");
  const ewa = page.frameLocator('iframe[title="Telefon Ewy"]');
  const kacper = page.frameLocator('iframe[title="Telefon Kacpra"]');
  const mainNav = (phone: FrameLocator) => phone.getByRole("navigation", { name: "Nawigacja główna" });
  const openMost = (phone: FrameLocator) => mainNav(phone).getByRole("button", { name: "MOST", exact: true }).click();
  await expect(ewa.getByRole("heading", { name: "Sprawy", exact: true })).toBeVisible();
  await expect(kacper.getByText("Mandat drogowy", { exact: true })).toBeVisible();
  await mainNav(kacper).getByRole("button", { name: "Dokumenty", exact: true }).click();
  const helperDocuments = kacper.getByRole("heading", { name: "Dokumenty", exact: true });
  await expect(helperDocuments).toBeVisible();
  await openMost(ewa);
  await btn(ewa, "Przygotuj zaproszenie").click();
  await btn(ewa, "Wyślij zaproszenie do Kacpra").click();
  await expect(helperDocuments).toBeVisible();
  await btn(kacper, "Odbierz zaproszenie od Ewy w MOST").click();
  await btn(kacper, "Przyjmij zaproszenie").click();
  const ownerPhone = await page.locator('iframe[title="Telefon Ewy"]').boundingBox();
  const helperPhone = await page.locator('iframe[title="Telefon Kacpra"]').boundingBox();
  expect(ownerPhone!.x + ownerPhone!.width).toBeLessThan(helperPhone!.x);
  const ownCases = ewa.getByRole("region", { name: "Moje sprawy w MOST" });
  const sharedCases = kacper.getByRole("region", { name: "Sprawy udostępnione w MOST" });
  await expect(ownCases.getByText("Podatek od nieruchomości", { exact: true })).toBeVisible();
  await expect(ownCases.getByText("Zgłoszenie pobytu stałego", { exact: true })).toBeVisible();
  await btn(ewa, /^Przekaż sprawę Wezwanie/).click();
  await confirmAccess(ewa);
  await expect(sharedCases.getByText("Wezwanie do uzupełnienia wniosku", { exact: true })).toBeVisible();
  await expect(sharedCases.getByText("Podatek od nieruchomości", { exact: true })).toHaveCount(0);
  await mainNav(kacper).getByRole("button", { name: "Usługi", exact: true }).click();
  await expect(kacper.getByRole("heading", { name: "Usługi", exact: true })).toBeVisible();
  await expect(ownCases).toBeVisible();
  await openMost(kacper);
  await expect(sharedCases.getByText("Wezwanie do uzupełnienia wniosku", { exact: true })).toBeVisible();
  await btn(kacper, "Moje sprawy").click();
  const personal = kacper.getByRole("region", { name: "Moje sprawy Kacpra" });
  await expect(personal.getByText("Mandat drogowy", { exact: true })).toBeVisible();
  await expect(personal.getByText("Wezwanie do uzupełnienia wniosku", { exact: true })).toHaveCount(0);
  await personal.getByRole("button", { name: /Mandat drogowy/ }).click();
  await expect(btn(kacper, "Opłać mandat")).toBeVisible();
  await btn(kacper, "Wstecz").click();
  await btn(kacper, "Sprawy Ewy").click();

  await page.setViewportSize({ width: 700, height: 930 });
  for (const phone of [ewa, kacper]) {
    const tabs = phone.getByRole("navigation", { name: "Centrum kontroli" });
    await expect(tabs.getByRole("button")).toHaveCount(4);
    expect(await tabs.getByRole("button").evaluateAll((buttons) =>
      buttons.every((button) => button.scrollWidth <= button.clientWidth &&
        [...button.querySelectorAll("span")].every((part) =>
          part.getBoundingClientRect().right <= button.getBoundingClientRect().right + 1)),
    )).toBe(true);
  }
  await page.setViewportSize({ width: 1220, height: 930 });

  await btn(kacper, /^Otwórz w MOST Wezwanie/).click();
  await kacper.getByLabel("Uzasadnienie", { exact: true }).fill("Szkic odpowiedzi");
  await btn(kacper, "Zapisz szkic").click();
  await expect(kacper.getByText(/Szkic zapisany/)).toBeVisible();
  await btn(kacper, "Wstecz").click();
  await expect(sharedCases.getByText("Szkic", { exact: true })).toBeVisible();
  await page.reload();
  await openMost(ewa);
  await expect(btn(kacper, "MOST")).toBeVisible();
  await openMost(kacper);
  await expect(sharedCases.getByText("Szkic", { exact: true })).toBeVisible();
  await btn(kacper, /^Otwórz w MOST Wezwanie/).click();
  await expect(kacper.getByLabel("Uzasadnienie", { exact: true })).toHaveValue("Szkic odpowiedzi");
  await kacper.getByLabel("Uzasadnienie", { exact: true }).fill("W imieniu Ewy składam odpowiedź na wezwanie w sprawie mieszkania.");
  await btn(kacper, "Przekaż do zatwierdzenia").click();
  await expect(kacper.getByText("Przekazano Ewie do zatwierdzenia.")).toBeVisible();
  await expect(ownCases.getByText("Do zatwierdzenia", { exact: true })).toBeVisible();

  await btn(ewa, /^Sprawdź szkic Wezwanie/).click();
  await expect(ewa.getByText(/W imieniu Ewy składam odpowiedź/)).toBeVisible();
  await btn(ewa, "Uzupełnij pakiet").click();
  await btn(ewa, "Wstaw adres demo").click();
  await btn(ewa, "Zapisz formularz").click();
  await btn(ewa, "Dołącz kopię demonstracyjną").click();
  await btn(ewa, "Przekaż do zatwierdzenia").click();
  await btn(ewa, "Zatwierdź pakiet").click();
  await btn(ewa, "Wyślij odpowiedź (demo)").click();
  await expect(ewa.getByText("Odpowiedź przyjęta przez system demonstracyjny.")).toBeVisible();
  await btn(ewa, "Wstecz").click();
  await btn(kacper, "Wstecz").click();
  await expect(sharedCases.getByText("Zakończona", { exact: true })).toBeVisible();

  await btn(ewa, /^Przekaż sprawę Aktualizacja adresu/).click();
  await confirmAccess(ewa);
  await expect(sharedCases.getByText("Aktualizacja adresu w urzędzie skarbowym", { exact: true })).toBeVisible();
  await expect(sharedCases.getByText("Podatek od nieruchomości", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("dwa-telefony-most.png") });

  await btn(ewa, "Udziel dostępu").click();
  await ewa.getByRole("combobox", { name: "Zasób", exact: true }).selectOption("vehicle");
  await btn(ewa, "Dalej").click();
  await ewa.getByLabel("Monitorowanie terminów").check();
  await confirmAccess(ewa);
  await btn(kacper, "Terminy").click();
  await expect(kacper.getByRole("heading", { name: "Badanie techniczne pojazdu" })).toBeVisible();
  await expect(kacper.getByRole("heading", { name: "Paszport" })).toHaveCount(0);
  await btn(ewa, /^Historia sprawy Wezwanie/).click();
  const activity = ewa.getByRole("region", { name: "Historia działań" });
  await expect(activity.getByText("Otwarto sprawę w panelu Pomagam").first()).toBeVisible();
  await expect(activity.getByText("Przekazano do zatwierdzenia", { exact: true })).toBeVisible();
  await expect(activity.getByText("Wysłano odpowiedź w pokazie", { exact: true })).toBeVisible();
  await expect(activity.getByText(/Kacper Zieliński/).first()).toBeVisible();
});
