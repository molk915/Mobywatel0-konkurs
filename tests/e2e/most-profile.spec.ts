import { expect, test } from "@playwright/test";
import { previewOrigin } from "./urls";

test("Ewa delegates her fine and Kacper pays it after changing profiles in the same tab", async ({ page, context }) => {
  await page.goto(previewOrigin);
  const button = (name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });
  const select = async (name: RegExp) => {
    await button(/^Zmień profil demonstracyjny/).click();
    await button(name).click();
  };
  await button("Profil i ustawienia").click();
  await button(/^Ewa Wiśniewska/).click();
  await button("MOST").click();
  await expect(button("Moje")).toHaveAttribute("aria-pressed", "true");
  const ownerCases = page.getByRole("region", { name: "Moje sprawy w MOST" });
  const ownerFine = ownerCases.getByRole("listitem").filter({ hasText: "Mandat drogowy" });
  await expect(ownerFine).toContainText("Sprawa prywatna");
  await expect(ownerFine).toContainText("150,00 zł");
  await button("Przekaż sprawę Mandat drogowy").click();
  await button("Sprawdź podsumowanie").click();
  await button("Przejdź do potwierdzenia").click();
  await button("Potwierdź dostęp").click();
  await expect(ownerFine).toContainText("Kacper Zieliński");
  await expect(ownerCases.getByRole("listitem").filter({ hasText: "Podatek od nieruchomości" })).toContainText("Sprawa prywatna");
  await select(/^Kacper Zieliński/);
  await expect(button("Pomagam")).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  const shared = page.getByRole("region", { name: "Sprawy udostępnione w MOST" });
  await expect(shared.getByText("Mandat drogowy", { exact: true })).toBeVisible();
  await expect(shared.getByText("Podatek od nieruchomości", { exact: true })).toHaveCount(0);
  await button("Terminy").click();
  await expect(page.locator(".control-deadline").getByRole("heading", { name: "Mandat drogowy", exact: true })).toBeVisible();
  await expect(page.locator(".control-deadline").filter({ hasText: "Podatek od nieruchomości" })).toHaveCount(0);
  await button("Dostęp").click();
  await button("Otwórz w MOST Mandat drogowy").click();
  await expect(page.getByText("150,00 zł", { exact: true })).toBeVisible();
  await button("Opłać mandat").click();
  await page.getByRole("radio", { name: "BLIK" }).check();
  await button("Zapisz szkic").click();
  await button("Potwierdź płatność").click();
  await expect(page.getByText("Wykonane przez osobę zaufaną")).toBeVisible();
  await button("Wróć do spraw w MOST").click();
  await expect(shared.getByText("Zakończona", { exact: true })).toBeVisible();
  await select(/^Ewa Wiśniewska/);
  await expect(ownerFine.getByText("Zakończona", { exact: true })).toBeVisible();
  await button("Historia sprawy Mandat drogowy").click();
  const history = page.getByRole("region", { name: "Historia działań" });
  await expect(history.getByText("Opłacono w pokazie", { exact: true })).toBeVisible();
  await expect(history.getByText(/Kacper Zieliński/).first()).toBeVisible();
  expect(context.pages()).toHaveLength(1);
});

test("the contest link opens a readable MOST and recovers a failed initial connection", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  let binds = 0;
  await page.route("**/api/most/control", async (route) => {
    if (route.request().method() === "POST" && route.request().postDataJSON()?.type === "bind" && ++binds === 1) {
      await route.fulfill({ status: 503, json: { error: "Spróbuj ponownie." } });
    } else await route.continue();
  });
  await page.goto(previewOrigin + "/?start=most-hub");
  const cases = page.getByRole("region", { name: "Moje sprawy w MOST" });
  const fine = cases.getByRole("listitem").filter({ hasText: "Mandat drogowy" });
  await expect(fine.getByRole("button", { name: "Przekaż sprawę Mandat drogowy" })).toBeInViewport();
  expect(binds).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".most-hub")).not.toHaveText(/Spróbuj ponownie\./);
  const help = page.getByRole("button", { name: "Pomagam", exact: true });
  await help.click();
  await page.getByRole("button", { name: /^Zmień profil demonstracyjny/ }).click();
  await expect(page.getByRole("heading", { name: "Zmień profil w MOST" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});
