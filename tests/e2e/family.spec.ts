import { test, expect, type Page, type Locator } from "@playwright/test";

const family = (page: Page) => page.getByRole("dialog", { name: "mObywatel Rodzina" });
const screenshot = (page: Page, name: string) =>
  page.screenshot({ path: "docs/screenshots/night-family-" + name + ".png", animations: "disabled" });

async function assertFits(page: Page, primary: Locator) {
  await expect(primary).toBeInViewport({ ratio: 1 });
  await expect(family(page).getByRole("navigation")).toBeInViewport({ ratio: 1 });
  expect(await family(page).locator(".family-scroll").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function invite(owner: Page, name: string) {
  const dialog = family(owner);
  await dialog.getByRole("button", { name: "Udostępnij link dla Tomasza" }).click();
  const url = await dialog.locator(".family-link-card").filter({ has: owner.getByRole("heading", { name, exact: true }) })
    .getByRole("link", { name: "Otwórz profil" }).getAttribute("href");
  await dialog.getByRole("button", { name: "Wstecz", exact: true }).click();
  return url!;
}

async function enterOwner(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Usługi", exact: true }).click();
  await page.getByRole("region", { name: "Katalog usług" }).getByRole("button", { name: /^Rodzina/ }).click();
  await expect(family(page).getByRole("heading", { name: "Rodzinny wyjazd" })).toBeVisible();
}

test("the family service explains the profile choice before opening", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Profil i ustawienia" }).click();
  await page.getByRole("button", { name: /^Ewa Wiśniewska/ }).click();
  await page.getByRole("button", { name: "Usługi", exact: true }).click();
  await page.getByRole("region", { name: "Katalog usług" }).getByRole("button", { name: /^Rodzina/ }).click();
  const choice = page.getByRole("dialog");
  await expect(choice.getByRole("heading", { name: "Wybierz profil do Rodziny" })).toBeVisible();
  await choice.getByRole("button", { name: /^Aleksandra Nowak/ }).click();
  await expect(family(page).getByRole("heading", { name: "Rodzinny wyjazd" })).toBeVisible();
  await expect(family(page).getByRole("button", { name: "Usługi", exact: true })).toHaveAttribute("aria-current", "page");
  await family(page).getByRole("button", { name: "Wróć do usług" }).click();
  await expect(page.getByRole("region", { name: "Katalog usług" })).toBeVisible();
});

for (const { width, height, approve } of [
  { width: 390, height: 844, approve: true },
  { width: 320, height: 740, approve: false },
]) {
  test(`${width}×${height}: two isolated sessions synchronize ${approve ? "approval" : "refusal"}`, async ({
    page, browser,
  }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const other = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
    const dad = await other.newPage();
    dad.on("pageerror", (error) => errors.push(error.message));
    try {
      await enterOwner(page);
      const owner = family(page);
      const travel = owner.getByRole("button", { name: "Przygotuj rodzinę do wyjazdu" });
      await assertFits(page, travel);
      await expect(owner.getByRole("button", { name: "Udostępnij link dla Tomasza" })).toBeInViewport({ ratio: 1 });
      await screenshot(page, `home-${width}`);
      await owner.getByRole("button", { name: /Zosia.*Wymaga uwagi/ }).click();
      await expect(owner.getByRole("heading", { name: "Zosia" })).toBeVisible();
      if (approve) await screenshot(page, "member-390");
      await owner.getByRole("button", { name: "Wstecz", exact: true }).click();
      await dad.goto(await invite(page, "Tomasz"));
      const recipient = family(dad);
      await expect(recipient.getByText("Tutaj pojawi się prośba Aleksandry.")).toBeVisible();
      await expect.poll(() => new URL(dad.url()).hash).toBe("");
      await travel.click();
      await expect(owner.getByRole("heading", { name: "Sprawdź paszport Zosi" })).toBeVisible();
      await assertFits(page, owner.getByRole("button", { name: "Otwórz sprawę paszportu" }));
      if (approve) await screenshot(page, "travel-390");
      await owner.getByRole("button", { name: "Otwórz sprawę paszportu" }).click();
      await owner.getByRole("button", { name: "Uzupełnij wniosek" }).click();
      const save = owner.getByRole("button", { name: "Zapisz i sprawdź" });
      await assertFits(page, save);
      await save.click();
      await expect(owner.getByRole("heading", { name: "Przygotuj wniosek" })).toBeVisible();
      await owner.getByLabel("Cel podróży").selectOption("Wizyta u rodziny");
      await owner.getByLabel("Punkt paszportowy").selectOption("Warszawa – Mokotów");
      if (approve) {
        await owner.getByRole("button", { name: "Powiadomienia" }).click();
        await expect(page.getByRole("dialog", { name: "Powiadomienia" })).toBeVisible();
        await page.goBack();
        await expect(owner.getByRole("heading", { name: "Przygotuj wniosek" })).toBeVisible();
        await expect(owner.getByLabel("Punkt paszportowy")).toHaveValue("Warszawa – Mokotów");
      }
      if (approve) await screenshot(page, "form-390");
      await save.click();
      await expect(owner.getByRole("status").filter({ hasText: "Wniosek do sprawdzenia" })).toBeVisible();
      await expect(recipient.getByText("Tutaj pojawi się prośba Aleksandry.")).toBeVisible();
      await owner.getByRole("button", { name: "Sprawdź zakres prośby" }).click();
      await expect(owner.getByRole("heading", { name: "Zakres udostępnienia" })).toBeVisible();
      await owner.getByRole("button", { name: "Poproś Tomasza o zgodę" }).click();
      await expect(owner.getByText("Czeka na zgodę Tomasza")).toBeVisible();
      await expect(recipient.getByRole("button", { name: /Prośba o zgodę/ })).toBeVisible();
      await dad.reload();
      await recipient.getByRole("button", { name: "Powiadomienia" }).click();
      await dad.getByRole("dialog").getByRole("button", { name: /Aleksandra prosi o zgodę na paszport Zosi/ }).click();
      await expect(recipient.getByText("Wizyta u rodziny")).toBeVisible();
      await expect(recipient.getByText("Warszawa – Mokotów")).toBeVisible();
      const decision = recipient.getByRole("button", { name: approve ? "Wyraź zgodę" : "Odmów" });
      await assertFits(dad, decision);
      await screenshot(dad, `consent-${width}`);
      if (!approve) {
        await other.setOffline(true);
        await expect(decision).toBeDisabled();
        await other.setOffline(false);
        await expect(decision).toBeEnabled();
      }
      await decision.click();
      const status = approve ? "Wniosek przygotowany" : "Tomasz odmówił zgody";
      await expect(owner.getByRole("status").filter({ hasText: status })).toBeVisible();
      await expect(recipient.getByRole("status").filter({ hasText: status })).toBeVisible();
      await screenshot(page, `case-${width}`);
      await owner.getByRole("button", { name: "Zobacz historię współpracy" }).click();
      await expect(owner.getByText(approve ? "Wyraził zgodę" : "Odmówił zgody")).toBeVisible();
      await expect(owner.getByText("Poprosiła Tomasza o zgodę")).toBeVisible();
      if (approve) await screenshot(page, "history-390");
      await page.reload();
      await expect(owner.getByRole("button", { name: "Paszport Zosi", exact: true })).toHaveAccessibleDescription(status);
      expect(errors).toEqual([]);
    } finally {
      await other.close();
    }
  });
}

test("the child can see only their document status and the invite opens a separate tab", async ({ page }) => {
  await enterOwner(page);
  const owner = family(page);
  await owner.getByRole("button", { name: "Udostępnij link dla Tomasza" }).click();
  const childLink = owner.locator(".family-link-card").filter({ has: page.getByRole("heading", { name: "Zosia" }) })
    .getByRole("link", { name: "Otwórz profil" });
  const [child] = await Promise.all([page.context().waitForEvent("page"), childLink.click()]);
  try {
    const childView = family(child);
    await expect(childView.getByRole("heading", { name: "Domownicy" })).toBeVisible();
    await expect(childView.getByText("Wymaga uwagi")).toHaveCount(1);
    await expect(childView.getByText("Aktualny")).toHaveCount(0);
    await childView.getByRole("button", { name: /Aleksandra.*Mama/ }).click();
    await expect(childView.getByText(/Status tego dokumentu jest dostępny/)).toBeVisible();
    await expect(childView.getByRole("button", { name: /sprawy paszportu|zgodę|Udostępnij link/ })).toHaveCount(0);
    await expect(owner.getByRole("heading", { name: "Zaproszenia dla bliskich" })).toBeVisible();
  } finally {
    await child.close();
  }
});

for (const [width, height] of [[390, 844], [375, 812], [320, 740]]) {
  test(`Dokumenty ${width}×${height} retain their header, action and navigation on scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const heading = page.getByRole("heading", { name: "Dokumenty", exact: true });
    const add = page.getByRole("button", { name: "Dodaj", exact: true });
    const nav = page.getByRole("navigation", { name: "Nawigacja główna" });
    const anchored = [heading, add, nav];
    for (const locator of anchored) await expect(locator).toBeInViewport({ ratio: 1 });
    await expect(nav.getByRole("button")).toHaveCount(4);
    await page.screenshot({ path: `docs/screenshots/night-documents-${width}.png` });
    await add.click();
    const catalog = page.getByRole("dialog", { name: "Katalog dokumentów" });
    await expect(catalog).toBeInViewport({ ratio: 1 });
    await catalog.getByRole("button", { name: "Karta EKUZ" }).click();
    await catalog.getByRole("button", { name: "Gotowe" }).click();
    const fits = await page.getByTestId("document-scroll").evaluate((el) => el.scrollHeight <= el.clientHeight);
    if (fits) await page.setViewportSize({ width, height: 630 });
    const before = await Promise.all(anchored.map((locator) => locator.boundingBox()));
    await page.getByTestId("document-scroll").evaluate((el) => el.scrollTo(0, el.scrollHeight));
    expect(await page.getByTestId("document-scroll").evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await Promise.all(anchored.map((locator) => locator.boundingBox()))).toEqual(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
