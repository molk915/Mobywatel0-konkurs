import { expect, test, type Page } from "@playwright/test";

const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });

test("a case starts a separate chat automatically and payment works inside the conversation", async ({ page }) => {
  await page.goto("/");
  await button(page, "Profil i ustawienia").click();
  await button(page, /^Kacper Zieliński/).click();
  await button(page, "Sprawy").click();
  await button(page, /Mandat drogowy.*300,00 zł/).click();
  await button(page, /^Zapytaj asystenta/).click();
  const questions = page.locator(".chat-message.user");
  await expect(questions).toHaveText("Czy muszę opłacić ten mandat?");
  await button(page, "Opłać mandat w czacie").click();
  const form = page.getByRole("region", { name: "Formularz sprawy w czacie" });
  await form.getByRole("button", { name: "Opłać mandat", exact: true }).click();
  await form.getByRole("radio", { name: "BLIK" }).check();
  await form.getByRole("button", { name: "Sprawdź podsumowanie" }).click();
  await form.getByRole("button", { name: "Potwierdź płatność demo" }).click();
  await expect(form.getByRole("link", { name: "Pobierz potwierdzenie" })).toBeVisible();
  await form.getByRole("button", { name: "Rozpocznij inną rozmowę" }).click();
  await expect(questions).toHaveCount(0);
  await page.getByRole("textbox", { name: "Wiadomość do asystenta" }).fill("Przeprowadzam się do Lublina");
  await button(page, "Wyślij wiadomość").click();
  await button(page, "Zgłoś zameldowanie").click();
  await expect(form.getByLabel("Miejscowość")).toHaveValue("Lublin");
  await button(page, "Rozmowy").click();
  await page.getByRole("region", { name: "Zapisane rozmowy" }).getByRole("button", { name: "Czy muszę opłacić ten mandat?" }).click();
  await expect(questions).toHaveText("Czy muszę opłacić ten mandat?");
  await page.reload();
  await expect(questions).toHaveText("Czy muszę opłacić ten mandat?");
  await button(page, "Pokaż potwierdzenie w czacie").click();
  await expect(form.getByRole("heading", { name: "Opłacony" })).toBeVisible();
});

test("a letter starts with its question, then the attachment triggers a follow-up automatically", async ({ page }) => {
  await page.goto("/?start=most");
  await button(page, "Zapytaj asystenta o pismo").click();
  await expect(page.locator(".chat-message.user")).toHaveText("Co jest w tym piśmie z urzędu?");
  await page.getByText("Wezwanie do uzupełnienia wniosku", { exact: true }).click();
  await expect(page.locator(".chat-letter-preview")).toContainText("Urząd Miasta Lublin");
  await button(page, "Przygotuj odpowiedź").click();
  const letter = page.getByRole("region", { name: "Odpowiedź na pismo w czacie" });
  await letter.getByLabel("Dodaj plik z urządzenia").setInputFiles({
    name: "Umowa w rozmowie.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 demo"),
  });
  await expect(page.locator(".chat-message.user").last()).toHaveText("Czy załącznik jest dodany i co mam teraz zrobić?");
  await expect(page.locator(".chat-message.assistant").last()).toContainText("Załącznik jest zapisany w sprawie.");
  await expect(letter.getByText("Umowa w rozmowie.pdf", { exact: true })).toBeVisible();
  await button(page, "Nowa rozmowa").click();
  await expect(page.locator(".chat-message.user")).toHaveCount(0);
});
