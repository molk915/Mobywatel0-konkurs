import { test, expect } from "@playwright/test";
test("notifications dismiss via Escape and open the actual letter flow", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Profil i ustawienia" }).click();
  await page.getByRole("button", { name: /^Ewa Wiśniewska/ }).click();
  const notifications = page.getByRole("button", { name: "Powiadomienia", exact: true });
  await notifications.click();
  const inbox = page.getByRole("dialog", { name: "Powiadomienia" });
  await expect(inbox.getByRole("heading", { name: "Powiadomienia" })).toBeFocused();
  const filter = inbox.getByRole("button", { name: /^Nowe \d+$/ });
  await filter.click();
  await expect(filter).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(notifications).toBeFocused();
  await notifications.click();
  await page.getByRole("dialog", { name: "Powiadomienia" }).getByRole("button", { name: /Masz nowe pismo z urzędu/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Wezwanie do uzupełnienia wniosku");
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("the assistant on a document uses its context and prepares the right share action", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Nawigacja główna" }).getByRole("button", { name: "Dokumenty", exact: true }).click();
  await page.locator(".approved-document-list").getByRole("button", { name: /^mPrawo jazdy/ }).click();
  const document = page.getByRole("dialog");
  await expect(document.getByRole("navigation").getByRole("button")).toHaveCount(4);
  await document.getByRole("button", { name: /Asystent/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Kontekst: mPrawo jazdy");
  await expect(page.locator(".chat-message.user")).toHaveText("Pokaż ten dokument");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog").getByRole("heading", { name: "mPrawo jazdy" })).toBeVisible();
  await document.getByRole("button", { name: /Asystent/ }).click();
  await expect(page.locator(".chat-message.user")).toHaveCount(1);
  await page.getByRole("button", { name: "Udostępnij ten dokument", exact: true }).click();
  await page
    .getByRole("button", { name: /mPrawo jazdy Wybierz minimalny zakres/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Uprawnienie kategorii B",
  );
  await page.getByRole("dialog").getByRole("button", { name: "Zamknij" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "mPrawo jazdy" })).toBeVisible();
});
test("privacy selection is reflected in actual consent and its revocable audit entry", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Więcej", exact: true }).click();
  await page.getByRole("button", { name: /^Moje dane Sprawdź/ }).click();
  await page
    .getByRole("button", { name: "Imię i nazwisko", exact: true })
    .click();
  await expect(page.locator(".privacy-preview")).toContainText(
    "Ewa Wiśniewska",
  );
  await page.screenshot({ path: "test-results/experience-data.png" });
  await page
    .getByRole("button", { name: "Udostępnij wybrane dane", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: /^Imię i nazwisko/ }),
  ).toBeChecked();
  await page
    .getByRole("checkbox", {
      name: "Zgadzam się na ten zakres w pokazie",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Utwórz kod demonstracyjny", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Biblioteka miejska");
  await page
    .getByRole("button", { name: "Zakończ i wycofaj zgodę", exact: true })
    .click();
  await expect(page.locator(".access-timeline")).toContainText(
    "Zgoda wycofana",
  );
});

test("an expired share is distinguished from a withdrawn consent", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Więcej", exact: true }).click();
  await page.getByRole("button", { name: /^Moje dane Sprawdź/ }).click();
  await page.getByRole("button", { name: "Udostępnij wybrane dane" }).click();
  await page.getByRole("checkbox", { name: "Zgadzam się na ten zakres w pokazie" }).check();
  await page.getByRole("button", { name: "Utwórz kod demonstracyjny" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Zamknij", exact: true }).click();
  await page.clock.fastForward(61_000);
  const expired = page.locator(".access-timeline").getByRole("button", { name: /Dostęp wygasł/ });
  await expect(expired).toBeVisible();
  await expired.click();
  await expect(page.getByRole("dialog")).toContainText("Dostęp wygasł");
  await expect(page.getByRole("button", { name: "Wycofaj zgodę", exact: true })).toHaveCount(0);
});

test("an unsupported question offers a direct route to a supported process", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Więcej", exact: true }).click();
  await page.getByRole("button", { name: /^Otwórz asystenta/ }).click();
  const input = page.getByRole("textbox", { name: "Wiadomość do asystenta" });
  await input.fill("Jaka będzie pogoda?");
  await input.press("Enter");
  const choices = page.getByRole("group", { name: "Możliwe dalsze pytania" });
  await choices.getByRole("button", { name: "Przeprowadzam się do Warszawy" }).click();
  await expect(page.getByRole("button", { name: /^Załatw formalności po przeprowadzce/ })).toBeVisible();
});
