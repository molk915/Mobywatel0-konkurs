import { expect, test, type FrameLocator } from "@playwright/test";
import { previewOrigin } from "./urls";

test.use({ serviceWorkers: "block" });

const btn = (phone: FrameLocator, name: string | RegExp) =>
  phone.getByRole("button", { name, exact: typeof name === "string" });

test("the QR screen opens Kacper inline and he submits Ewa's residence registration", async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto(previewOrigin + "/?start=most-hub");
  const b = (name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });
  const title = "Zgłoszenie pobytu stałego";
  const url = page.url();
  await expect(page.locator(".most-priority").getByRole("heading", { name: title })).toBeVisible();
  await b(/^Kto ma dostęp/).click();
  await b("Utwórz zaproszenie QR").click();
  await expect(page.getByRole("img", { name: /Kod QR zaproszenia/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Otwórz zaproszenie w nowej karcie/ })).toHaveCount(0);
  await b("Pokaż na dwóch telefonach").click();
  const kacper = page.frameLocator('iframe[title="Telefon Kacpra"]');
  await btn(kacper, "Przyjmij zaproszenie").click();
  await b("Udostępnij zgłoszenie pobytu stałego").click();
  await b("Sprawdź podsumowanie").click();
  await expect(page.locator(".control-grant-summary")).toContainText("Wysłanie w pokazie");
  await b("Przejdź do potwierdzenia").click();
  await b("Potwierdź dostęp").click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await btn(kacper, "Przygotuj zgłoszenie").click();
  await kacper.getByLabel("Ulica i numer").fill("Jasna 8/12");
  await kacper.getByLabel("Kod pocztowy").fill("00-013");
  await kacper.getByLabel("Miejscowość").fill("Warszawa");
  await kacper.getByLabel("Dokument potwierdzający prawo do lokalu").selectOption("lease");
  await btn(kacper, "Zapisz szkic").click();
  await expect(kacper.getByText("Jasna 8/12, 00-013 Warszawa")).toBeVisible();
  await btn(kacper, "Wyślij zgłoszenie").click();
  await expect(kacper.getByText("Wykonane przez osobę zaufaną")).toBeVisible();
  await expect(page.getByRole("region", { name: "Szczegóły sprawy" })).toContainText("Zakończona");
  await page.screenshot({ path: testInfo.outputPath("most-pobyt-dwa-telefony.png"), animations: "disabled" });
  expect(context.pages()).toHaveLength(1);
  await expect(page).toHaveURL(url);
});

test("inline demo animates on the same page and both phones receive the mandate result", async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(previewOrigin + "/?start=most-hub");
  const b = (name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });
  const url = page.url();
  const shells = page.locator(".simulator-stage .phone-shell");
  const dimensions = (node: Element) => {
    const { width, height } = node.getBoundingClientRect();
    return { width, height };
  };
  await expect(page.locator(".most-priority")).toBeVisible();
  const original = await shells.evaluate(dimensions);
  const pageWidth = await page.evaluate(() => document.documentElement.clientWidth);
  await b(/^Pokaż współpracę na dwóch telefonach/).click();
  const helperPhone = page.getByRole("region", { name: "Telefon Kacpra" });
  await expect(helperPhone).toHaveCSS("animation-name", "most-phone-split");
  await expect(helperPhone.getByText(/Udostępniona sprawa pojawi się tutaj/)).toBeVisible();
  await b(/^Mandat drogowy/).click();
  await b("Poproś o pomoc").click();
  for (const name of ["Sprawdź podsumowanie", "Przejdź do potwierdzenia", "Potwierdź dostęp"]) await b(name).click();
  const kacper = page.frameLocator('iframe[title="Telefon Kacpra"]');
  await expect(kacper.getByRole("heading", { name: "Mandat drogowy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mandat drogowy" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(pageWidth);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(700);
  for (const shell of await shells.evaluateAll((nodes) => nodes.map((node) => {
    const { width, height } = node.getBoundingClientRect();
    return { width, height };
  }))) {
    expect(shell.width).toBeCloseTo(original.width, 0);
    expect(shell.height).toBeCloseTo(original.height, 0);
  }
  await expect(page.locator(".most-hub-dashboard .most-scroll")).toHaveCSS("scrollbar-width", "none");
  await expect(kacper.locator(".most-scroll")).toHaveCSS("scrollbar-width", "none");
  const shared = kacper.getByRole("region", { name: "Udostępnione sprawy" });
  await expect(shared.getByText("Podatek od nieruchomości", { exact: true })).toHaveCount(0);
  const frames = await page.locator(".simulator-stage .phone-shell").evaluateAll((nodes) => nodes.map((node) => ({
    width: node.clientWidth, height: node.clientHeight, radius: getComputedStyle(node).borderRadius,
  })));
  expect(frames).toHaveLength(2);
  expect(frames[0]).toEqual(frames[1]);
  await btn(kacper, "Otwórz sprawę").click();
  await btn(kacper, "Opłać mandat").click();
  await kacper.getByRole("radio", { name: "BLIK" }).check();
  await btn(kacper, "Zapisz szkic").click();
  await btn(kacper, "Potwierdź płatność").click();
  await expect(kacper.getByText("Wykonane przez osobę zaufaną")).toBeVisible();
  await b("Historia sprawy").click();
  await expect(page.getByRole("region", { name: "Historia działań" }).getByText("Opłacono w pokazie", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("most-telefony-w-aplikacji.png"), animations: "disabled" });
  expect(context.pages()).toHaveLength(1);
  await expect(page).toHaveURL(url);
  await b("Zakończ pokaz dwóch telefonów").click();
  await expect(helperPhone).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Historia", exact: true })).toBeVisible();
});

async function confirmAccess(phone: FrameLocator) {
  await btn(phone, "Sprawdź podsumowanie").click();
  await btn(phone, "Przejdź do potwierdzenia").click();
  await btn(phone, "Potwierdź dostęp").click();
}

test("two-phone dashboard keeps a draft, hands it to Ewa, and shows only Kacper's assigned cases", async ({ page }, testInfo) => {
  test.setTimeout(110_000);
  await page.setViewportSize({ width: 1220, height: 930 });
  await page.goto(previewOrigin + "/?pokaz=most3");
  const ewa = page.frameLocator('iframe[title="Telefon Ewy"]');
  const kacper = page.frameLocator('iframe[title="Telefon Kacpra"]');
  const mainNav = (phone: FrameLocator) => phone.getByRole("navigation", { name: "Nawigacja główna" });
  const openMost = (phone: FrameLocator) => mainNav(phone).getByRole("button", { name: "Pomoc", exact: true }).click();
  await expect(ewa.getByRole("heading", { name: "Sprawy", exact: true })).toBeVisible();
  await expect(kacper.getByText("Mandat drogowy", { exact: true })).toBeVisible();
  await mainNav(kacper).getByRole("button", { name: "Dokumenty", exact: true }).click();
  const helperDocuments = kacper.getByRole("heading", { name: "Dokumenty", exact: true });
  await expect(helperDocuments).toBeVisible();
  await openMost(ewa);
  await btn(ewa, "Przygotuj zaproszenie").click();
  await btn(ewa, "Wyślij zaproszenie do Kacpra").click();
  await expect(helperDocuments).toBeVisible();
  await btn(kacper, "Odbierz zaproszenie od Ewy").click();
  await btn(kacper, "Przyjmij zaproszenie").click();
  const ownerPhone = await page.locator('iframe[title="Telefon Ewy"]').boundingBox();
  const helperPhone = await page.locator('iframe[title="Telefon Kacpra"]').boundingBox();
  expect(ownerPhone!.x + ownerPhone!.width).toBeLessThan(helperPhone!.x);
  const ownCases = ewa.getByRole("region", { name: "Moje sprawy" });
  const sharedCases = kacper.getByRole("region", { name: "Udostępnione sprawy" });
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

  await btn(kacper, /^Otwórz sprawę Wezwanie/).click();
  await kacper.getByLabel("Uzasadnienie", { exact: true }).fill("Szkic odpowiedzi");
  await btn(kacper, "Zapisz szkic").click();
  await expect(kacper.getByText(/Szkic zapisany/)).toBeVisible();
  await btn(kacper, "Wstecz").click();
  await expect(sharedCases.getByText("Szkic", { exact: true })).toBeVisible();
  await page.reload();
  await openMost(ewa);
  await expect(btn(kacper, "Pomoc")).toBeVisible();
  await openMost(kacper);
  await expect(sharedCases.getByText("Szkic", { exact: true })).toBeVisible();
  await btn(kacper, /^Otwórz sprawę Wezwanie/).click();
  await expect(kacper.getByLabel("Uzasadnienie", { exact: true })).toHaveValue("Szkic odpowiedzi");
  await kacper.getByLabel("Uzasadnienie", { exact: true }).fill("W imieniu Ewy składam odpowiedź na wezwanie w sprawie mieszkania.");
  await btn(kacper, "Przekaż do zatwierdzenia").click();
  await expect(kacper.getByText("Przekazano Ewie do zatwierdzenia.")).toBeVisible();
  await expect(ownCases.getByText("Do zatwierdzenia", { exact: true })).toBeVisible();

  await btn(ewa, /^Sprawdź szkic Wezwanie/).click();
  await expect(ewa.getByText(/W imieniu Ewy składam odpowiedź/)).toBeVisible();
  await btn(ewa, "Uzupełnij pakiet").click();
  await btn(ewa, "Użyj przykładowego adresu").click();
  await btn(ewa, "Zapisz formularz").click();
  await btn(ewa, "Użyj przykładowej umowy").click();
  await btn(ewa, "Przekaż do zatwierdzenia").click();
  await btn(ewa, "Zatwierdź pakiet").click();
  await btn(ewa, "Wyślij odpowiedź").click();
  await expect(ewa.getByText("Zapisano potwierdzenie wysyłki.")).toBeVisible();
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
