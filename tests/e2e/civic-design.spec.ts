import { test, expect, type Locator, type Page } from "@playwright/test";

const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const shot = (page: Page, name: string, width: number) =>
  page.screenshot({ path: test.info().outputPath(`night-${name}-${width}.png`), animations: "disabled" });

async function checkNav(nav: Locator, selected: string, count = 5) {
  await expect(nav).toBeInViewport({ ratio: 1 });
  await expect(nav.getByRole("button")).toHaveCount(count);
  await expect(nav.getByRole("button", { name: selected, exact: true })).toHaveAttribute("aria-current", "page");
}

test("the Start shortcuts fit without scrolling at 320×568", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  const shortcuts = page.getByRole("navigation", { name: "Najważniejsze usługi" });
  for (const shortcut of await shortcuts.getByRole("button").all()) {
    await expect(shortcut).toBeInViewport({ ratio: 1 });
  }
  expect(await page.locator("#main-content").evaluate((main) => main.scrollHeight - main.clientHeight)).toBeLessThanOrEqual(1);
});

for (const [width, height] of [[320, 740], [390, 844], [430, 932]]) {
  test(`product design at ${width}×${height} keeps the navigation within the screen`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await expect(page).toHaveTitle("mObywatel Razem");
    const nav = page.getByRole("navigation", { name: "Nawigacja główna" });
    await checkNav(nav, "Start");
    await expect(nav.getByRole("button", { name: "Pomoc", exact: true })).toBeVisible();
    await expect(button(page, "Poproś o pomoc")).toBeInViewport({ ratio: 1 });
    const shortcuts = page.getByRole("navigation", { name: "Najważniejsze usługi" });
    await expect(shortcuts.getByRole("button")).toHaveCount(4);
    await expect(shortcuts.getByRole("button", { name: /^Rodzina/ })).toBeInViewport({ ratio: 1 });
    expect(await page.locator("#main-content").evaluate((main) => main.scrollHeight - main.clientHeight)).toBeLessThanOrEqual(1);
    const bottomGap = await shortcuts.evaluate((list) =>
      list.closest(".base")!.querySelector(".civic-app-nav")!.getBoundingClientRect().top - list.getBoundingClientRect().bottom,
    );
    expect(bottomGap).toBeGreaterThanOrEqual(0);
    expect(bottomGap).toBeLessThanOrEqual(24);
    if (width === 390) await shot(page, "start", width);
    const navRows = await nav.getByRole("button").evaluateAll((nodes) =>
      new Set(nodes.map((node) => Math.round(node.getBoundingClientRect().top))).size,
    );
    expect(navRows).toBe(1);
    await button(page, "Dokumenty").click();
    await checkNav(nav, "Dokumenty");
    await expect(button(page, "Dodaj")).toBeInViewport({ ratio: 1 });
    await page.locator(".approved-hero").click();
    const identity = page.getByRole("dialog");
    await expect(identity.getByRole("button", { name: "Udostępnij", exact: true })).toBeInViewport();
    await shot(page, "identity", width);
    await identity.getByRole("button", { name: "Wstecz", exact: true }).click();
    await button(page, "Sprawy").click();
    await checkNav(nav, "Sprawy");
    await expect(button(page, "Moje")).toHaveAttribute("aria-pressed", "true");
    await shot(page, "cases", width);
    await button(page, "Pomagam").click();
    await expect(button(page, "Pomagam")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("tabpanel", { name: "Do zrobienia" })
      .getByText("Brak przekazanych spraw na tym etapie.")).toBeVisible();
    if (width === 390) await shot(page, "shared", width);
    await button(page, "Więcej").click();
    const search = page.getByRole("searchbox", { name: "Szukaj usługi" });
    await search.fill("paszport");
    await expect(page.getByRole("button", { name: /^Rodzina/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Zdrowie/ })).toHaveCount(0);
    await button(page, "Wyczyść wyszukiwanie").click();
    await expect(page.getByRole("button", { name: /^Zdrowie/ })).toBeVisible();
    await page.getByRole("button", { name: /^Otwórz asystenta/ }).click();
    const assistant = page.getByRole("dialog", { name: "Asystent demonstracyjny" });
    await checkNav(assistant.getByRole("navigation"), "Usługi", 4);
    await expect(assistant.getByRole("textbox", { name: "Wiadomość do asystenta" })).toBeInViewport({ ratio: 1 });
    await shot(page, "assistant", width);
    await assistant.getByRole("button", { name: "Dane", exact: true }).click();
    await checkNav(nav, "Więcej");
    await shot(page, "privacy", width);
    await button(page, "Udostępnij wybrane dane").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Mam ukończone 18 lat/ })).toBeChecked();
    await expect(button(page, "Utwórz kod demonstracyjny")).toBeInViewport({ ratio: 1 });
    if (width === 390) await shot(page, "share", width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
