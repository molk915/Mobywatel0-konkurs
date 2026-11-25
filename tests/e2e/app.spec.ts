import { test, expect, type Page } from "@playwright/test";
import { previewOrigin } from "./urls";
const dialog = (page: Page) => page.getByRole("dialog");
test("the document list opens all four documents and sharing returns to the document", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dokumenty", exact: true })).toBeVisible();
  const rows = page.locator(".approved-document-list");
  for (const name of ["mDowód", "mPrawo jazdy", "Moje pojazdy", "Karta Dużej Rodziny"]) {
    await rows.getByRole("button", { name: new RegExp("^" + name) }).click();
    await expect(dialog(page)).toContainText(name);
    await page.getByRole("button", { name: "Wstecz", exact: true }).click();
    await expect(dialog(page)).toHaveCount(0);
  }
  await rows.getByRole("button", { name: /^mPrawo jazdy/ }).click();
  await dialog(page).getByRole("button", { name: "Udostępnij", exact: true }).click();
  await expect(dialog(page)).toContainText("Uprawnienie kategorii B");
  await page.getByRole("button", { name: "Zamknij", exact: true }).click();
  await expect(dialog(page)).toContainText("mPrawo jazdy");
  await page.getByRole("button", { name: "Wstecz", exact: true }).click();
  await expect(rows.getByRole("button")).toHaveCount(4);
  expect(errors).toEqual([]);
});
test("privacy consent is explicit and revocable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Dane", exact: true }).click();
  await page
    .getByRole("button", { name: "Udostępnij wybrane dane", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Utwórz kod demonstracyjny", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("potwierdź zakres");
  await page
    .getByRole("checkbox", {
      name: "Zgadzam się na ten zakres w pokazie",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Utwórz kod demonstracyjny", exact: true })
    .click();
  await expect(dialog(page)).toContainText("Mam ukończone 18 lat");
  await page.screenshot({ path: "test-results/v2-share.png" });
  await page
    .getByRole("button", { name: "Zakończ i wycofaj zgodę", exact: true })
    .click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator(".access-timeline")).toContainText(
    "Zgoda wycofana",
  );
});
test("desktop frame, small phone and full opacity transitions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1040 });
  await page.goto("/");
  await expect(page.locator(".phone")).toHaveCSS("width", "390px");
  await expect(page.locator(".presentation")).toHaveAttribute("data-surface", "simulator");
  await expect(page.locator(".phone-shell")).toBeInViewport({ ratio: 1 });
  const mainRect = await page.locator(".bottom-nav").boundingBox();
  const actionRect = await page.getByRole("button", { name: "Dodaj", exact: true }).boundingBox();
  expect(actionRect!.y + actionRect!.height).toBeLessThanOrEqual(mainRect!.y);
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.locator(".phone")).toHaveCSS("width", "320px");
  await expect(page.locator(".phone")).toHaveCSS("height", "740px");
  await expect(page.locator(".presentation-header")).toBeHidden();
  await expect(page.locator(".dynamic-island")).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Sprawy", exact: true }).click();
  await expect(page.locator(".view")).toHaveCSS("opacity", "1");
  await expect(page.locator(".view")).toHaveCSS("animation-duration", "0.23s");
});
test("production PWA reloads offline and restores the selected case", async ({
  page,
  context,
}) => {
  await page.goto(previewOrigin + "/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await page.getByRole("button", { name: "Sprawy", exact: true }).click();
  await page.getByRole("button", { name: /Nowa sytuacja życiowa/ }).click();
  await page.getByRole("button", { name: /^Przeprowadzam się/ }).click();
  await page.getByRole("button", { name: /^Zgłoś zameldowanie/ }).click();
  await context.setOffline(true);
  await page.reload();
  await expect(dialog(page)).toHaveAttribute("aria-label", "Zgłoszenie pobytu stałego");
  await expect(dialog(page)).toContainText("Sprawy online są niedostępne.");
  await context.setOffline(false);
});
