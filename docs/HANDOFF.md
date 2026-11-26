# HANDOFF — mObywatel Challenge 2026

Stan na 18 listopada 2026. Ten dokument ma pozwolić nowej sesji Codexa kontynuować pracę bez ponownego rekonstruowania historii projektu.

## Zdrowie, sprawy i powiadomienia

Moduł Zdrowie otwiera się ze Spraw. Link zaproszenia otwiera zadanie w zwykłej aplikacji. Kacper może do niego wrócić ze Spraw wspólnych i powiadomień. Serwer przechowuje dane profilu, skierowania, upoważnienia, plan wizyty, terminarz oraz zdarzenia. Zaproszenie daje Kacprowi dostęp do jednego skierowania zgodnie z zakresem wybranym przez Ewę. [Scenariusz i ograniczenia Zdrowia](HEALTH.md).

## Aktualny kierunek wizualny — ciemny interfejs wspólnych spraw

Zatwierdzona plansza z trzema telefonami wyznacza grafitowe tło, stalowe karty, typografię bezszeryfową, czerwony akcent i jasny panel decyzji. Wspólne tokeny i elementy interfejsu są w `src/civic-system.css` oraz `src/CivicChrome.tsx`. Historyczny opis jasnych Dokumentów niżej dokumentuje poprzednią wersję.

W Sprawach widok **Moje** grupuje zadania według statusu, a **Wspólne** prowadzi do wspólnych spraw i Rodziny. Profil można zmienić jawnie w selektorze. Pokaz desktopowy ma ekran wejściowy i uruchamia obie sesje po kliknięciu **Rozpocznij demonstrację**.

Po porównaniu zrzutów z planszą przyciemniono wzór pod tekstem mDowodu, poprawiono kontrast starszych formularzy i przeniesiono zgodę oraz przycisk udostępniania do stałej stopki. Zrzuty ciemnego interfejsu mają prefiks `night-`. Zrzuty aktualnej ścieżki współpracy mają prefiks `delegation-`.

## Aktualny priorytet konkursowy — mObywatel Razem

Kacper przygotowuje kompletny pakiet do wezwania Ewy. Obejmuje adres, dokument demonstracyjny i uzasadnienie. Ewa wybiera zakres dostępu, a potem decyduje o całym pakiecie. Dzwonek pokazuje licznik zdarzeń przypisanych do roli i kieruje do konkretnego etapu sprawy. Pokaz desktopowy uruchamia obie role w jednym oknie z synchronizacją przez API. Przebieg, uprawnienia, reset i konfiguracja są w [MOST.md](MOST.md). Przegląd głównych modułów jest w [PRODUCT_AUDIT.md](PRODUCT_AUDIT.md).

## Nowa decyzja produktowa — Rodzina w mObywatel Razem

Scenariusz rodzinny pokazuje wspólne przygotowanie wyjazdu. Aleksandra przygotowuje wniosek paszportowy Zosi, Tomasz rozpatruje prośbę w swojej sesji, a status i historia aktualizują się z jednego źródła na serwerze. Model uprawnień, instrukcja pokazu i ograniczenia są w [FAMILY_MODULE.md](FAMILY_MODULE.md). Poniższe sekcje zachowują wcześniejszy stan przekazania.

## 1. Najważniejsze na start

- Projekt jest niezależnym, klikalnym prototypem konkursowym React + TypeScript. Nie łączy się z usługami administracji i nie wykonuje prawdziwych operacji urzędowych.
- Aktualny katalog roboczy: `C:\Users\piotr\Documents\ChatGPT\Mobywatel`.
- Najnowszym i nadrzędnym kierunkiem UI są dwa zatwierdzone ekrany modułu Dokumenty opisane w sekcji 3. Nie należy proponować kolejnego redesignu ani wracać do starszych wariantów Portfela.
- Nowy moduł Dokumenty jest już podłączony, buduje się i ma wykonane zrzuty, ale nie przeszedł jeszcze końcowego porównania pixel-accurate ani nowych testów E2E.
- Nie publikowano aplikacji, nie wysłano zgłoszenia konkursowego i nie używano płatnego API.
- Repozytorium Git nie ma jeszcze żadnego commita. Wszystkie pliki są obecnie nieśledzone (`git status` pokazuje `??` dla całego projektu). Przed większymi zmianami warto utworzyć pierwszy commit kontrolny, ale tylko po zgodzie użytkownika.
- W chwili tworzenia handoffu serwer podglądu na porcie 4173 nie działał.

## 2. Stan wykonania

### Ukończone i działające

- Mobilna aplikacja w ramce telefonu na desktopie i pełnoekranowo na małych viewportach.
- Nowy ekran wyboru dokumentów z przestrzenną kompozycją kart, listą dokumentów, przyciskiem `Dodaj`, przyciskiem `Zarządzaj` i czterema pozycjami dolnej nawigacji.
- Nowy szczegół mDowodu z dużą kartą, portretem bieżącego profilu, imieniem i nazwiskiem, datą urodzenia, PESEL-em, numerem dokumentu, terminem ważności i obywatelstwem widocznymi bez otwierania dodatkowego panelu.
- Szczegóły mPrawa jazdy, pojazdu, Karty Dużej Rodziny oraz dokumentu dodatkowego profilu.
- Katalog dokumentów jako bottom sheet. Wybrane dokumenty zapisują się osobno w stanie każdej persony.
- Nawigacja ekran wyboru → dokument → powrót, integracja z historią przeglądarki i przyciskiem systemowym Wstecz.
- Udostępnianie minimalnego zakresu danych z jawną zgodą, odbiorcą, celem, kodem demonstracyjnym ważnym 60 sekund, automatycznym wygaśnięciem i historią dostępu.
- Trzy kompletne scenariusze spraw:
  - `Przeprowadzka`: adres i termin, wybór formalności, odbiorcy danych, podsumowanie, jawna zgoda, osobne wyniki operacji, uzupełnienie brakującego dokumentu i ręczne potwierdzenie kroku obywatela.
  - `Zgubiony portfel`: wybór utraconych elementów, niezależne konsekwencje dla PESEL-u, dowodu, kart i prawa jazdy, jawna zgoda i lokalna symulacja ochrony.
  - `Zrozum pismo`: przykładowe lub wklejone pismo, ograniczona analiza wzorców, szkic odpowiedzi, walidacja, załącznik lokalny i potwierdzenie bez fałszywej deklaracji wysłania do urzędu.
- Sprawy rozpoczęte, aktywne i zakończone; trwałe potwierdzenia, historia zdarzeń, lista dalszych kroków i eksport planu.
- Trzy odseparowane profile demonstracyjne: Aleksandra, Kacper i Ewa. Każdy ma własny adres, sprawy, rozmowy, zgody, zadania i układ dokumentów.
- Profile zawierają fikcyjne portrety, daty urodzenia, numery dokumentów i demonstracyjny PESEL `00000000000`.
- Deterministyczny `DemoAssistant` bez sieci: rozpoznaje intencje przeprowadzki, zgubionego portfela, pisma i prywatności, potrafi zaproponować edytowalne miasto, wznowić sprawę oraz otworzyć lub przygotować udostępnienie wybranego dokumentu. Nie zatwierdza operacji.
- Opcjonalny backend Node z tym samym kontraktem asystenta, trybem demo i adapterem do API zgodnego z Chat Completions/tool calling. Klucze pozostają wyłącznie po stronie serwera.
- PWA: manifest, ikony, generowany service worker, cache app shell, omijanie `/api/`, stan online/offline i lokalny zapis.
- `localStorage` dla stanu aplikacji oraz IndexedDB dla załączników do 5 MB (`pdf`, `txt`, `jpg`, `jpeg`, `png`).
- Obsługa większego tekstu, `prefers-reduced-motion`, podstawowe etykiety dostępności, focus trap dla głównych warstw i komunikaty błędów.
- Portret i godło/znak używane w interfejsie są lokalnymi zasobami. Znak `public/icon-mobywatel.svg` został skopiowany z dostarczonego przez użytkownika ZIP-a na jego wyraźne polecenie; patrz uwagi licencyjne w `docs/ASSETS.md`.

### Ostatni zweryfikowany stan techniczny

- `npm test` uruchomione 18.11.2026: **25/25 testów PASS**, 0 błędów.
- Ostatni `npm run build` po wdrożeniu nowego designu: **PASS** (`tsc`, Vite i wygenerowanie service workera).
- `scripts/qa-approved.mjs` wykonał zrzuty dla 390 × 844, 320 × 740 i desktopu; lista błędów strony była pusta.
- Pomiar karty mDowodu w viewport 390 × 844: `x=18`, `y≈187.7`, `width=354`, `height=396`.
- Skrypt potwierdził obecność wszystkich wymaganych pól mDowodu w DOM.
- Pełnego zestawu Playwright E2E nie uruchomiono po zatwierdzonym redesignie. Część starych testów celuje w usunięty z głównego widoku stos/karuzelę i wymaga aktualizacji.

## 3. Zatwierdzony design — source of truth

### Pliki referencyjne

Semantyczne przypisanie ekranów jest ważniejsze niż kolejność nazw `Image #1/#2` w wiadomości:

- Ekran wyboru dokumentów: `C:\Users\piotr\AppData\Local\Temp\codex-clipboard-ddcc93a2-2d0a-481c-b21b-57483da20437.png`.
- Ekran szczegółowy mDowodu: `C:\Users\piotr\AppData\Local\Temp\codex-clipboard-35fed710-3a13-42b6-bfa9-c448a950a0f2.png`.
- Pełny brief implementacyjny: `C:\Users\piotr\.codex\attachments\08228d94-f5ee-4b2e-88cb-c0f49a8fd22f\Wklejony tekst.txt`.

Nie wolno traktować całego referencyjnego ekranu jako bitmapy. Karty, teksty, listy, nawigacja i przyciski muszą pozostać prawdziwymi komponentami React; dekoracyjne wzory mogą być CSS/SVG.

### Ekran A — wybór dokumentów

- Ciepłe, bardzo jasne tło w tonacji kości słoniowej/różowej bieli.
- Delikatny liniowy wzór zabezpieczający w tle, bez ciężkich gradientów.
- Nagłówek `Dokumenty` dużym, kontrastowym krojem szeryfowym. Pod nim mały, szeroko rozstrzelony podpis wersalikami.
- Główny hero to przestrzenna, warstwowa kompozycja czterech dokumentów: mDowód z portretem i godłem z przodu, za nim różowe prawo jazdy, niebieska karta pojazdu i piaskowa Karta Dużej Rodziny. Kompozycja ma mieć głębię, delikatny cień, obrót i subtelny czerwony tor/orbitę.
- Sekcja `TWOJE DOKUMENTY` z krótką bordową kreską po lewej i przyciskiem `Zarządzaj` po prawej.
- Cztery lekkie, poziome karty listy: mDowód, mPrawo jazdy, Moje pojazdy, Karta Dużej Rodziny. Każda ma własny pastelowy ton, ikonę po lewej, szeryfową nazwę, rozstrzelony opis i strzałkę po prawej.
- Duży bordowy przycisk `+ Dodaj` nad dolną nawigacją.
- Dolna nawigacja: `Dokumenty`, `Sprawy`, `Asystent`, `Dane`; aktywny moduł Dokumenty jest bordowy.
- Efekt ma być luksusowy, lekki i zbliżony do iOS/Apple: naturalne sprężyny, głębia i responsywność, ale dekoracja nie może utrudniać korzystania z listy.

### Ekran B — szczegół mDowodu

- Ten sam jasny, ciepły język wizualny, szeryfowy nagłówek i subtelne linie zabezpieczające.
- Lewy górny przycisk powrotu; obok godło/marka. Po prawej powiadomienia i portret profilu.
- Duża, niemal pełnoszeroka karta mDowodu z łagodnym promieniem, cieniem i bladoniebieskim wzorem liniowym.
- W karcie: `RZECZPOSPOLITA POLSKA`, tytuł `mDowód`, bordowa kreska, niebieskie godło, czarno-biały portret, wyraźne imię i nazwisko, a niżej czytelna siatka danych.
- Bez otwierania panelu muszą być widoczne: imię, nazwisko, fotografia, data urodzenia, PESEL, obywatelstwo, numer dokumentu i termin ważności.
- Dane zawsze pochodzą z bieżącej persony; nie wolno wpisywać na stałe Marty Kowalskiej z mockupu.
- Wyraźne, ale dyskretne oznaczenie `DEMO`.
- Pod kartą: wskaźnik stron, przyciski `Szczegóły` i bordowy `Udostępnij`, następnie kontekstowa karta asystenta i dolna nawigacja.
- Ten ekran ma przedkładać czytelność nad agresywne animacje. Ruch powinien być subtelny.

### Nawigacja i animacja

- Otwieranie dokumentu powinno wyglądać jak przejście tego samego obiektu z listy/hero do szczegółu, nie jak niezależny modal.
- Powrót ma zamykać dokument płynnie, zachować pozycję listy i stan profilu.
- Muszą działać: przycisk Wstecz w UI, systemowy Wstecz oraz historia przeglądarki.
- `prefers-reduced-motion` musi wyłączać ruch ozdobny.

## 4. Architektura aplikacji

### Warstwa aplikacji

- `src/main.tsx` montuje React, `ErrorBoundary`, style w kolejności historycznej oraz rejestruje service worker w buildzie produkcyjnym.
- `src/App.tsx` jest obecnie monolitycznym orkiestratorem: przechowuje aktywną zakładkę i warstwę, spina store, historię przeglądarki, profile, procesy, asystenta, udostępnianie i wszystkie dialogi.
- Nawigacja główna używa `Tab = home | documents | cases | privacy`. W praktyce nowy moduł Dokumenty jest pod `home`; stary ekran `documents` nadal istnieje w kodzie, ale nowa dolna nawigacja prowadzi do `home`.
- Warstwy (`Layer`) obejmują dokument, asystenta, proces, potwierdzenie, udostępnianie, dostęp, profil, powiadomienia i ekrany informacyjne. Ich stan jest zapisywany w `history.state`.

### Model domenowy i trwałość

- `src/domain.ts` definiuje profile, `CitizenState`, walidację procesów, wyniki przeprowadzki, potwierdzenia, historię dostępu oraz dostawców asystenta.
- `src/storage.ts` przechowuje wersjonowany store pod kluczem `mobywatel-next-v1`. Dane każdej persony są izolowane.
- `src/attachments.ts` zapisuje pliki jako `Blob/File` w IndexedDB `mobywatel-demo-files`.
- `src/navigation.ts` waliduje stan historii i nie pozwala otworzyć sprawy lub dostępu należącego do innego profilu.

### Widoki

- `src/ApprovedDocuments.tsx` zawiera nowy wybór dokumentów, katalog, mDowód, szczegół dokumentu, SVG fal i czteropozycyjną nawigację.
- `src/approved-design.css` zawiera dedykowany styl zatwierdzonego kierunku.
- `src/CaseHub.tsx` i `src/ProcessRoute.tsx` odpowiadają za centrum spraw i przebieg zapisanych operacji.
- `src/PrivacyHub.tsx` odpowiada za zakres danych, zgody i historię dostępu.
- `src/DigitalCard.tsx` renderuje starsze/wspólne warianty kart dla dokumentów innych niż mDowód.
- `src/GestureDeck.tsx`, `src/DeckWallet.tsx`, `src/wallet-art.css` i kilka starszych arkuszy pozostają w repozytorium jako wcześniejsze iteracje. Nie są obecnie głównym widokiem, ale część nadal jest importowana lub używana przez stare testy.

### Asystent i backend

- `DemoAssistant` i `ServerAssistant` implementują wspólny `AssistantProvider` w `src/domain.ts`.
- Domyślnie frontend korzysta z lokalnego `DemoAssistant`.
- `server/index.mjs` udostępnia lokalne API na `127.0.0.1:4190`.
- `server/assistant.mjs` waliduje minimalny kontekst, ogranicza długość i zwraca wyłącznie propozycje nawigacji/procesu, nigdy wynik operacji.
- Vite proxy przekazuje `/api` do portu 4190.

### PWA

- `scripts/generate-sw.mjs` po buildzie generuje `dist/sw.js` na podstawie rzeczywistych zasobów.
- `public/manifest.webmanifest`, `public/icon-192.png` i `public/icon-512.png` zapewniają manifest instalacyjny.
- `netlify.toml` publikuje `dist` i ustawia właściwe nagłówki cache.

## 5. Najważniejsze pliki

| Plik | Rola |
|---|---|
| `src/App.tsx` | Główny orkiestrator, routing UI, warstwy, procesy i integracja stanu. |
| `src/ApprovedDocuments.tsx` | Najnowszy zatwierdzony moduł Dokumenty. |
| `src/approved-design.css` | Geometria i język wizualny dwóch zatwierdzonych ekranów. |
| `src/domain.ts` | Model danych, scenariusze, walidacja, potwierdzenia i asystent. |
| `src/storage.ts` | Store `localStorage` per persona. |
| `src/attachments.ts` | Bezpieczny zapis i pobieranie lokalnych załączników z IndexedDB. |
| `src/navigation.ts` | Walidowana historia przeglądarki i odtwarzanie warstw. |
| `src/CaseHub.tsx` | Lista spraw i uruchamianie sytuacji życiowych. |
| `src/PrivacyHub.tsx` | Zgody, minimalizacja danych i historia dostępu. |
| `src/ProcessRoute.tsx` | Statusy i dalsze działania w zapisanym pakiecie sprawy. |
| `src/DigitalCard.tsx` | Karty pozostałych dokumentów. |
| `server/index.mjs` | Lokalny serwer HTTP asystenta. |
| `server/assistant.mjs` | Provider demo i adapter modelu kompatybilnego. |
| `scripts/generate-sw.mjs` | Generowanie service workera. |
| `scripts/qa-approved.mjs` | Zrzuty nowego designu z działającego preview na porcie 4173. |
| `tests/` | Testy domeny, plików, nawigacji, backendu, SW i starsze E2E. |
| `docs/screenshots/approved-*.png` | Aktualne zrzuty nowego designu. |
| `docs/ASSETS.md` | Pochodzenie portretów i ryzyko licencyjne godła z ZIP-a. |
| `docs/AI-INTEGRATION.md` | Kontrakt backendu; ma jedną nieaktualną wzmiankę opisaną niżej. |

## 6. Ostatnie zmiany

1. Dodano `src/ApprovedDocuments.tsx` i `src/approved-design.css`.
2. Główny ekran `home` zastąpiono zatwierdzonym ekranem wyboru dokumentów.
3. Stary szczegół dokumentu zastąpiono `ApprovedDocument`.
4. Dodano Kartę Dużej Rodziny jako dokument o identyfikatorze `4`.
5. Dodano `documentIds?: number[]` do stanu obywatela i katalog dokumentów zapisujący wybór per profil.
6. Zakres walidacji `documentId` i `shareDocumentId` rozszerzono z `0–3` do `0–4` w kliencie, historii oraz backendzie.
7. Dodano fikcyjny PESEL do profili oraz wszystkie wymagane pola widoczne na mDowodzie.
8. Dodano `public/eagle-outline.svg`, wykonany z lokalnego wektorowego zasobu godła.
9. Zachowano wcześniej podmienione logo `public/icon-mobywatel.svg` zgodnie z poleceniem użytkownika.
10. Dodano `scripts/qa-approved.mjs` i cztery zrzuty `approved-*`.

## 7. Niedokończone zadania — kolejność zalecana

### P0 — domknąć zatwierdzony design

1. Otworzyć i porównać obok siebie oba screenshoty implementacji oraz oba obrazy referencyjne. Zrzuty zostały już wykonane, ale ostatnia runda ręcznej korekty nie nastąpiła.
2. Poprawić wysokość i pionową kompozycję na 320 px oraz w ramce desktopowej, aby `Dodaj` nie wpadał pod dolną nawigację.
3. Dopracować ekran szczegółu tak, aby karta asystenta i dolne działania miały zamierzony rytm oraz nie wyglądały na przypadkowo ucięte.
4. Dodać rzeczywiste shared-layout przejście z karty mDowodu w hero/liście do `ApprovedIdentity`. Szczegół ma `layoutId`, ale karty źródłowe jeszcze go nie mają.
5. Dopracować proporcje hero, typografię, godło, cienie i pastelowe faktury na podstawie bezpośredniego porównania z referencją.

### P0 — nowe testy regresyjne

1. Dodać `tests/e2e/approved.spec.ts` dla:
   - czterech dokumentów i wszystkich szczegółów;
   - widoczności obowiązkowych danych mDowodu;
   - `Dodaj`/`Zarządzaj`, zapisu po reloadzie i izolacji profili;
   - powrotu UI i browser back wraz z zachowaniem scrolla;
   - udostępnienia i powrotu do dokumentu;
   - viewportów 390 × 844 i 320 × 740 bez poziomego overflow;
   - braku błędów konsoli.
2. Zaktualizować lub usunąć wyłącznie nieaktualne założenia w `experience.spec.ts`, `native.spec.ts` i `wallet2.spec.ts`. Nie usuwać testów scenariuszy urzędowych.
3. Uruchomić pełne `npm run test:e2e`, nie tylko testy Node.

### P1 — dostępność i jakość interakcji

1. Dodać focus trap, focus początkowy, przywracanie focusu i `inert` tła dla katalogu dokumentów. Obecny portal ma `role=dialog` i Escape, ale nie pełną obsługę klawiatury.
2. Dodać `aria-current` do aktywnej pozycji `CivicNav`.
3. Sprawdzić cały nowy moduł klawiaturą i czytnikiem ekranu.
4. Sprawdzić zachowanie zwiększonego tekstu w zatwierdzonym ekranie, nie tylko w starszych widokach.

### P1 — spójność domeny i dokumentacji

1. Ujednolicić `home` i stare `documents`. Obecnie istnieją dwa widoki dokumentów, a dolna nawigacja prowadzi wyłącznie do `home`.
2. Rozszerzyć lub usunąć stare `searchDocuments`, które nadal zna tylko indeksy `0–3` i nie obejmuje Karty Dużej Rodziny.
3. Zaktualizować `README.md`, `docs/QA.md`, `docs/PRODUCT.md` i starsze raporty, które nadal przedstawiają stos/karuzelę jako aktualny interfejs.
4. W `docs/AI-INTEGRATION.md` zmienić nieaktualne `documentId (0–3)` na `0–4`.
5. Przejrzeć tekst udostępniania Karty Dużej Rodziny. Dziś korzysta z ogólnego zakresu `entitlement`, którego opis mówi o danych zdrowotnych i brzmi jak EKUZ.

### P2 — przed publikacją

1. Przetestować instalację PWA i restart offline na prawdziwym telefonie/przeglądarce.
2. Wykonać pełny audyt dostępności; nie deklarować jeszcze zgodności WCAG.
3. Rozstrzygnąć licencję i dopuszczalność `public/icon-mobywatel.svg` oraz pochodnego `eagle-outline.svg` przed publiczną publikacją.
4. Zbudować i opublikować statyczny `dist` na HTTPS, sprawdzić bez logowania w oknie prywatnym i dopiero potem przygotować zgłoszenie. Te działania wymagają osobnej decyzji użytkownika.

## 8. Znane błędy i ryzyka

- **320 × 740:** na aktualnym `approved-small.png` lista kończy się na Karcie Dużej Rodziny, a przycisk `Dodaj` jest poniżej pierwszego widoku. Nie jest to poziomy overflow, ale odbiega od zatwierdzonej kompozycji.
- **Desktop:** na `approved-desktop.png` górna część przycisku `Dodaj` jest widoczna, lecz jego dół zasłania dolna nawigacja telefonu.
- **Szczegół dokumentu:** na `approved-identity.png` karta kontekstowa asystenta jest częściowo zasłonięta przez dolną nawigację przy początkowej pozycji scrolla.
- **Animacja obiektu:** `ApprovedIdentity` ma `layoutId`, ale karta mDowodu w hero/liście nie ma dopasowanego identyfikatora; przejście nie jest jeszcze prawdziwym shared-element transition.
- **Katalog dokumentów:** Escape działa, ale dialog nie przejmuje pełnego focusu, nie zamyka tła przez `inert` i nie przywraca focusu w sposób jawny.
- **Nawigacja:** aktywna pozycja jest oznaczana klasą wizualną, ale nie przez `aria-current`.
- **Duplikacja modułu:** `home` jest nowym ekranem Dokumentów, zaś starszy `documents` pozostaje w kodzie i historii. To zwiększa ryzyko rozbieżności.
- **Udostępnianie KDR:** tekst zakresu jest odziedziczony z ogólnego uprawnienia/karty i wspomina o braku danych zdrowotnych, co nie pasuje do Karty Dużej Rodziny.
- **Dokumentacja:** README i kilka raportów opisują starszy Portfel jako główny ekran. Nie traktować ich jako aktualnego source of truth dla UI.
- **E2E:** stare testy portfela prawdopodobnie nie przejdą bez aktualizacji selektorów i oczekiwań; nie wolno na tej podstawie uznać scenariuszy domenowych za zepsute.
- **PWA offline:** testy kodu service workera przechodzą, ale instalacja i pełny restart offline na fizycznym urządzeniu pozostają niepotwierdzone.
- **Zależności developerskie:** ostatni pełny audyt w `docs/QA.md` opisywał ostrzeżenia `picomatch`/Vite w narzędziach developerskich; runtime miał 0 znanych podatności. Stan należy ponownie sprawdzić przed publikacją.
- **Licencja godła:** asset z referencyjnego ZIP-a nie jest automatycznie objęty licencją MIT kodu referencji.

## 9. Uruchomienie

Wymagane: Node.js 24+ i npm.

```powershell
cd C:\Users\piotr\Documents\ChatGPT\Mobywatel
npm ci
npm run dev
```

Następnie otworzyć `http://localhost:5173`. Parametr `?approved=1` był używany przez skrypt QA, ale aktualny kod nie uzależnia od niego renderowania designu.

Build produkcyjny i preview:

```powershell
npm run build
npm run preview
```

Preview działa pod `http://localhost:4173`.

Testy logiki:

```powershell
npm test
```

Testy przeglądarkowe:

```powershell
npx playwright install chromium
npm run test:e2e
```

Playwright uruchamia własne serwery na portach 4183 i 4184. Nie uruchamiać równolegle dwóch zestawów E2E na tych samych portach.

Zrzuty zatwierdzonego designu wymagają wcześniej działającego preview na porcie 4173:

```powershell
npm run build
npm run preview
# w drugim terminalu
node scripts/qa-approved.mjs
```

Opcjonalny backend asystenta:

```powershell
npm run server
$env:VITE_ASSISTANT_MODE='server'
npm run dev
```

Backend słucha na `127.0.0.1:4190`. Konfiguracja modelu kompatybilnego znajduje się w `server/.env.example`; sekretów nie wolno umieszczać w zmiennych `VITE_*`.

## 10. Zasady dalszej pracy

- Nie tworzyć nowej koncepcji UI. Zatwierdzone grafiki są nadrzędne.
- Nie usuwać spraw, profili, zapisu, asystenta, historii zgód ani udostępniania danych podczas prac wizualnych.
- Nie wpisywać danych z mockupu na stałe; korzystać z bieżącej persony.
- Nie twierdzić, że aplikacja wykonuje operacje urzędowe, analizuje prawnie dowolne pismo lub korzysta z prawdziwego mDowodu.
- Nie publikować, nie wysyłać formularza konkursowego i nie uruchamiać płatnych modeli bez wyraźnej zgody użytkownika.
- Każde domknięcie UI poprzeć faktycznym screenshotem, porównaniem z referencją, testem na 390 px i mniejszym viewportem oraz regresją scenariuszy.
