import { expect, test, type Page } from "@playwright/test";
import { previewOrigin } from "./urls";

test.use({ serviceWorkers: "block" });

const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });
const mainNav = (page: Page) => page.getByRole("navigation", { name: "Nawigacja główna" });
const historySection = (page: Page) => page.getByRole("region", { name: "Historia operacji" });
const accessTabs = (page: Page) => page.getByRole("group", { name: "Widok Moich danych" });
const ageExample = (page: Page) => historySection(page).getByRole("button", { name: /Żabka/ });
const openFilters = (page: Page) => button(page, /^Filtruj/).click();

async function openMyData(page: Page) {
  await page.getByRole("navigation", { name: "Najważniejsze usługi" })
    .getByRole("button", { name: /^Moje dane/ }).click();
}

async function confirmAccess(page: Page) {
  for (const name of ["Sprawdź podsumowanie", "Przejdź do potwierdzenia", "Potwierdź dostęp"]) {
    await button(page, name).click();
  }
}

test("history filters, exact disclosure and saved follow-up fit smaller and larger phones", async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date("2026-11-26T12:00:00+01:00"));
  await page.goto(previewOrigin);
  await openMyData(page);
  await expect(page.getByRole("region", { name: "Ostatnie 30 dni" })).toHaveText(/8\s*Zapisane operacje\s*7\s*Podmioty i osoby/);
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole("heading", { name: "Moje dane", exact: true })).toBeVisible();
    const sizes = await page.locator(".data-tracker").evaluate((element) => ({
      width: element.clientWidth, content: element.scrollWidth,
    }));
    expect(sizes.content).toBe(sizes.width);
    await expect(historySection(page).getByText("Dane demonstracyjne i działania w prototypie")).toBeVisible();
    await expect(page.getByLabel("Rodzaj operacji")).toHaveCount(0);
    const viewport = page.locator("#main-content");
    await viewport.evaluate((element) => { element.scrollTop = 450; });
    await expect.poll(async () => Math.abs((await accessTabs(page).boundingBox())!.y - (await viewport.boundingBox())!.y)).toBeLessThan(3);
    expect((await mainNav(page).boundingBox())!.y).toBeLessThan(844);
    await accessTabs(page).getByRole("button", { name: "Uprawnienia", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Kto ma dostęp do spraw" })).toBeInViewport();
    await accessTabs(page).getByRole("button", { name: "Historia dostępu", exact: true }).click();
    await openFilters(page);
    const sheet = page.getByRole("dialog", { name: "Filtruj historię" });
    await expect(sheet).toBeVisible();
    expect((await sheet.boundingBox())!.width).toBeLessThanOrEqual(width);
    if (width === 390) await page.screenshot({ path: testInfo.outputPath("moje-dane-filtry-390.png"), animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    if (width === 390) await page.screenshot({ path: testInfo.outputPath("moje-dane-historia-390.png"), animations: "disabled" });
    await openFilters(page);
    await page.getByLabel("Podmiot").selectOption("Żabka");
    await button(page, "Pokaż wyniki").click();
    await ageExample(page).click();
    await expect(page.getByText("Zakres danych", { exact: true })).toBeInViewport();
    await button(page, "Zamknij").click();
    await button(page, "Wyczyść filtry").click();
    await mainNav(page).getByRole("button", { name: "Start", exact: true }).click();
    await openMyData(page);
  }
  await expect(historySection(page).getByRole("heading", { name: "24 listopada 2026" })).toBeVisible();
  await openFilters(page);
  await page.getByLabel("Rodzaj operacji").selectOption("pesel");
  await button(page, "Pokaż wyniki").click();
  await expect(historySection(page).getByRole("button", { name: /Bank/ })).toHaveCount(1);
  await expect(ageExample(page)).toHaveCount(0);
  await button(page, "Wyczyść filtry").click();
  await openFilters(page);
  await page.getByLabel("Podmiot").selectOption("Żabka");
  await page.getByLabel("Data operacji").fill("23.11.2026");
  await button(page, "Pokaż wyniki").click();
  await expect(ageExample(page)).toHaveCount(0);
  await openFilters(page);
  await page.getByLabel("Data operacji").fill("24.11.2026");
  await button(page, "Pokaż wyniki").click();
  await ageExample(page).click();
  await expect(page.getByText(/Wyłącznie potwierdzenie ukończenia 18 lat/)).toBeVisible();
  await expect(page.getByText(/24 listopada 2026,? 16:23:00/)).toBeVisible();
  await expect(page.getByText("Źródło informacji")).toBeVisible();
  await expect(page.getByText("Podstawa dostępu")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("moje-dane-szczegoly-390.png"), animations: "disabled" });
  await button(page, "Poproś o wyjaśnienie").click();
  await button(page, "Zapisz prośbę").click();
  await button(page, "Zgłoś podejrzenie nieprawidłowości").click();
  await button(page, "Zapisz zgłoszenie").click();
  await expect(page.getByText("Prośba o wyjaśnienie zapisana w pokazie.")).toBeVisible();
  await expect(page.getByText("Zgłoszenie zapisane w pokazie.")).toBeVisible();
});

test("Ewa shares a case and an operation, withdraws both, and keeps Kacper's access history", async ({ page }, testInfo) => {
  test.setTimeout(100_000);
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto(previewOrigin + "/?start=most-hub");
  await button(page, /^Kto ma dostęp/).click();
  await button(page, "Utwórz zaproszenie QR").click();
  await button(page, "Pokaż na dwóch telefonach").click();
  const kacper = page.frameLocator('iframe[title="Telefon Kacpra"]');
  await kacper.getByRole("button", { name: "Przyjmij zaproszenie" }).click();
  await button(page, "Udostępnij zgłoszenie pobytu stałego").click();
  await confirmAccess(page);
  await mainNav(page).getByRole("button", { name: "Start", exact: true }).click();
  await openMyData(page);
  await ageExample(page).click();
  await button(page, "Poproś o pomoc").click();
  await button(page, "Udostępnij opis operacji").click();
  await confirmAccess(page);
  await kacper.getByRole("button", { name: /Opisy operacji na danych/ }).click();
  await kacper.getByRole("button", { name: "Otwórz opis operacji" }).click();
  await expect(kacper.getByText(/Wyłącznie potwierdzenie ukończenia 18 lat/)).toBeVisible();
  await button(page, "Wstecz").click();
  await button(page, "Zamknij").click();
  await expect(historySection(page).getByRole("button", { name: /Kacper Zieliński.*Otwarto opis operacji na danych/ })).toBeVisible();
  await button(page, "Powiadomienia").click();
  await expect(page.getByRole("dialog", { name: "Powiadomienia" }).getByText(/Użyto udzielonego dostępu · Operacja na danych/)).toBeVisible();
  await button(page, "Zamknij").click();
  await accessTabs(page).getByRole("button", { name: "Uprawnienia", exact: true }).click();
  const person = page.getByRole("region", { name: "Dostęp osoby Kacper Zieliński" });
  await person.locator(".tracker-profile").click();
  const registration = person.getByRole("article").filter({ hasText: "Zgłoszenie pobytu stałego" });
  await expect(person.getByText("Zgłoszenie pobytu stałego", { exact: true })).toBeVisible();
  await expect(person.getByText("Operacja na danych · Żabka · przykład", { exact: true })).toBeVisible();
  await expect(person.locator(".tracker-expiry").filter({ hasText: "Ostatnie użycie" }).locator("time")).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("moje-dane-most-dwa-telefony.png"), animations: "disabled" });
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await registration.getByRole("button", { name: /^Cofnij dostęp do/ }).click();
    const review = page.getByRole("dialog", { name: "Cofnij dostęp", exact: true });
    await expect(review).toBeInViewport();
    await review.getByRole("button", { name: "Anuluj" }).click();
    await expect(registration).toBeVisible();
  }
  await page.setViewportSize({ width: 1280, height: 960 });
  const originalExpiry = await registration.locator("time").first().getAttribute("datetime");
  await registration.getByRole("button", { name: "Zmień zakres i termin" }).click();
  await page.getByLabel("Czas dostępu").selectOption("period");
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await page.getByLabel("Ostatni dzień dostępu").fill(tomorrow);
  await confirmAccess(page);
  await button(page, "Wstecz").click();
  await expect(registration.locator("time").first()).not.toHaveAttribute("datetime", originalExpiry!);
  await button(page, "Cofnij cały dostęp tej osoby").click();
  await button(page, "Anuluj").click();
  await expect(registration).toBeVisible();
  await button(page, "Cofnij cały dostęp tej osoby").click();
  await button(page, "Potwierdź cofnięcie wszystkich").click();
  await expect(page.getByText(/Cofnięto wszystkie uprawnienia/)).toBeVisible();
  await expect(kacper.getByRole("button", { name: "Otwórz opis operacji" })).toHaveCount(0);
  await expect(kacper.getByText(/Wyłącznie potwierdzenie ukończenia 18 lat/)).toHaveCount(0);
  await expect(kacper.getByRole("heading", { name: "Zgłoszenie pobytu stałego", exact: true })).toHaveCount(0);
  await accessTabs(page).getByRole("button", { name: "Historia dostępu", exact: true }).click();
  await expect(historySection(page).getByRole("button", { name: /Kacper Zieliński.*Otwarto opis operacji na danych/ })).toBeVisible();
});
