import { test, expect, type Locator, type Page } from "@playwright/test";
import { previewOrigin as production } from "./urls";
const ownerDialog = (page: Page) => page.getByRole("dialog", { name: "mObywatel MOST" });
const shot = (page: Page, name: string) => page.screenshot({ path: test.info().outputPath("delegation-" + name + ".png"), animations: "disabled" });
type View = Page | Locator | ReturnType<Page["frameLocator"]>;
const button = (view: View, name: string | RegExp) => view.getByRole("button", { name, exact: typeof name === "string" });

async function selectEwa(page: Page) {
  await page.goto(production);
  await button(page, "Profil i ustawienia").click();
  await button(page, /^Ewa Wiśniewska/).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function prepare(view: View) {
  await button(view, "Użyj przykładowego adresu").click();
  await button(view, "Zapisz formularz").click();
  await expect(view.getByText(/Zapisano adres/)).toBeVisible();
  await button(view, "Wstaw propozycję uzasadnienia").click();
  await button(view, "Zapisz uzasadnienie").click();
  await expect(view.getByText("Uzasadnienie zapisane.")).toBeVisible();
}

test("the public entry opens Ewa's case and the real invitation opens a separate role", async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(production + "/?start=most");
  const owner = ownerDialog(page);
  await expect(owner.getByRole("heading", { name: "Bliska osoba może pomóc" })).toBeVisible();
  await expect(owner.getByText("LUB/DEMO/062")).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  await shot(page, "contest-entry");
  await button(owner, "Poproś o pomoc").click();
  await button(owner, "Utwórz zaproszenie").click();
  const open = owner.getByRole("link", { name: "Otwórz zadanie Kacpra" });
  await expect(open).toBeVisible();
  await expect(owner.getByRole("textbox", { name: "Link zaproszenia" })).toHaveCount(0);
  await shot(page, "contest-handoff");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { value: undefined }));
  await button(owner, "Kopiuj link").click();
  await expect(owner.getByRole("textbox", { name: "Link zaproszenia" })).toBeFocused();
  const [helper] = await Promise.all([context.waitForEvent("page"), open.click()]);
  try {
    await helper.setViewportSize({ width: 390, height: 844 });
    await expect(helper.getByText("Pomagasz Ewie")).toBeVisible();
    await expect(helper.getByText("LUB/DEMO/062")).toHaveCount(0);
    await button(owner, "Przejdź do współpracy").click();
    await prepare(helper);
    await button(helper, "Użyj przykładowej umowy").click();
    await button(helper, "Przekaż do zatwierdzenia").click();
    await page.reload();
    await button(owner, "Sprawdź przygotowaną sprawę").click();
    await expect(owner.getByText("ul. Lipowa 12/4, 20-020 Lublin")).toBeVisible();
    await shot(page, "contest-review");
    await button(owner, "Sprawdź wykonane czynności").click();
    await expect(owner.getByRole("heading", { name: "Historia współpracy" })).toBeVisible();
    await page.reload();
    await expect(owner.getByRole("heading", { name: "Historia współpracy" })).toBeVisible();
    await button(owner, "Wstecz").click();
    await button(owner, "Zatwierdź pakiet").click();
    await expect(helper.getByRole("dialog", { name: "Pismo Ewy z urzędu" }).getByText("Pakiet zatwierdzony", { exact: true })).toBeVisible();
    await expect(owner.getByText("Pakiet zatwierdzony", { exact: true }).first()).toBeVisible();
    await button(helper.getByRole("navigation"), "Sprawy").click();
    await expect(helper.getByRole("tab", { name: /Zakończone/ })).toHaveAttribute("aria-selected", "true");
    await expect(button(helper, /Pismo Ewy z urzędu.*Pakiet zatwierdzony/)).toBeVisible();
  } finally {
    await helper.close();
  }
});

test("Ewa routes from inbox, Kacper prepares a package in an independent session, then Ewa approves it", async ({ page, browser, request }) => {
  test.setTimeout(75_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await selectEwa(page);
  await expect(page.locator(".base .notification-count")).toHaveText("5");
  await button(page, "Powiadomienia").click();
  await button(page.getByRole("dialog"), /Masz nowe pismo z urzędu/).click();
  const owner = ownerDialog(page);
  await expect(owner.getByText("LUB/DEMO/062")).toBeVisible();
  await button(owner, "Wyjaśnij pismo").click();
  await expect(owner.getByText("Wyjaśnienie demonstracyjne")).toBeVisible();
  await button(owner, "Zobacz potrzebne dokumenty").click();
  await expect(owner.getByRole("heading", { name: "Wymagany dokument" })).toBeVisible();
  await button(owner, "Wstecz").click();
  await button(owner, "Powiadomienia").click();
  await expect(page.getByRole("dialog", { name: "Powiadomienia" }).getByRole("button", { name: /Masz nowe pismo.*Przeczytane/ })).toBeVisible();
  await button(page.getByRole("dialog", { name: "Powiadomienia" }), /Masz nowe pismo/).click();
  await button(owner, "Poproś o pomoc").click();
  await expect(owner.getByRole("checkbox", { name: "Dołączanie dokumentu" })).toBeChecked();
  await button(owner, "Utwórz zaproszenie").click();
  await expect(owner.getByRole("img", { name: "Kod QR zaproszenia dla Kacpra" })).toBeVisible();
  const link = (await owner.getByRole("link", { name: "Otwórz zadanie Kacpra" }).getAttribute("href"))!;
  await button(owner, "Przejdź do współpracy").click();
  const separate = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
  try {
    const helper = await separate.newPage();
    await helper.goto(link);
    const task = helper.getByRole("dialog", { name: "Pismo Ewy z urzędu" });
    await button(task.getByRole("navigation"), "Sprawy").click();
    await expect(task).toHaveCount(0);
    await button(helper, /Pismo Ewy z urzędu/).click();
    await button(task, "Powiadomienia").click();
    await button(helper.getByRole("dialog", { name: "Powiadomienia" }), /Ewa poprosiła Cię o pomoc/).click();
    await button(helper, /Udostępnione pismo/).click();
    await expect(helper.getByText("Urząd Miasta Lublin")).toBeVisible();
    await expect(helper.getByText("00000000000")).toHaveCount(0);
    await expect(helper.getByText("LUB/DEMO/062")).toHaveCount(0);
    await button(task, "Wstecz").click();
    await expect(button(helper, "Przekaż do zatwierdzenia")).toBeDisabled();
    await prepare(helper);
    await button(helper, "Poproś Ewę o dokument").click();
    await expect(owner.getByRole("status").filter({ hasText: "Potrzebny dokument od Ewy" })).toBeVisible();
    await button(owner, "Powiadomienia").click();
    await shot(page, "inbox");
    await button(page.getByRole("dialog", { name: "Powiadomienia" }), /Kacper potrzebuje dokumentu/).click();
    await button(owner, "Udostępnij kopię umowy Kacprowi").click();
    await helper.reload();
    await expect(helper.getByText(/Zapisano adres/)).toBeVisible();
    await expect(helper.getByText("Uzasadnienie zapisane.")).toBeVisible();
    await button(helper, "Dołącz dokument Ewy").click();
    await expect(button(helper, "Przekaż do zatwierdzenia")).toBeInViewport({ ratio: 1 });
    await shot(helper, "tasks-375");
    await button(helper, "Przekaż do zatwierdzenia").click();
    await page.reload();
    await button(owner, "Powiadomienia").click();
    await button(page.getByRole("dialog", { name: "Powiadomienia" }), /Kacper przygotował sprawę do zatwierdzenia/).click();
    await expect(owner.getByRole("heading", { name: "Sprawdź przygotowaną sprawę" })).toBeVisible();
    await expect(owner.getByText("ul. Lipowa 12/4, 20-020 Lublin")).toBeVisible();
    await expect(owner.getByRole("link", { name: /Umowa najmu z dokumentów Ewy/ })).toBeVisible();
    await button(owner, "Poproś o poprawki").click();
    await owner.getByRole("textbox", { name: "Co trzeba poprawić?" }).fill("Dopisz, że adres został sprawdzony.");
    await button(owner, "Przekaż uwagi").click();
    await expect(task.getByText("Dopisz, że adres został sprawdzony.", { exact: false })).toBeVisible();
    const reason = task.getByRole("textbox", { name: "Uzasadnienie" });
    await reason.fill((await reason.inputValue()) + " Adres został sprawdzony.");
    await button(task, "Zapisz uzasadnienie").click();
    await button(task, "Przekaż do zatwierdzenia").click();
    await button(owner, "Sprawdź przygotowaną sprawę").click();
    await expect(owner.getByRole("heading", { name: "Pakiet po poprawkach" })).toBeVisible();
    await expect(owner.getByText(/^Poprzednio:/)).toHaveCount(1);
    await expect(owner.getByText(/^Poprzednio:/)).toBeVisible();
    await shot(page, "review-390");
    await button(owner, "Zatwierdź pakiet").click();
    await expect(task.getByText("Pakiet zatwierdzony", { exact: true })).toBeVisible();
    await button(task, "Powiadomienia").click();
    await expect(button(helper.getByRole("dialog", { name: "Powiadomienia" }), /Ewa zatwierdziła pakiet dokumentów/)).toBeVisible();
    await button(helper.getByRole("dialog", { name: "Powiadomienia" }), /Ewa zatwierdziła pakiet dokumentów/).click();
    await button(owner, "Wyślij odpowiedź").click();
    await expect(owner.getByText("Zapisano potwierdzenie wysyłki.")).toBeVisible();
    await expect(task.getByText("Wysłano odpowiedź w pokazie.", { exact: true })).toBeVisible();
    await button(owner, "Zakończ współpracę").click();
    await button(owner, "Cofnij dostęp").click();
    await expect(helper.getByRole("heading", { name: "Dostęp do sprawy został zakończony" })).toBeVisible();
    const headers = { Authorization: "Bearer " + new URL(link).hash.split("=")[1] };
    expect((await request.get(production + "/api/most/case", { headers })).status()).toBe(410);
    expect((await request.post(production + "/api/most/case", { headers, data: { type: "review" } })).status()).toBe(410);
    await button(owner, "Historia współpracy").click();
    await expect(owner.getByText("Dołączono dokument")).toBeVisible();
    await expect(owner.getByText("Ewa zatwierdziła pakiet dokumentów")).toBeVisible();
    await shot(page, "history");
  } finally {
    await separate.close();
  }
});

test("desktop phones synchronize a completed checklist, reject and reset", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(production + "/?pokaz=most");
  await expect(page.locator("iframe")).toHaveCount(0);
  await button(page, "Otwórz sprawę Ewy").click();
  const owner = page.frameLocator('iframe[title="Telefon Ewy"]');
  const helper = page.frameLocator('iframe[title="Telefon Kacpra"]');
  await button(owner, "Poproś o pomoc").click();
  await button(owner, "Utwórz zaproszenie").click();
  await expect(helper.getByText("Pomagasz Ewie")).toBeVisible();
  await prepare(helper);
  await button(helper, "Użyj przykładowej umowy").click();
  await button(helper, "Przekaż do zatwierdzenia").click();
  await button(owner, "Sprawdź przygotowaną sprawę").click();
  await shot(page, "desktop");
  await button(owner, "Odrzuć pakiet").click();
  await button(owner, "Potwierdź odrzucenie").click();
  await expect(helper.getByText("Projekt odrzucony", { exact: true })).toBeVisible();
  await button(page, "Zacznij od nowa").click();
  await expect(helper.getByRole("heading", { name: "Czekasz na zaproszenie" })).toBeVisible();
});

test("the shared-cases entry changes persona only after explicit selection", async ({ page }) => {
  await page.goto(production);
  await button(page, "Sprawy").click();
  await button(page, "Pomagam").click();
  await button(page, "Profil i ustawienia").click();
  await button(page.getByRole("dialog"), "Zamknij").click();
  await expect(page.locator(".civic-avatar")).toHaveAttribute("title", "Aleksandra Nowak");
  await button(page, "Profil i ustawienia").click();
  await button(page, /^Ewa Wiśniewska/).click();
  await expect(button(page, /Pismo z urzędu — wymaga Twojej uwagi/)).toBeVisible();
  await expect(button(page, /Urząd prosi o dokument/)).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".civic-avatar")).toHaveAttribute("title", "Ewa Wiśniewska");
  const otherTab = await page.context().newPage();
  try {
    await otherTab.goto(production);
    await button(otherTab, "Profil i ustawienia").click();
    await button(otherTab.getByRole("dialog"), /^Kacper Zieliński/).click();
    await expect(otherTab.locator(".civic-avatar")).toHaveAttribute("title", "Kacper Zieliński");
    await page.reload();
    await expect(page.locator(".civic-avatar")).toHaveAttribute("title", "Ewa Wiśniewska");
  } finally { await otherTab.close(); }
});

test("320-pixel case preserves navigation, scope and browser back", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await selectEwa(page);
  await button(page, "Sprawy").click();
  await button(page, /Pismo z urzędu — wymaga Twojej uwagi/).click();
  const owner = ownerDialog(page);
  await expect(button(owner, "Poproś o pomoc")).toBeInViewport({ ratio: 1 });
  await button(owner, "Poproś o pomoc").click();
  await owner.getByRole("checkbox", { name: "Treść tego pisma" }).uncheck();
  await expect(owner.getByRole("checkbox", { name: "Numer pisma" })).toBeDisabled();
  await expect(button(owner, "Utwórz zaproszenie")).toBeInViewport({ ratio: 1 });
  await expect(button(owner, "Powiadomienia")).toBeInViewport({ ratio: 1 });
  await expect(page.locator(".toast")).toHaveCount(0);
  await shot(page, "scope-320");
  expect(await owner.locator(".most-scroll").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.goBack();
  await expect(owner.getByRole("heading", { name: "Pismo z urzędu" })).toBeVisible();
});
