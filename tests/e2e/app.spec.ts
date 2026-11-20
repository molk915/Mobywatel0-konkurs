import { test, expect, type Page } from "@playwright/test";
const dialog = (page: Page) => page.getByRole("dialog");
test("manual action has its own outcome and finishes the package only after citizen confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawy", exact: true }).click();
  await page.getByRole("button", { name: /Nowa sytuacja życiowa/ }).click();
  await page.getByRole("button", { name: /^Przeprowadzka Jeden plan/ }).click();
  await page.getByRole("button", { name: "Zaczynamy", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Miejscowość", exact: true })
    .fill("Warszawa");
  await page
    .getByRole("textbox", {
      name: "Ulica, numer domu i mieszkania",
      exact: true,
    })
    .fill("Jasna 8");
  await page
    .getByRole("textbox", { name: "Kod pocztowy", exact: true })
    .fill("00-013");
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await page.getByRole("checkbox", { name: /^Zameldowanie/ }).uncheck();
  await page
    .getByRole("checkbox", { name: /^Adres dla urzędu skarbowego/ })
    .uncheck();
  await page
    .getByRole("checkbox", { name: /^Dane właściciela pojazdu/ })
    .check();
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await consent(page);
  await expect(page.locator(".operation.manual")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Oznacz krok jako wykonany", exact: true })
    .click();
  await expect(page.locator(".operation.manual-done")).toContainText(
    "Potwierdzone przez Ciebie",
  );
  await page.reload();
  await expect(page.locator(".operation.manual-done")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Wróć do moich spraw", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Zakończone", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "W toku", exact: true }),
  ).toHaveCount(0);
});
async function consent(page: Page) {
  await page
    .getByRole("checkbox", { name: /Rozumiem i zatwierdzam symulację/ })
    .check();
  await page
    .getByRole("button", { name: "Zatwierdź symulację", exact: true })
    .click();
}
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
test("three cases complete with validation, refresh and persistent receipts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawy", exact: true }).click();
  await page.getByRole("button", { name: /Nowa sytuacja życiowa/ }).click();
  await page.getByRole("button", { name: /^Przeprowadzka Jeden plan/ }).click();
  await page.getByRole("button", { name: "Zaczynamy", exact: true }).click();
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Miejscowość", exact: true })
    .fill("Warszawa");
  await page
    .getByRole("textbox", {
      name: "Ulica, numer domu i mieszkania",
      exact: true,
    })
    .fill("Jasna 8/12");
  await page
    .getByRole("textbox", { name: "Kod pocztowy", exact: true })
    .fill("00-013");
  await page.reload();
  await expect(dialog(page)).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Miejscowość", exact: true }),
  ).toHaveValue("Warszawa");
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await page
    .getByRole("button", { name: "Zatwierdź symulację", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Potwierdź");
  await consent(page);
  await expect(dialog(page)).toContainText("Twój pakiet przeprowadzki");
  await expect(page.locator(".operation.needs-document")).toContainText(
    "Zameldowanie",
  );
  await expect(page.locator(".operation.accepted")).toContainText(
    "Aktualizacja adresu podatkowego",
  );
  await page
    .getByRole("button", { name: "Wróć do moich spraw", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "W toku", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Dołącz dokument do zameldowania/ }).click();
  await page
    .getByRole("button", { name: "Użyj przykładowego dokumentu", exact: true })
    .click();
  await expect(page.locator(".operation.accepted")).toHaveCount(2);
  await page.reload();
  await expect(page.locator(".operation.accepted")).toHaveCount(2);
  await expect(dialog(page)).toContainText("Tytul_do_lokalu_DEMO.txt");
  await page
    .getByRole("heading", { name: "Wyniki formalności", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/moving-outcomes.png" });
  await page.getByRole("button", { name: "Wróć do moich spraw" }).click();
  await page.getByRole("button", { name: /Nowa sytuacja życiowa/ }).click();
  await page
    .getByRole("button", { name: /^Zgubiony portfel Uporządkuj/ })
    .click();
  await page.getByRole("checkbox", { name: /^Karty płatnicze/ }).check();
  await page.getByRole("button", { name: "Zaczynamy", exact: true }).click();
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await consent(page);
  await expect(dialog(page)).toContainText(
    "Ochrona PESEL · włączona w symulacji",
  );
  await page.getByRole("button", { name: "Wróć do moich spraw" }).click();
  await page.getByRole("button", { name: /Nowa sytuacja życiowa/ }).click();
  await page.getByRole("button", { name: /^Zrozum pismo Dowiedz/ }).click();
  await page.getByRole("button", { name: "Zaczynamy", exact: true }).click();
  await page.screenshot({ path: "test-results/v2-letter.png" });
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await page
    .getByRole("button", { name: "Użyj pliku demonstracyjnego", exact: true })
    .click();
  await expect(
    page.getByText("Potwierdzenie_DEMO.txt", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await consent(page);
  await expect(dialog(page)).toContainText("Odpowiedź przygotowana.");
  await page.getByRole("button", { name: "Wróć do moich spraw" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Zakończone", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("assistant prepares editable city; privacy consent is explicit and revocable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Usługi", exact: true }).click();
  await page
    .getByRole("button", { name: /^Otwórz asystenta/ })
    .click();
  await page
    .getByRole("button", { name: "Przeprowadzam się do Warszawy", exact: true })
    .click();
  await expect(dialog(page)).toContainText("Możesz ją zmienić");
  await page
    .getByRole("button", { name: /^Przeprowadzka Otwórz plan/ })
    .click();
  await page.getByRole("button", { name: "Zaczynamy", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Miejscowość", exact: true }),
  ).toHaveValue("Warszawa");
  await page.getByRole("button", { name: "Zamknij", exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
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
  const mainRect = await page.locator(".bottom-nav").boundingBox();
  const actionRect = await page.getByRole("button", { name: "Dodaj", exact: true }).boundingBox();
  expect(actionRect!.y + actionRect!.height).toBeLessThanOrEqual(mainRect!.y);
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.locator(".phone")).toHaveCSS("width", "320px");
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
test("production PWA reloads offline with cached app and preserved case", async ({
  page,
  context,
}) => {
  await page.goto("http://127.0.0.1:4184/");
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
  await page.getByRole("button", { name: /^Przeprowadzka Jeden plan/ }).click();
  await page.getByRole("button", { name: "Zaczynamy", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Miejscowość", exact: true })
    .fill("Warszawa");
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Miejscowość", exact: true }),
  ).toHaveValue("Warszawa");
  await expect(dialog(page)).toBeVisible();
  await context.setOffline(false);
});
