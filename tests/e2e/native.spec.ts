import { test, expect } from "@playwright/test";
test("larger text expands content without horizontal clipping", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Profil i ustawienia", exact: true })
    .click();
  await page
    .getByRole("switch", { name: "Większy tekst", exact: true })
    .click();
  await page.getByRole("button", { name: "Zamknij", exact: true }).click();
  await page.getByRole("navigation", { name: "Nawigacja główna" }).getByRole("button", { name: "Dokumenty", exact: true }).click();
  await page.locator(".approved-document-list").getByRole("button", { name: /^mDowód/ }).click();
  await expect(page.locator(".approved-identity-person strong")).toHaveCSS(
    "font-size",
    "27px",
  );
  await page.getByRole("button", { name: "Wstecz", exact: true }).click();
  await expect(page.getByRole("button", { name: "Dodaj", exact: true })).toBeInViewport();
  await page.getByRole("button", { name: "Sprawy", exact: true }).click();
  await expect(page.locator(".inbox-item small").first()).toHaveCSS(
    "font-size",
    "15px",
  );
  expect(
    await page
      .locator(".screen-content")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await page.screenshot({ path: "test-results/native-large-text.png" });
});
test("non-reduced motion supports keyboard activation and closing a document", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("navigation", { name: "Nawigacja główna" }).getByRole("button", { name: "Dokumenty", exact: true }).click();
  const documents = page.locator("#main-content .view-documents");
  await expect(documents).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/civic-tab-transition/);
  if (await page.evaluate(() => typeof document.startViewTransition === "function")) {
    await expect(documents).toHaveCSS("animation-name", "none");
  }
  const vehicle = page.locator(".approved-document-list").getByRole("button", { name: /^Moje pojazdy/ });
  await vehicle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText("Toyota Corolla");
  await expect(page.locator(".approved-detail-shell")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("small screens keep content inside the app and every fictional portrait loads", async ({
  page,
}) => {
  await page.goto("/");
  for (const name of ["Kacper", "Ewa", "Aleksandra"]) {
    await page
      .getByRole("button", { name: "Profil i ustawienia", exact: true })
      .click();
    await page.getByRole("button", { name: new RegExp(name + " .*") }).click();
    const portrait = page.locator(".civic-avatar img");
    await expect(portrait).toHaveAttribute("src", "/portraits/" + name.toLowerCase() + ".png");
    await expect(portrait).toHaveJSProperty(
      "complete",
      true,
    );
    expect(
      await portrait.evaluate((el: HTMLImageElement) => el.naturalWidth),
    ).toBeGreaterThan(100);
  }
  await page.setViewportSize({ width: 320, height: 740 });
  for (const tab of ["Dokumenty", "Sprawy", "Więcej"]) {
    await page.getByRole("navigation", { name: "Nawigacja główna" }).getByRole("button", { name: tab, exact: true }).click();
    const overflow = await page
      .locator(".screen-content")
      .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(overflow).toBe(false);
  }
});
