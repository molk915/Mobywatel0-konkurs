import { test, expect, type Page } from "@playwright/test";

const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });

async function selectProfile(page: Page, name: RegExp) {
  await page.goto("/");
  await button(page, "Profil i ustawienia").click();
  await button(page, name).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("Kacper opens the real demo mandate through chat, retries and restores the receipt", async ({ page }) => {
  await selectProfile(page, /^Kacper Zieliński/);
  await button(page, "Sprawy").click();
  await expect(button(page, /Mandat drogowy.*300,00 zł/)).toBeVisible();
  await button(page, /Zapytaj o swoje sprawy/).click();
  await button(page, "Mam jakiś mandat do zapłacenia?").click();
  const reminder = page.getByText(/Termin płatności: \d{1,2}\.\d{1,2}\.\d{4}/);
  await expect(reminder).toBeVisible();
  const dueDate = (await reminder.innerText()).match(/Termin płatności: (\d{1,2}\.\d{1,2}\.\d{4})/)?.[1];
  await button(page, /^Otwórz mandat/).click();
  await expect(page.getByText(dueDate!, { exact: true })).toBeVisible();
  await button(page, "Opłać mandat").click();
  await page.getByRole("radio", { name: "Płatność testowo odrzucona" }).check();
  await button(page, "Sprawdź podsumowanie").click();
  await button(page, "Potwierdź płatność").click();
  await expect(page.getByRole("alert")).toContainText("została odrzucona");
  await page.getByRole("radio", { name: "BLIK" }).check();
  await button(page, "Sprawdź podsumowanie").click();
  await expect(page.getByRole("heading", { name: "Sprawdź podsumowanie" })).toBeVisible();
  await expect(page.getByText("Tryb demonstracyjny", { exact: true })).toBeInViewport();
  await button(page, "Potwierdź płatność").click();
  await expect(page.getByRole("heading", { name: "Opłacony" })).toBeVisible();
  const receipt = page.getByRole("link", { name: "Pobierz potwierdzenie" });
  const download = await receipt.getAttribute("download");
  expect(download).toMatch(/^DEMO-/);
  await expect(receipt).toHaveAttribute("download", download!);
  await button(page, "Wróć do spraw").click();
  await page.getByRole("tab", { name: "Zakończone" }).click();
  await expect(button(page, /Mandat drogowy.*Opłacony/)).toBeVisible();
});

test("moving opens two forms, reuses the address and stores separate results", async ({ page }) => {
  await page.goto("/");
  await button(page, "Sprawy").click();
  await expect(button(page, /Podatek od nieruchomości.*Opłać/)).toBeVisible();
  await button(page, "Nowa sytuacja życiowa").click();
  await button(page, /^Przeprowadzam się/).click();
  await button(page, /^Zgłoś zameldowanie/).click();
  await expect(page.getByLabel("Wnioskodawca")).not.toHaveValue("");
  await page.getByLabel("Ulica i numer").fill("Jasna 8/12");
  await page.getByLabel("Kod pocztowy").fill("00-013");
  await page.getByLabel("Miejscowość").fill("Warszawa");
  await page.getByLabel("Dokument potwierdzający prawo do lokalu").selectOption("lease");
  await button(page, "Sprawdź podsumowanie").click();
  await expect(page.getByRole("heading", { name: "Sprawdź podsumowanie" })).toBeVisible();
  await expect(page.getByText("Jasna 8/12, 00-013 Warszawa")).toBeVisible();
  await button(page, "Wyślij zgłoszenie").click();
  await expect(page.getByRole("heading", { name: "Zgłoszenie przyjęte · oczekuje na rozpatrzenie" })).toBeVisible();
  const first = await page.getByRole("link", { name: "Pobierz potwierdzenie" }).getAttribute("download");
  await button(page, "Wróć do spraw").click();
  await button(page, "Nowa sytuacja życiowa").click();
  await button(page, /^Przeprowadzam się/).click();
  await button(page, /^Zaktualizuj adres/).click();
  await expect(page.getByLabel("Ulica i numer")).toHaveValue("Jasna 8/12");
  await page.getByLabel("Właściwy urząd skarbowy").fill("Urząd Skarbowy Warszawa-Śródmieście");
  await button(page, "Sprawdź podsumowanie").click();
  await button(page, "Wyślij zgłoszenie").click();
  const second = page.getByRole("link", { name: "Pobierz potwierdzenie" });
  await expect(second).toHaveAttribute("download", /^DEMO-/);
  expect(await second.getAttribute("download")).not.toBe(first);
});

test("Ewa submits a file through the shared MOST letter and reopens its receipt", async ({ page }) => {
  await selectProfile(page, /^Ewa Wiśniewska/);
  await button(page, "Sprawy").click();
  await button(page, /Zapytaj o swoje sprawy/).click();
  await button(page, "Nie rozumiem pisma z urzędu").click();
  await button(page, /^Otwórz pismo i dokumenty/).click();
  await button(page, "Przygotuj odpowiedź samodzielnie").click();
  await expect(button(page, "Przekaż do zatwierdzenia")).toBeDisabled();
  await button(page, "Użyj przykładowego adresu").click();
  await button(page, "Zapisz formularz").click();
  await expect(page.getByText(/Zapisano adres/)).toBeVisible();
  await page.getByLabel("Dodaj plik z urządzenia").setInputFiles({
    name: "Umowa testowa.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 demo"),
  });
  await expect(page.getByText("Umowa testowa.pdf", { exact: true })).toBeVisible();
  await button(page, "Wstaw propozycję uzasadnienia").click();
  await button(page, "Zapisz uzasadnienie").click();
  await button(page, "Przekaż do zatwierdzenia").click();
  await expect(page.getByText("Umowa testowa.pdf", { exact: true })).toBeVisible();
  await button(page, "Zatwierdź pakiet").click();
  await button(page, "Wyślij odpowiedź").click();
  await expect(page.getByText("Zapisano potwierdzenie wysyłki.")).toBeVisible();
  const receipt = page.getByRole("link", { name: "Pobierz potwierdzenie" });
  const id = await receipt.getAttribute("download");
  expect(id).toMatch(/^DEMO-UP-/);
  await expect(receipt).toHaveAttribute("download", id!);
});

test("Kacper prepares Ewa's letter, corrects it, and Ewa sends the same package", async ({ page, browser }) => {
  await selectProfile(page, /^Ewa Wiśniewska/);
  await button(page, "Sprawy").click();
  await button(page, /Pismo z urzędu — wymaga Twojej uwagi/).click();
  await button(page, "Poproś o pomoc").click();
  await button(page, "Utwórz zaproszenie").click();
  const link = await page.getByRole("link", { name: "Otwórz zadanie Kacpra" }).getAttribute("href");
  await button(page, "Przejdź do współpracy").click();

  const independent = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
  try {
    const helper = await independent.newPage();
    await helper.goto(link!);
    await button(helper, "Użyj przykładowego adresu").click();
    await button(helper, "Zapisz formularz").click();
    await expect(helper.getByText(/Zapisano adres/)).toBeVisible();
    await button(helper, "Użyj przykładowej umowy").click();
    await button(helper, "Wstaw propozycję uzasadnienia").click();
    await button(helper, "Zapisz uzasadnienie").click();
    await button(helper, "Przekaż do zatwierdzenia").click();
    await expect(button(helper, "Wyślij odpowiedź")).toHaveCount(0);

    await button(page, "Sprawdź przygotowaną sprawę").click();
    await button(page, "Poproś o poprawki").click();
    await page.getByLabel("Co trzeba poprawić?").fill("Dopisz numer sprawy.");
    await button(page, "Przekaż uwagi").click();
    const reason = "Uzupełniam wezwanie LUB/DEMO/062. Kopia umowy jest w załączniku.";
    await expect(helper.getByText(/Dopisz numer sprawy\./)).toBeVisible();
    await helper.getByLabel("Uzasadnienie").fill(reason);
    await button(helper, "Zapisz uzasadnienie").click();
    await button(helper, "Przekaż do zatwierdzenia").click();

    await button(page, "Sprawdź przygotowaną sprawę").click();
    await expect(page.getByRole("definition").filter({ hasText: reason })).toBeVisible();
    await expect(page.getByText("Zmieniono", { exact: true })).toBeVisible();
    await button(page, "Zatwierdź pakiet").click();
    await button(page, "Wyślij odpowiedź").click();
    await expect(page.getByRole("link", { name: "Pobierz potwierdzenie" })).toBeVisible();
    await button(page, "Zakończ współpracę").click();
    await button(page, "Cofnij dostęp").click();
    await expect(helper.getByRole("heading", { name: "Dostęp do sprawy został zakończony" })).toBeVisible();
  } finally {
    await independent.close();
  }
});
