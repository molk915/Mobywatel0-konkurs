# mObywatel · Po Twojej stronie

Niezależny, interaktywny prototyp konkursowy w React + TypeScript. Nie jest oficjalną usługą administracji. Uruchamia się bez konta, kluczy i połączeń urzędowych.

Aktualny wygląd, porównanie referencji i wyniki testów: [kontrola wizualna Portfela](docs/WALLET-ART-REVIEW.md). Główny ekran to interaktywna talia dokumentów, z gestami, szczegółami, kontekstowymi działaniami i wysuwanym panelem spraw. Asystent ma jeden pasek nad nawigacją.

## Uruchomienie

Wymagany Node.js 24+ i npm.

```sh
npm ci
npm run dev
```

Otwórz `http://localhost:5173`. Desktop pokazuje ramkę smartfona; ekran do 600 px zajmuje całą szerokość i wysokość. Na niskich ekranach ramka skaluje się, zachowując proporcje.

```sh
npm run build
npm test
npm run preview
```

Podgląd kompilacji działa pod `http://localhost:4173`. Build generuje `dist/`, manifest PWA, ikony 192/512 oraz service worker z listą aktualnych zasobów. Pełne wdrożenie z API, zapisem stanu i synchronizacją opisuje [pakiet konkursowy](docs/SUBMISSION.md). Wejście do sprawy Ewy to `/?start=most`.

## Pokaz w 4 minuty

1. **Portfel → Asystent → „Przeprowadzam się do Warszawy”**. Otwórz plan. Miejscowość jest uzupełniona z intencji i pozostaje edytowalna. Wpisz `Jasna 8/12`, `00-013`. Wybierz formalności i sprawdź odbiorców przed potwierdzeniem.
2. **Sprawy → Nowa sytuacja życiowa → Zgubiony portfel**. Wybierz dokumenty i karty. Sprawdź odrębne konsekwencje i zatwierdź symulację. Status ochrony PESEL zmienia się wyłącznie w profilu demo.
3. **Sprawy → Nowa sytuacja życiowa → Zrozum pismo**. Przeczytaj wyjaśnienie fikcyjnego pisma, popraw szkic i dodaj lokalny plik albo użyj rzeczywistego pliku TXT przygotowanego do demonstracji. Zatwierdź i pobierz załącznik z potwierdzenia.
4. **Dane → Udostępnij wybrane dane**. Wybierz samo potwierdzenie pełnoletności albo imię i nazwisko. Potwierdź odbiorcę i cel. Kod ilustracyjny wygasa po 60 sekundach, także po zamknięciu okna. Historia zostaje.

Profil w prawym górnym rogu pozwala przełączać Aleksandrę, Kacpra i Ewę, zwiększać tekst i przywrócić początek pokazu. Każda persona ma własne sprawy, rozmowy, adres i historię zgód. Postęp jest lokalny: localStorage dla danych, IndexedDB dla plików.

## Publikacja HTTPS

Udostępnij **zawartość katalogu `dist` w katalogu głównym domeny** w dowolnym hostingu statycznym obsługującym HTTPS. Nie publikuj `node_modules`, plików `.env` ani katalogu `work`. Nie jest potrzebny backend dla obecnego pokazu. Konfiguracja Netlify jest dołączona jako `netlify.toml`; na Cloudflare Pages wybierz komendę `npm run build` i katalog `dist`.

Po publikacji sprawdź link bez logowania w oknie prywatnym, zainstaluj na iOS/Android i przetestuj ponownie scenariusze oraz restart offline. Ta ostatnia próba na fizycznym urządzeniu pozostaje niepotwierdzona — ograniczenia narzędzia opisuje [raport testów](docs/QA.md).

Publiczny adres HTTPS nie został utworzony, formularza konkursowego nie wysłano. Zbadane wymagania i decyzje produktu: [PRODUCT.md](docs/PRODUCT.md). Dokumentacja konkursu: https://mobywatel.ai/.

## Asystent i przyszły backend

Obecnie działa `DemoAssistant`: jawny silnik reguł, bez LLM, mikrofonu i kluczy. Nie odpowiada wiarygodnie na dowolne pytania. Własne pismo dostaje ograniczoną analizę wzorców, a nie zmyśloną interpretację.

Backend Node w `server/` uruchomisz przez `npm run server` (domyślnie localhost:4190, provider demo). Frontend używa go po jawnym ustawieniu `VITE_ASSISTANT_MODE=server`; bez tego pozostaje całkowicie lokalny. `AssistantProvider` oraz `ServerAssistant` w `src/domain.ts` definiują wspólny kontrakt integracji. [Kontrakt backendu](docs/AI-INTEGRATION.md) opisuje podłączenie Bielika, PLLuM lub API zgodnego z OpenAI. Klucze przechowuje wyłącznie serwer. Wynik asystenta proponuje proces; zatwierdzenie operacji pozostaje w osobnym interfejsie.

## Pliki i sprawdzenia

`src/App.tsx` — widoki i nawigacja; `src/domain.ts` — procesy, walidacja i dostawcy asystenta; `src/storage.ts` — stan per persona; `src/attachments.ts` — lokalne pliki; `src/DeckWallet.tsx` — talia i panel; `src/DigitalCard.tsx` — wspólne projekty dokumentów; `src/CaseHub.tsx`, `src/PrivacyHub.tsx`, `src/ProcessRoute.tsx` — sprawy, dane i oś procesu; `src/styles.css`, `src/redesign.css`, `src/portfolio.css` — system wizualny; `scripts/generate-sw.mjs` — zasoby offline; `tests/` — inwarianty procesów i service workera. [QA.md](docs/QA.md) rozdziela wykonane testy od brakującego potwierdzenia.

Interfejs wykorzystuje React, Lucide i lokalne fonty Inter. Wydanie konkursowe ma własny znak mostu, dekoracje dokumentów i wygenerowane portrety fikcyjnych postaci. Pochodzenie zasobów opisuje [ASSETS.md](docs/ASSETS.md).



Testy przeglądarkowe: `npx playwright install chromium`, następnie `npm run build` i `npm run test:e2e`. Testy uruchamiają własne lokalne serwery na portach 4183 i 4184.

"# Mobywatel0-konkurs" 
