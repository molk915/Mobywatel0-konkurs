import { test, expect } from "@playwright/test";
test("notifications dismiss via Escape and open the actual letter flow", async ({ page }) => {
  await page.goto("/");
  const notifications = page.getByRole("button", { name: "Powiadomienia", exact: true });
  await notifications.click();
  const inbox = page.getByRole("dialog", { name: "Powiadomienia" });
  await expect(inbox.getByRole("heading", { name: "Powiadomienia" })).toBeFocused();
  await inbox.getByRole("button", { name: /^Nowe / }).click();
  await expect(inbox.getByRole("button", { name: /^Nowe / })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(notifications).toBeFocused();
  await notifications.click();
  await page.getByRole("dialog", { name: "Powiadomienia" }).getByRole("button", { name: /Przykładowe pismo z urzędu/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Zrozum pismo");
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("the assistant on a document uses its context and prepares the right share action", async ({ page }) => {
  await page.goto("/");
  await page.locator(".approved-document-list").getByRole("button", { name: /^mPrawo jazdy/ }).click();
  const document = page.getByRole("dialog");
  await expect(document.getByRole("navigation").getByRole("button")).toHaveCount(4);
  await document.getByRole("button", { name: /Asystent/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Kontekst: mPrawo jazdy");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog").getByRole("heading", { name: "mPrawo jazdy" })).toBeVisible();
  await document.getByRole("button", { name: /Asystent/ }).click();
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
  await page.getByRole("button", { name: "Dane", exact: true }).click();
  await page
    .getByRole("button", { name: "Imię i nazwisko", exact: true })
    .click();
  await expect(page.locator(".privacy-preview")).toContainText(
    "Aleksandra Nowak",
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
