import { expect, test, type Page } from "@playwright/test";
import { previewOrigin } from "./urls";

const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });
const letter = "Wezwanie do uzupełnienia wniosku";
const ownerCases = (page: Page) => page.getByRole("region", { name: "Moje sprawy" });
const sharedCases = (page: Page) => page.getByRole("region", { name: "Udostępnione sprawy" });

async function switchProfile(page: Page, name: RegExp) {
  await button(page, "Zmień profil").click();
  await button(page, name).click();
}

async function grantAccess(page: Page, title: string, duration: string) {
  await button(page, "Sprawdź podsumowanie").click();
  const summary = page.locator(".control-grant-summary");
  await expect(summary).toContainText("Kacper Zieliński");
  await expect(summary).toContainText(title);
  await expect(summary).toContainText(duration);
  await button(page, "Przejdź do potwierdzenia").click();
  await button(page, "Potwierdź dostęp").click();
  await expect(page.getByText(/Kacper ma dostęp do sprawy/)).toBeVisible();
}

test("Ewa shares her fine and Kacper pays it after changing profiles in the same tab", async ({ page, context }) => {
  await page.goto(previewOrigin);
  await button(page, "Poproś o pomoc").click();
  await ownerCases(page).getByRole("button", { name: /^Mandat drogowy/ }).click();
  await expect(page.getByText("Sprawa prywatna", { exact: true })).toBeVisible();
  await button(page, "Poproś o pomoc").click();
  await grantAccess(page, "Mandat drogowy", "Przez czas połączenia");
  await switchProfile(page, /^Kacper Zieliński/);
  await expect(page.getByRole("heading", { name: "Sprawy · Kacper" })).toBeVisible();
  await expect(sharedCases(page).getByRole("heading", { name: "Mandat drogowy" })).toBeVisible();
  await expect(sharedCases(page).getByText("Podatek od nieruchomości", { exact: true })).toHaveCount(0);
  await button(page, "Terminy").click();
  await expect(page.locator(".control-deadline").getByRole("heading", { name: "Mandat drogowy", exact: true })).toBeVisible();
  await expect(page.locator(".control-deadline").filter({ hasText: "Podatek od nieruchomości" })).toHaveCount(0);
  await button(page, "Wstecz").click();
  await sharedCases(page).getByRole("button", { name: "Otwórz sprawę" }).click();
  await expect(page.getByText("150,00 zł", { exact: true })).toBeVisible();
  await button(page, "Opłać mandat").click();
  await page.getByRole("radio", { name: "BLIK" }).check();
  await button(page, "Zapisz szkic").click();
  await button(page, "Potwierdź płatność").click();
  await expect(page.getByText("Wykonane przez osobę zaufaną")).toBeVisible();
  await button(page, "Wróć do wspólnych spraw").click();
  await expect(sharedCases(page).getByText("Zakończona", { exact: true })).toBeVisible();
  await switchProfile(page, /^Ewa Wiśniewska/);
  await page.locator(".most-dashboard-more summary").click();
  await ownerCases(page).getByRole("button", { name: /^Mandat drogowy.*Zakończona/ }).click();
  await button(page, "Historia sprawy").click();
  const history = page.getByRole("region", { name: "Historia działań" });
  await expect(history.getByText("Opłacono w pokazie", { exact: true })).toBeVisible();
  await expect(history.getByText(/Kacper Zieliński/).first()).toBeVisible();
  expect(context.pages()).toHaveLength(1);
});

test("the contest link recovers an initial connection failure and supports keyboard and larger text at 320 px", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  let binds = 0;
  await page.route("**/api/most/control", async (route) => {
    if (route.request().method() === "POST" && route.request().postDataJSON()?.type === "bind" && ++binds === 1) {
      await route.fulfill({ status: 503, json: { error: "Spróbuj ponownie." } });
    } else await route.continue();
  });
  await page.goto(previewOrigin + "/?start=most-hub");
  const heading = page.getByRole("heading", { name: "Sprawy · Ewa" });
  await expect(heading).toBeVisible();
  await expect(button(page, "Poproś o pomoc")).toBeInViewport();
  expect(binds).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".most-hub")).not.toHaveText(/Spróbuj ponownie\./);
  await button(page, "Zmień profil").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Zmień profil" })).toBeVisible();
  await page.getByRole("switch", { name: /Większy tekst/ }).click();
  await page.keyboard.press("Escape");
  await expect(heading).toBeVisible();
  await expect(button(page, "Poproś o pomoc")).toHaveCSS("font-size", "18px");
  await button(page, "Poproś o pomoc").focus();
  expect(await button(page, "Poproś o pomoc").evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const overlapsHeader = await heading.evaluate((element) => {
    const header = document.querySelector(".most-dashboard-header")!;
    return element.getBoundingClientRect().top < header.getBoundingClientRect().bottom;
  });
  expect(overlapsHeader).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("ewa-320-wiekszy-tekst.png") });
  await button(page, "Pełna aplikacja").click();
  await expect(page.getByRole("heading", { name: "Dzień dobry, Ewo" })).toBeVisible();
});

test("from Start Ewa shares a letter, Kacper saves and returns to his list, and Ewa reviews the draft", async ({ page }, testInfo) => {
  await page.goto(previewOrigin);
  const shot = (name: string) => page.screenshot({ path: testInfo.outputPath(name + ".png"), animations: "disabled" });
  await expect(button(page, "Poproś o pomoc")).toBeInViewport();
  await shot("start-390");
  const services = page.getByRole("navigation", { name: "Najważniejsze usługi" });
  await services.getByRole("button", { name: /^Zdrowie/ }).click();
  await expect(page.getByRole("dialog", { name: "Zdrowie" })).toBeVisible();
  await page.keyboard.press("Escape");
  await services.getByRole("button", { name: /^Rodzina/ }).click();
  await button(page, /^Aleksandra Nowak/).click();
  await expect(page.getByRole("dialog", { name: "Rodzina", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await button(page, "Profil i ustawienia").click();
  await button(page, /^Ewa Wiśniewska/).click();
  await button(page, "Poproś o pomoc").click();
  await expect(ownerCases(page).getByRole("heading", { name: "Zgłoszenie pobytu stałego" })).toBeVisible();
  await shot("most-ewa-390");
  await ownerCases(page).getByRole("button", { name: new RegExp("^" + letter) }).click();
  await button(page, "Poproś o pomoc").click();
  await grantAccess(page, letter, "Do zakończenia sprawy");
  await button(page, /^Kto ma dostęp/).click();
  await expect(page.getByRole("region", { name: "Zakres upoważnień" })).toContainText(letter);
  await button(page, "Wstecz").click();

  const otherCases = ["Mandat drogowy", "Aktualizacja adresu w urzędzie skarbowym"];
  for (const [index, title] of otherCases.entries()) {
    if (index === 1) await page.locator(".most-dashboard-more summary").click();
    await ownerCases(page).getByRole("button", { name: new RegExp("^" + title) }).click();
    await button(page, "Poproś o pomoc").click();
    await grantAccess(page, title, "Przez czas połączenia");
  }
  await switchProfile(page, /^Kacper Zieliński/);
  await expect(sharedCases(page).getByText("Ewa prosi Cię o pomoc", { exact: true })).toBeVisible();
  await expect(sharedCases(page).getByText(/Termin odpowiedzi/)).toBeInViewport();
  await expect(sharedCases(page).getByText("Podatek od nieruchomości", { exact: true })).toHaveCount(0);
  await shot("most-kacper-390");
  await page.setViewportSize({ width: 430, height: 932 });
  await expect(button(page, "Przygotuj odpowiedź")).toBeInViewport();
  await expect(page.getByRole("navigation", { name: "Nawigacja główna" })).toBeInViewport({ ratio: 1 });
  await shot("most-kacper-430");

  await button(page, "Przygotuj odpowiedź").click();
  const reason = page.getByLabel("Uzasadnienie", { exact: true });
  const text = "Dołączam kopię umowy najmu i proszę o przyjęcie uzupełnienia wniosku.";
  await reason.fill(text);
  await button(page, "Zapisz szkic").click();
  await expect(page.getByText("Szkic zapisany.", { exact: true })).toBeInViewport();
  await button(page, "Wstecz").click();
  await expect(button(page, "Wróć do szkicu")).toBeVisible();
  const other = sharedCases(page).getByRole("button", { name: /^Aktualizacja adresu w urzędzie skarbowym/ });
  await other.click();
  await expect(page.getByRole("heading", { name: "Aktualizacja adresu w urzędzie skarbowym", exact: true, level: 1 })).toBeVisible();
  await page.goBack();
  await expect(other).toBeVisible();
  await button(page, "Wróć do szkicu").click();
  await expect(reason).toHaveValue(text);
  await expect(reason).toHaveValue(text);
  await button(page, "Przekaż do zatwierdzenia").click();
  await expect(page.getByText("Przekazano Ewie do zatwierdzenia.", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Sprawy · Kacper" })).toBeVisible();
  await expect(other).toBeVisible();
  await switchProfile(page, /^Ewa Wiśniewska/);
  await page.setViewportSize({ width: 1440, height: 980 });
  await expect(page.locator(".phone-shell")).toBeInViewport({ ratio: 1 });
  await expect(button(page, "Sprawdź szkic")).toBeInViewport();
  await shot("most-ewa-desktop");
  await button(page, "Sprawdź szkic").click();
  await expect(page.getByText(text, { exact: true })).toBeVisible();
  await button(page, "Sprawdź wykonane czynności").click();
  await expect(page.getByText(/Kacper przygotował sprawę do zatwierdzenia/)).toBeVisible();
});
