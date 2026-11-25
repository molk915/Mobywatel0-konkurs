import { expect, test, type Locator, type Page } from "@playwright/test";
import { passkeyOrigin } from "./urls";

const button = (page: Page | Locator, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });

test("MOST 3.0: Ewa and Kacper share one deadline scope and execute only the approved letter", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await page.goto("/?start=centrum");
  await expect(page.getByRole("heading", { name: "Centrum kontroli" })).toBeVisible();
  await button(page, "Przygotuj zaproszenie").click();
  await button(page, "Utwórz zaproszenie QR").click();
  const invite = await page.getByRole("link", { name: "Otwórz zaproszenie w nowej karcie" }).getAttribute("href");

  const helperContext = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  try {
    const helper = await helperContext.newPage();
    await helper.goto(invite!);
    await helper.getByLabel("Twój profil w pokazie").selectOption("kacper");
    await button(helper, "Przyjmij zaproszenie").click();
    await expect(page.getByText("Osoba zaufana jest połączona")).toBeVisible();

    await button(page, "Udziel dostępu").click();
    await page.getByRole("combobox", { name: "Zasób", exact: true }).selectOption("vehicle");
    await button(page, "Dalej").click();
    await page.getByLabel("Monitorowanie terminów").check();
    await button(page, "Sprawdź podsumowanie").click();
    await button(page, "Przejdź do potwierdzenia").click();
    await button(page, "Potwierdź dostęp").click();

    await button(helper, "Terminy").click();
    const inspection = (frame: Page) => frame.locator("article").filter({ has: frame.getByRole("heading", { name: "Badanie techniczne pojazdu" }) });
    await expect(inspection(helper)).toBeVisible();
    await expect(helper.getByRole("heading", { name: "Paszport" })).toHaveCount(0);
    await expect(helper.getByRole("heading", { name: "Wezwanie do uzupełnienia wniosku" })).toHaveCount(0);
    await button(page, "Terminy").click();
    await button(inspection(page), "Zobacz szczegóły").click();
    await inspection(page).getByLabel("Data terminu").fill("2030-08-17");
    await button(inspection(page), "Zapisz termin").click();
    await expect(inspection(helper).locator("time")).toHaveAttribute("datetime", "2030-08-17");

    await button(helper, "Dostęp").click();
    await button(helper, "Zapytaj asystenta MOST").click();
    await helper.getByLabel("Pytanie do asystenta").fill("Pokaż mi wyniki badań Ewy");
    await button(helper, "Zapytaj").click();
    await expect(helper.getByText("Ten kontekst MOST nie udostępnia takich danych.")).toBeVisible();
    await button(helper, "Wstecz").click();
    await button(helper, "Poproś o dostęp do pisma").click();
    await button(page, "Dostęp").click();
    await button(page, "Rozpatrz prośbę").click();
    await page.getByLabel("Przygotowanie odpowiedzi lub zgłoszenia").check();
    await page.getByLabel("Dodawanie załączników").check();
    await page.getByLabel("Wysłanie w pokazie").check();
    await page.getByLabel("Sposób zatwierdzania").selectOption("confirm");
    await button(page, "Sprawdź podsumowanie").click();
    await button(page, "Przejdź do potwierdzenia").click();
    await button(page, "Potwierdź dostęp").click();

    const letter = helper.getByRole("link", { name: "Otwórz sprawę", exact: true });
    await expect(letter).toBeVisible();
    await letter.click();
    const casePage = helper;
    await button(casePage, /^Udostępnione pismo/).click();
    await expect(casePage.getByText(/Prosimy o uzupełnienie wniosku/)).toBeVisible();
    await casePage.getByText("Zapytaj o pismo", { exact: true }).click();
    await casePage.getByLabel("Pytanie o udostępnione pismo").fill("Dlaczego urząd prosi o dokument?");
    await button(casePage, "Wyjaśnij pismo").click();
    await expect(casePage.getByText(/Działasz w imieniu: Ewa/)).toBeVisible();
    await button(casePage, "Wstecz").click();
    await button(casePage, "Użyj przykładowego adresu").click();
    await button(casePage, "Zapisz formularz").click();
    await button(casePage, "Użyj przykładowej umowy").click();
    await casePage.getByLabel("Uzasadnienie", { exact: true }).fill("W imieniu Ewy dołączam kopię umowy najmu na potrzeby pokazu.");
    await button(casePage, "Zapisz uzasadnienie").click();
    await button(casePage, "Sprawdź odpowiedź").click();
    await button(casePage, "Rozpocznij osobne potwierdzenie").click();
    await button(casePage, "Zatwierdź i wyślij (demo)").click();
    await expect(casePage.getByText(/Potwierdzenie demonstracyjne DEMO-UP-/)).toBeVisible();
    await button(casePage, "Wstecz").click();
    await expect(casePage.getByRole("region", { name: "Sprawy udostępnione w MOST" })).toBeVisible();
    await button(casePage, "Terminy").click();
    await expect(casePage.getByRole("heading", { name: "Badanie techniczne pojazdu" })).toBeVisible();
    await button(casePage, "Wstecz").click();
    await button(casePage, "Wezwanie do uzupełnienia wniosku").click();
    await expect(casePage.getByText(/Potwierdzenie demonstracyjne DEMO-UP-/)).toBeVisible();

    await button(page, "Historia").click();
    await expect(page.getByRole("heading", { name: "Wysłano odpowiedź w pokazie" })).toBeVisible();
    await expect(page.getByText(/DEMO-UP-.*wersja/)).toBeVisible();
    await button(page, "Dostęp").click();
    const paperCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "Wezwanie do uzupełnienia wniosku" }) });
    await button(paperCard, "Dokument pełnomocnictwa").click();
    await button(paperCard, "Przygotuj projekt pełnomocnictwa").click();
    await button(paperCard, "Zapisz metodę podpisu").click();
    await button(paperCard, "Potwierdź próbny podpis").click();
    await expect(paperCard.getByText("Podpisano w symulacji", { exact: true })).toBeVisible();
    await button(paperCard, "Cofnij dostęp").click();
    await button(paperCard, "Potwierdź cofnięcie dostępu").click();
    await expect(casePage.getByRole("heading", { name: "Dostęp do sprawy został zakończony" })).toBeVisible();
    await button(casePage, "Wstecz").click();
    await expect(letter).toHaveCount(0);
    await button(paperCard, "Otwórz dokument pełnomocnictwa").click();
    await expect(paperCard.getByText(/Status: Cofnięto/)).toBeVisible();
  } finally { await helperContext.close().catch(() => {}); }
});

test("MOST 3.0: WebAuthn verifies a virtual passkey and authorizes the exact reviewed scope", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "Wirtualny uwierzytelniacz wymaga Chrome DevTools Protocol");
  const devtools = await context.newCDPSession(page);
  await devtools.send("WebAuthn.enable");
  await devtools.send("WebAuthn.addVirtualAuthenticator", { options: {
    protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true,
    isUserVerified: true, automaticPresenceSimulation: true,
  } });

  await page.goto(passkeyOrigin + "/?start=centrum");
  await button(page, "Przygotuj zaproszenie").click();
  await button(page, "Utwórz zaproszenie QR").click();
  const invite = await page.getByRole("link", { name: "Otwórz zaproszenie w nowej karcie" }).getAttribute("href");
  const response = await context.request.get(invite!.split("#")[0]);
  expect(response.ok()).toBeTruthy();
  const helper = await context.newPage();
  await helper.goto(invite!);
  await button(helper, "Przyjmij zaproszenie").click();
  await expect(page.getByText("Osoba zaufana jest połączona")).toBeVisible();

  await page.bringToFront();
  await page.getByText("Bezpieczeństwo połączenia", { exact: true }).click();
  await button(page, "Dodaj klucz dostępu").click();
  await expect(button(page, "Klucz dostępu jest aktywny")).toBeDisabled();
  await button(page, "Udziel dostępu").click();
  await page.getByRole("combobox", { name: "Zasób", exact: true }).selectOption("passport");
  await button(page, "Dalej").click();
  await page.getByLabel("Otwieranie dokumentu lub sprawy").check();
  await button(page, "Sprawdź podsumowanie").click();
  await button(page, "Przejdź do potwierdzenia").click();
  await button(page, "Potwierdź kluczem dostępu").click();
  await expect(page.getByText("Zakres dostępu zapisany.")).toBeVisible();
  await expect(helper.getByRole("heading", { name: "Paszport" })).toBeVisible();
});
