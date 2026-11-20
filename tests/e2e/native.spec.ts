import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
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
test("decision simulator changes dependencies and starts an editable persistent plan", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sprawy", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Przeprowadzka Jeden plan/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Co się stanie, jeśli/ }).click();
  await page.getByRole("radio", { name: "U bliskich", exact: true }).check();
  await expect(page.locator(".decision-path")).toContainText(
    "Poproś właściciela",
  );
  await page
    .getByRole("checkbox", {
      name: "Chcę sprawdzić aktualizację adresu podatkowego",
    })
    .check();
  await expect(page.locator(".decision-path li")).toHaveCount(4);
  await page.locator(".simulator").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/native-simulation.png" });
  await page
    .getByRole("button", { name: "Utwórz roboczy plan", exact: true })
    .click();
  await page.getByRole("button", { name: "Zaczynamy", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Miejscowość", exact: true }),
  ).toHaveValue("Kraków");
  await page.getByRole("button", { name: "Zamknij", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "W toku", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "W toku" }).getByRole("button", { name: /Przeprowadzka/i })).toBeVisible();
});
test("non-reduced motion supports keyboard activation and closing a document", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const vehicle = page.locator(".approved-document-list").getByRole("button", { name: /^Moje pojazdy/ });
  await vehicle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText("Toyota Corolla");
  await expect(page.locator(".approved-detail-shell")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("process context, actual local file, history and download survive reload", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          sessionStorage.setItem("test-copy", value);
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Usługi", exact: true }).click();
  await page
    .getByRole("button", { name: /^Otwórz asystenta/ })
    .click();
  await page
    .getByRole("textbox", { name: "Wiadomość do asystenta" })
    .fill("Przeprowadzam się z Warszawy do Krakowa");
  await page.getByRole("button", { name: "Wyślij wiadomość" }).click();
  await page
    .getByRole("button", { name: /^Przeprowadzka Otwórz plan/ })
    .click();
  await page.getByRole("button", { name: "Zaczynamy", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Miejscowość", exact: true }),
  ).toHaveValue("Kraków");
  await page
    .getByRole("textbox", {
      name: "Ulica, numer domu i mieszkania",
      exact: true,
    })
    .fill("Jasna 8");
  await page
    .getByRole("textbox", { name: "Kod pocztowy", exact: true })
    .fill("30-001");
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Kontrola działania asystenta" }),
  ).toContainText("Co zostanie przekazane?");
  await page
    .getByRole("checkbox", { name: /Rozumiem i zatwierdzam symulację/ })
    .check();
  await page
    .getByRole("button", { name: "Zatwierdź symulację", exact: true })
    .click();
  await page.locator(".process-route li").first().getByRole("button").click();
  await expect(page.locator("#operation-meldunek")).toBeInViewport();
  const preparedFile = page.waitForEvent("download");
  await page.getByRole("button", { name: /Pobierz szkic danych/ }).click();
  const prepared = await preparedFile;
  expect(prepared.suggestedFilename()).toBe("Plan_przeprowadzki_DEMO.txt");
  expect(await readFile((await prepared.path())!, "utf8")).toContain(
    "Kraków, Jasna 8, 30-001",
  );
  await page.getByRole("button", { name: /Zapytaj o tę sprawę/ }).click();
  await page
    .getByRole("textbox", { name: "Wiadomość do asystenta" })
    .fill("Co mam zrobić dalej?");
  await page.getByRole("button", { name: "Wyślij wiadomość" }).click();
  await expect(page.locator(".chat-message.assistant").last()).toContainText(
    "1 z 2",
  );
  await page.getByRole("button", { name: /Wróć do swojej sprawy/ }).click();
  await page.locator(".operation input[type=file]").setInputFiles({
    name: "Fikcyjna_umowa.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("DEMO - fikcyjna umowa do testu prototypu"),
  });
  await expect(page.locator(".operation.accepted")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Skopiuj potwierdzenie", exact: true })
    .click();
  const copied = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("test-copy")!),
  );
  expect(copied.operations[0].status).toBe("accepted");
  expect(copied.events.at(-1).label).toContain("Fikcyjna_umowa.txt");
  await page.reload();
  await expect(page.locator(".process-history")).toContainText(
    "Dodano dokument lokalny: Fikcyjna_umowa.txt",
  );
  const pendingDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Fikcyjna_umowa.txt", exact: true })
    .click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe("Fikcyjna_umowa.txt");
  await page
    .getByRole("heading", { name: "Wyniki formalności", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/native-process.png" });
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
  for (const tab of ["Dokumenty", "Sprawy", "Dane"]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    const overflow = await page
      .locator(".screen-content")
      .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(overflow).toBe(false);
  }
});
