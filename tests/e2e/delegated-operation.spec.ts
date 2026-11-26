import { expect, test, type Page } from "@playwright/test";

const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });

test("a paired trusted person pays only Kacper's assigned mandate and Kacper gets the same receipt", async ({ page, browser }) => {
  await page.goto("/");
  await button(page, "Profil i ustawienia").click();
  await button(page, /^Kacper Zieliński/).click();
  await button(page, "Więcej").click();
  await button(page, /^Moje dane Sprawdź/).click();
  await page.getByRole("group", { name: "Widok Moich danych" }).getByRole("button", { name: "MOST", exact: true }).click();
  await button(page, /^Osoba zaufana/).click();
  await button(page, "Przygotuj zaproszenie").click();
  await button(page, "Utwórz zaproszenie QR").click();
  const invitation = await page.getByRole("link", { name: "Otwórz zaproszenie w nowej karcie" }).getAttribute("href");
  const trustedContext = await browser.newContext();
  try {
    const trusted = await trustedContext.newPage();
    await trusted.goto(invitation!);
    await button(trusted, "Przyjmij zaproszenie").click();
    await expect(page.getByText(/Osoba zaufana jest połączona/)).toBeVisible();
    await button(page, "Wstecz").click();
    await button(page, "Sprawy").click();
    await expect(button(page, /^Wymiana prawa jazdy/)).toHaveCount(0);
    await expect(button(page, /Zbliża się badanie pojazdu/)).toHaveCount(0);
    await button(page, /Mandat drogowy.*300,00 zł/).click();
    await page.getByText("Przekaż przez ePełnomocnictwo", { exact: true }).click();
    await button(page, "Upoważnij osobę zaufaną").click();

    const assignment = trusted.getByRole("link", { name: "Mandat drogowy" });
    await expect(assignment).toBeVisible();
    const directUrl = new URL((await assignment.getAttribute("href"))!, trusted.url()).href;
    await assignment.click();
    const worker = trusted;
    await button(worker, "Opłać mandat").click();
    await worker.getByRole("radio", { name: "BLIK" }).check();
    await button(worker, "Sprawdź podsumowanie").click();
    await button(worker, "Potwierdź płatność").click();
    const helperReceipt = worker.getByRole("link", { name: "Pobierz potwierdzenie" });
    await expect(helperReceipt).toHaveAttribute("download", /^DEMO-/);
    await expect(page.getByText("Wykonane przez osobę zaufaną")).toBeVisible();
    await expect(page.getByRole("link", { name: "Pobierz potwierdzenie" })).toHaveAttribute("download", (await helperReceipt.getAttribute("download"))!);
    await button(worker, "Wróć do spraw w MOST").click();
    await expect(assignment).toBeVisible();
    await worker.goto(directUrl);
    await button(worker, "Wróć do spraw w MOST").click();
    await expect(assignment).toBeVisible();
    await worker.goto(new URL("/", directUrl).href);
    await button(worker, "Sprawy").click();
    await button(worker, "Pomagam").click();
    await button(worker, /^Otwórz panel pomocy MOST/).click();
    await expect(assignment).toBeVisible();
    await assignment.click();
    await button(page, "Cofnij ePełnomocnictwo").click();
    await expect(worker.getByText("Dostęp do sprawy został zakończony.")).toBeVisible();
    await button(worker, "Wstecz").click();
    await expect(assignment).toHaveCount(0);
  } finally {
    await trustedContext.close();
  }
});
