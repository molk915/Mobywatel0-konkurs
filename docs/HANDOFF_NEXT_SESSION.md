# mObywatel Razem — przekazanie projektu do następnej sesji

**Aktualizacja z 26 listopada 2026 r.** Bieżący stan wdrożenia i najnowsze ustalenia opisuje [przekazanie prac UI/UX](HANDOFF_UI_UX.md). Do rozpoczęcia kolejnej sesji służy [gotowy prompt](PROMPT_UI_UX.md). Poniżej znajduje się zapis stanu z 20 listopada.

**Stan na 20 listopada 2026 r.** Dokument obejmuje stan działającego prototypu i propozycję kolejnej iteracji. Redesign opisany niżej czeka na implementację. Katalog projektu na komputerze Piotrka to `C:\Users\piotr\Documents\ChatGPT\Mobywatel`.

## 1. Projekt i cel konkursowy

mObywatel Razem to interaktywny prototyp konkursowy rozwijający ideę aplikacji obywatelskiej. Najważniejszy problem to przygotowanie sprawy, z którą właściciel potrzebuje pomocy. Ewa zaprasza zaufaną osobę do jednej sprawy i ustala zakres dostępu. Kacper przygotowuje konkretne elementy, takie jak formularz, uzasadnienie i załącznik albo plan wizyty. Ewa podejmuje decyzję o przygotowanym wyniku, może odesłać go do poprawy i może cofnąć dostęp. Zdarzenia i decyzje pozostają w historii. Zasada produktu brzmi „Jedna sprawa. Dwie osoby. Pełna kontrola”.

Flagowy scenariusz konkursowy to pismo urzędowe z wezwaniem do uzupełnienia dokumentu. Zdrowie stosuje ten model do skierowania i planowania wizyty. Rodzina pokazuje przygotowanie paszportu Zosi oraz zgodę drugiego opiekuna. Portfel, Asystent, powiadomienia i Dane uzupełniają te procesy. Profile i dokumenty zawierają dane przykładowe. Zatwierdzenie zapisuje wynik wewnątrz prototypu. Integracje z urzędem, IKP i placówkami oraz skutki prawne są poza zakresem.

## 2. Stan techniczny i mapa kodu

### Repozytorium i narzędzia

- React 19.2, TypeScript 5.9, Vite 8.3, CSS, Motion, Lucide, lokalna czcionka Inter i biblioteka `qrcode`. Backend to Node i `node:http`. Środowisko użyte przy przekazaniu miało Node `24.19.0` i npm `11.6.0`.
- `src/` zawiera klienta, `server/` backend, `public/` zasoby i manifest, `scripts/` między innymi generator service workera, `tests/` testy Node i `tests/e2e/` testy Playwright. `dist/` to wynik buildu, a `docs/screenshots/` zawiera zrzuty z różnych iteracji.
- W chwili przekazania `git status` pokazywał pliki projektu jako nieśledzone, a lokalna gałąź `master` nie miała żadnego commita. Przy następnym wejściu ponownie sprawdź stan. Zachowaj zastane pliki i zmiany. Uzyskaj punkt odniesienia przed refaktoryzacją, ponieważ sam `git diff` w obecnym stanie nie udokumentuje zmian w nieśledzonych plikach.

### Nawigacja i serwowanie aplikacji

- [src/main.tsx](../src/main.tsx) montuje aplikację i obsługuje tryb testowy współpracy. Normalny adres `/` otwiera aplikację. `/?pokaz=most` otwiera odseparowany tryb dwóch telefonów, a jego ramki mają osobne konteksty sesji. Bieżący obieg Zdrowia działa w zwykłej aplikacji.
- [src/App.tsx](../src/App.tsx) składa zakładkę, warstwy szczegółów, bieżący profil, projekcję spraw, wspólną skrzynkę i trasy wejściowe zaproszeń. [src/navigation.ts](../src/navigation.ts) opisuje typy warstw i odtwarza dozwolony stan z historii przeglądarki na podstawie profilu i dostępnych danych. [src/CivicChrome.tsx](../src/CivicChrome.tsx) ustala obecne cztery pozycje dolnej nawigacji: **Dokumenty, Sprawy, Asystent, Dane**. Katalog Usług jest dziś warstwą otwieraną skrótem z Dokumentów.
- [server/index.mjs](../server/index.mjs) obsługuje `GET /api/health` jako kontrolę dostępności procesu, `POST /api/assistant` oraz osobne pary tras `/api/{most,family,wellness}/session` i `/api/{most,family,wellness}/case`. Sprawdza źródło żądania przez listę originów i `APP_ORIGIN`, typ i rozmiar JSON oraz limit żądań zapisu. [server/static.mjs](../server/static.mjs) opcjonalnie serwuje `dist` przy `SERVE_DIST=1`. Wersja produkcyjna rejestruje service worker tworzony przez [scripts/generate-sw.mjs](../scripts/generate-sw.mjs). Trasy `/api/` są pomijane przez service worker.

### Stan, sesje, role i synchronizacja

- [src/storage.ts](../src/storage.ts) zapisuje stan portfela, lokalnych spraw, zgód i rozmów podzielony na profile w `localStorage`. Wybór aktywnego profilu zapisuje również osobno dla karty w `sessionStorage`, z odczytem starszego ustawienia jako rezerwą. Lokalne pliki mają osobny mechanizm w [src/attachments.ts](../src/attachments.ts). Ich dodanie do lokalnej sprawy nie oznacza przekazania pliku między sesjami współpracy.
- Wspólne sprawy, Zdrowie i Rodzina mają osobne modele, reguły przejść i dane w pamięci procesu Node. Zastosowano losowe poświadczenia sesji, projekcje danych według roli i sprawdzanie uprawnień przy zapisie. W aplikacji normalnej linki z fragmentem `#most=…`, `#zdrowie=…` lub `#rodzina=…` otwierają właściwy kontekst. Hook przechowuje poświadczenie w `sessionStorage` i usuwa fragment z adresu po przejęciu. Osobny profil interfejsu nie zastępuje poświadczenia wymaganej roli.
- Hooki [wspólnych spraw](../src/most/session.ts), [Zdrowia](../src/health/session.ts) i [Rodziny](../src/family/session.ts) odczytują stan odpowiednio mniej więcej co 850 ms, 1 s i 1,5 s. Cofnięcie lub wygaśnięcie dostępu we wspólnych sprawach i Zdrowiu jest egzekwowane przez serwer przy następnym żądaniu. Widok pomocnika aktualizuje się po kolejnym odczycie. W decyzjach używane są identyfikatory bieżącej wersji przeglądanego pakietu, planu lub prośby.
- Właścicielska sesja wspólnej sprawy i sesja Rodziny trwają maksymalnie osiem godzin. Dostęp pomocnika do sprawy ma limit 10 minut od utworzenia zaproszenia. Zwykła sesja Zdrowia ma w kodzie limit 60 dni, a udzielony dostęp może trwać 5, 15 lub 60 minut. Limit czasu i odświeżanie karty są odrębne od trwałości procesu. Restart backendu usuwa dane współpracy.
- [src/Inbox.tsx](../src/Inbox.tsx) renderuje wspólną skrzynkę. `App.tsx` agreguje powiadomienia domenowe i przykładowe lokalne pismo dla profili innych niż Ewa. Stan przeczytania i widoczność zależą od źródła i roli. Moduł wspólnych spraw bierze zdarzenia z osi historii sprawy. Zdrowie obsługuje zdarzenia skierowań, wizyt, wyników, dostępu i przypomnień. Rodzina pokazuje między innymi prośbę o zgodę oraz decyzję opiekuna. Skrzynka prowadzi do odpowiedniej warstwy przez akcje modelu klienta.

## 3. Funkcjonalności i stan weryfikacji

**Działa** oznacza potwierdzoną ścieżkę w aktualnych testach. **Częściowo działa** oznacza działający zakres prototypu z nazwanym ograniczeniem. **Nie działa** oznacza brak danej możliwości w obecnej wersji. **Nie zweryfikowano** oznacza brak dowodu z aktualnych prób.

| Obszar | Stan i rzeczywiste działanie | Dowód, ograniczenia i miejsce w kodzie |
| --- | --- | --- |
| Dokumenty | **Działa.** Portfel profilu, mDowód, mPrawo jazdy, Moje pojazdy, Karta Dużej Rodziny, szczegóły dokumentów, katalog i dodawanie dokumentów do widoku. | `wallet2.spec.ts`, `app.spec.ts`, `civic-design.spec.ts`. Dane dokumentów są przykładowe. Skróty usług i spraw wypychają mDowód. Punkt wejścia to `App.tsx`, widok implementują [ApprovedDocuments.tsx](../src/ApprovedDocuments.tsx) i [DigitalCard.tsx](../src/DigitalCard.tsx). |
| Sprawy | **Częściowo działa.** Lista i liczniki łączą lokalne procesy, wspólne pismo, Zdrowie i Rodzinę. Można rozpocząć m.in. przeprowadzkę, ochronę po utracie portfela i pracę z pismem. | `app.spec.ts`, `native.spec.ts`, `most.spec.ts`, `wellness.spec.ts`. W `App.tsx` współdzielenie wpływa na to, czy własna sprawa jest w „Moje” lub „Wspólne”. Statusy i sortowanie są częściowo warunkowane na poziomie widoku. [CaseHub.tsx](../src/CaseHub.tsx) i [domain.ts](../src/domain.ts). |
| Wspólne sprawy | **Działa w zakresie prototypu.** Ewa zaprasza Kacpra, ogranicza odczyt i czynności, może poprosić o poprawki, odrzucić, zatwierdzić lub cofnąć dostęp. Kacper zapisuje adres i uzasadnienie, wybiera przykładowy załącznik albo prosi Ewę o kopię. Serwer sprawdza kompletność i zamraża pakiet do decyzji. | `most.test.mjs` i `most.spec.ts`. Załączniki w tym scenariuszu są wskazaniami przykładowych kopii. Zaproszenie ma stały limit czasu i wymaga ręcznego przekazania linku albo QR. Brak trwałości po restarcie. [MostOwner.tsx](../src/most/MostOwner.tsx), [MostHelper.tsx](../src/most/MostHelper.tsx), [MostWork.tsx](../src/most/MostWork.tsx), [model.ts](../src/most/model.ts), [server/most.mjs](../server/most.mjs). |
| Zdrowie | **Działa.** Historia z filtrami i wyszukiwaniem, recepty, skierowania, wyniki do pobrania, wizyty i upoważnienia. Można samodzielnie przygotować wizytę lub zlecić jej zaplanowanie. Zatwierdzony plan pojawia się w terminarzu. Można udostępnić pojedynczy wynik lub informacje o wizycie, cofnąć uprawnienie i zaplanować przypomnienie. | `wellness.test.mjs` i `wellness.spec.ts`. Placówki, terminy i dokumenty to dane przykładowe, a terminarz jest wewnętrzny. Przypomnienia są w aplikacji. [HealthWorkspace.tsx](../src/health/HealthWorkspace.tsx), [model.ts](../src/health/model.ts), [server/wellness.mjs](../server/wellness.mjs). |
| Rodzina | **Działa.** Aleksandra przygotowuje sprawę paszportu Zosi. Tomasz podejmuje decyzję w osobnej sesji, a obie strony widzą wynik z zakresem odpowiednim dla roli. Zosia ma ograniczony odczyt. | `family.test.mjs` i `family.spec.ts`. Formularz ma ustalone opcje. Wynik kończy przygotowanie wniosku wewnątrz aplikacji. Dane sprawy są w pamięci. [FamilyWorkspace.tsx](../src/family/FamilyWorkspace.tsx), [model.ts](../src/family/model.ts), [fixtures.ts](../src/family/fixtures.ts), [server/family.mjs](../server/family.mjs). |
| Asystent | **Częściowo działa.** Domyślny `DemoAssistant` udostępnia przykładowe odpowiedzi i prowadzi do działań. Wspólna sprawa i Zdrowie mają własne kontekstowe wejścia do wyjaśnienia lub przygotowania. | `domain.test.ts`, `server.test.mjs`, `experience.spec.ts` i `wellness.spec.ts`. Opcjonalny backend wymaga `VITE_ASSISTANT_MODE=server`, a dostawca zgodny z OpenAI wymaga osobnej konfiguracji. Jakość rzeczywistego modelu **nie została zweryfikowana** w ostatnim przebiegu. `App.tsx`, `domain.ts`, [server/assistant.mjs](../server/assistant.mjs). |
| Powiadomienia | **Częściowo działa.** Jedna skrzynka, licznik, stan przeczytania i przejścia do pisma, planu lub zgody. | `experience.spec.ts` i testy domenowe. Osobne źródła zdarzeń i różne przejścia powrotne. Zaproszenia pojawiają się w sesji po otwarciu linku. Push i zewnętrzne doręczenie zaproszenia **nie działają**, ponieważ prototyp ich nie implementuje. `Inbox.tsx`, `App.tsx` i handlery domen. |
| Dane i uprawnienia | **Częściowo działa.** Lokalne udostępnienia, historia i cofnięcie zgód. Uprawnienia we wspólnych sprawach i Zdrowiu są egzekwowane w odpowiednich sprawach. | `experience.spec.ts`, `most.test.mjs`, `wellness.test.mjs`. Dane nie tworzą dziś jednolitego widoku dostępu do spraw, dokumentów zdrowotnych i lokalnych zgód. [PrivacyHub.tsx](../src/PrivacyHub.tsx), `App.tsx`, `domain.ts` oraz handlery. |

**Nie działa obecnie** odtworzenie współdzielonej sprawy po restarcie procesu. **Nie zweryfikowano** publicznego wdrożenia, bieżącego adresu po dawnym uruchomieniu na porcie 4195, obsługi wszystkich fizycznych urządzeń ani wyników badań użyteczności. Działa odświeżenie w granicach aktywnej sesji serwera, co potwierdzają testy.

## 4. Ostatnia weryfikacja

W trakcie audytu **20 listopada 2026 r.** uruchomiono `npm.cmd run build`, `npm.cmd test` i `npm.cmd run test:e2e -- --workers 2`. Build przeszedł, **34 testy Node i 34 testy Playwright przeszły**, a przeglądarkowy przebieg trwał około 1,8 minuty. Vite ostrzegł o głównym pakiecie JS około 526 kB po minifikacji, około 165 kB po gzip. To ostrzeżenie, a wynik buildu był poprawny.

Testy objęły dwa konteksty przeglądarki dla pisma, Zdrowia i Rodziny, odmowę zgody, cofnięcie dostępu i odmowę żądań, część ścieżek poprawki i odrzucenia, odświeżenie, powiadomienia, profil w odrębnych kartach, testowy tryb dwóch telefonów, lokalne dokumenty, formularze i tryb offline PWA. W pokrytych ścieżkach użyto widoków 320, 375, 390 i 430 px. Bieżący zestaw nie dowodzi zrozumienia nawigacji przez nowych użytkowników ani pełnej zgodności dostępności. Starsze liczby z poprzednich iteracji i starsze zrzuty traktuj jako archiwum. W sesji przekazania zapisano dokumentację na podstawie tej weryfikacji.

## 5. Problemy UX i produktowe

| Problem | Przyczyna w aktualnym produkcie | Proponowane rozwiązanie |
| --- | --- | --- |
| mDowód jest wypchnięty niżej. | `App.tsx` wstawia do Dokumentów skróty Usługi, pismo i skierowanie. Poniżej dokumentów znajduje się też ostatnia aktywność. | Umieścić mDowód jako pierwszą treść portfela. Przenieść zadania do Spraw i globalnego dzwonka. Katalog dostałby własną zakładkę. |
| Usługi, Zdrowie i Rodzinę trzeba odszukiwać różnymi ścieżkami. | Katalog jest warstwą Dokumentów, Zdrowie ma również wejście w Sprawach, a Rodzina w części „Wspólne”. | Usługi jako stałe miejsce przeglądania usług. Link z istniejącej sprawy lub powiadomienia kieruje wprost do właściwego wyniku, skierowania lub profilu dziecka. |
| „Moje” i „Wspólne” mieszają rolę i udostępnienie. | `CaseHub.tsx` filtruje pole `shared` wyliczane w `App.tsx`. Własna sprawa może zmienić listę po zaproszeniu. | **Moje** według odpowiedzialności właściciela, **Pomagam** według roli pomocnika. Udostępnienie pozostaje statusem sprawy. |
| „Pomoc bliskiej osobie” jest przewidywalna tylko ze znajomością sesji. | Ten sam kafelek kieruje do pisma, zadania zdrowotnego albo wyboru profilu. | Usuń kafelek. Zlecanie zaczyna się w konkretnej sprawie, a przyjmowanie i wznawianie odbywa się w „Pomagam” oraz z dzwonka. |
| Trudno ustalić, czyja jest kolej na działanie. | Stany pochodzą z kilku modeli. Licznik pakietu opisuje trzy kroki pakietu jako kroki w zakresie pomocnika, choć zakres może być węższy. | Wyświetlać osobno gotowość pakietu, zadania przypisane i to, czego oczekujemy od drugiej osoby. Używać komunikatów takich jak „Czekam na dokument od Ewy”. |
| Odrzucenie i akceptacja dominują nad poprawkami. | Stopka pokazuje „Odrzuć pakiet” obok „Zatwierdź pakiet”, a formularz poprawki jest niżej w treści. | Najpierw pokazać dane, dokument i skutek. Udostępnić „Zatwierdź pakiet” i „Poproś o poprawki” w przewidywalnym miejscu. Odrzucenie otrzymuje osobne potwierdzenie. |
| Duża gęstość kart i różne wzorce między modułami. | Status, następna akcja, opis i wejścia konkurują o miejsce na osobnych powierzchniach. | Zwarte wiersze dla list, jeden wyróżniony krok na końcu bieżącej decyzji i wspólne elementy układu szczegółów. Zachować wyróżniającą się kartę mDowodu. |
| Niepewny powrót między sprawą, usługą i powiadomieniem. | Część przejść korzysta z warstwy i historii, a część ekranów ma własne reguły powrotu. | Zdefiniować źródło wejścia. Z powiadomienia przechodzić bezpośrednio do właściwej czynności, a z Asystenta wracać do tych samych szczegółów i zapisanego formularza. |
| Przebieg pokazu zależy od kalendarza i działania procesu. | Termin pisma jest na stałe ustawiony na **27 listopada 2026** w `src/most/model.ts`, a współdzielony stan jest w RAM. | Użyć dat względem kontrolowanego zegara scenariusza. Dodać trwały zapis i zweryfikować restart oraz odzyskanie sprawy przed publikacją. |

## 6. Wizja redesignu

| Zakładka docelowa | Zawartość i zasada |
| --- | --- |
| **Dokumenty** | mDowód na początku, potem pozostałe dokumenty i zarządzanie portfelem. |
| **Sprawy** | **Moje** i **Pomagam**, następnie zadania do wykonania, sprawy w toku i historia. Wiersz zawiera tytuł, następny krok, odpowiedzialną osobę i istotny termin. Status współdzielenia jest informacją w tej samej sprawie. |
| **Usługi** | Katalog Zdrowia, Rodziny i wejść do procesów takich jak przeprowadzka. Bez skrótu „Pomoc bliskiej osobie” o zmiennym znaczeniu. |
| **Dane** | Lokalne zgody, dostęp do spraw i wyników zdrowotnych oraz historia. Przy każdym uprawnieniu odbiorca, zakres, termin, przejście do źródłowej sprawy i cofnięcie. |

Asystent otwiera się kontekstowo z pisma, dokumentu lub skierowania i zachowuje drogę powrotną. Dla rozmowy bez kontekstu przewidzieć jawne **Otwórz asystenta** w katalogu Usług. To propozycja uzupełniająca audyt, która utrzymuje ogólną rozmowę po zwolnieniu miejsca w dolnej nawigacji. Powiadomienia pozostają pod globalnym dzwonkiem.

Kierunek **Midnight Titanium** oznacza bardzo ciemny granat, grafit i oszczędny akcent bordowo-różowy. Zachować dużego orła i fakturę mDowodu, ciemne powierzchnie, czytelną typografię Inter oraz dopracowanie na wzór aplikacji natywnych. Przebudować zagęszczenie list, typografię drugiego poziomu, odstępy, kolejność akcji i zachowanie stopek. Wspólny system powinien definiować powierzchnie, linie, statusy, pola, rozmiary obszarów dotykowych, komunikaty błędów i fokus. Ruch ma wspomagać przejście. Przy `prefers-reduced-motion`, szerokości 320 px i powiększonym tekście wszystkie czynności pozostają dostępne.

## 7. Plan dalszych prac

| Etap | Cel i pliki | Wymagania oraz kryteria ukończenia | Weryfikacja |
| --- | --- | --- | --- |
| **P0.1 Nawigacja i Dokumenty** | `CivicChrome.tsx`, `App.tsx`, `navigation.ts`, `ApprovedDocuments.tsx`, `CaseHub.tsx`. | Wprowadzić cztery docelowe pozycje. Portfel otwiera się z mDowodem bez ogólnych zadań nad nim. Katalog usług ma stałe wejście. Własna sprawa pozostaje w „Moje” po zaproszeniu. Pomocnik odnajduje zadanie w „Pomagam”. | Testy nawigacji i profili, odświeżenie i Wstecz, zrzuty portfela, Spraw i Usług przy 320 i 430 px. |
| **P0.2 Ciągłość przed publikacją** | `server/index.mjs`, `server/{most,family,wellness}.mjs`, `src/most/model.ts` i warstwa przechowywania, jeśli zostanie wybrana. | Użyć zegara możliwego do kontrolowania w testach i dat względem początku scenariusza. Zaprojektować trwałość współdzielonych spraw, historii i metadanych dostępu. Zachować ograniczenie zakresu, atomowość decyzji i jawny reset scenariusza testowego. | Testy zegara przed i po terminie. Restart procesu z aktywną sprawą, ponowny odczyt z dwóch sesji oraz odmowa dostępu dla cofniętego lub wygasłego poświadczenia. |
| **P1.1 Główny obieg współpracy** | `src/most/MostOwner.tsx`, `MostHelper.tsx`, `MostWork.tsx`, `model.ts` i odpowiednie testy. Backend zmieniać tam, gdzie zachowanie tego wymaga. | Skrócić pierwszy ekran do wymaganego wyniku, terminu i wyboru pomocy. Przed zaproszeniem pokazać zakres i czas. Widok pomocnika rozróżnia zadania przypisane i kompletność całego pakietu. Decyzja pokazuje dane, załącznik, skutek oraz trzy możliwe rozstrzygnięcia. | Pismo od powiadomienia do decyzji w dwóch sesjach, próba zapisu poza zakresem, poprawki, odrzucenie, cofnięcie przed decyzją, ponowienie żądania, odświeżenie. |
| **P1.2 Zdrowie, Rodzina, Asystent, Dane i skrzynka** | `HealthWorkspace.tsx`, `FamilyWorkspace.tsx`, `PrivacyHub.tsx`, `Inbox.tsx`, `App.tsx`, `navigation.ts` i modele domenowe. | Zastosować ten sam wzorzec następnego kroku do skierowania i profilu dziecka. Wyprowadzić spójny widok uprawnień w Danych z bieżących źródeł. Zachować stan przeczytania. Powiadomienia i oba wejścia do Asystenta mają poprawny powrót. Przy wygasłej sprawie pokazać odpowiedni stan i bezpieczne wyjście. | Testy skierowania, paszportu, przejść ze skrzynki, dostępu z Danych i powrotu do szkicu. Przetestować osobno role właściciela, pomocnika i dziecka. |
| **P2 Spójność wizualna i dostępność** | `civic-system.css`, `approved-design.css`, `most/most.css`, `health/health.css`, `family/family.css` i komponowanie warstw. | Wspólne wiersze, powierzchnie, odstępy i hierarchia. Każdy ekran ma jedno dominujące działanie. Pełna czytelność przy powiększeniu, bez zasłaniania pól przez stopki. | Zrzuty 320, 375, 390 i 430 px, klawiatura, widoczny fokus, powiększenie, tryb ograniczonego ruchu i próba na rzeczywistym telefonie. |
| **P3 Udostępnienie i usprawnienia** | `server/static.mjs`, `server/index.mjs`, `vite.config.ts`, `netlify.toml`, dokumentacja wdrożenia. | Po spełnieniu warunków P0 wystawić frontend i API pod tym samym originem HTTPS. Narzędzie dwóch telefonów pozostawić odseparowane. Sprawdzić zachowanie przy wielokrotnych próbach oraz po restarcie. Optymalizować pakiet na podstawie pomiaru. | Smoke test rzeczywistej domeny, czyste i powracające profile, zaproszenie otwarte na dwóch urządzeniach, zapis decyzji, cofnięcie i restart. |

Zachowaj obecne testy uprawnień i reguły domenowe. Najpierw ujednolić to, jak sprawy są prezentowane i adresowane. Zmiany modeli wprowadzać etapami, gdy konkretny problem wymaga zmiany danych. Przed publicznym pokazem przeprowadzić krótki test bez instrukcji: użytkownik samodzielnie odnajduje wezwanie, rozumie wymagany dokument, deleguje zadanie i potrafi wyjaśnić skutek zatwierdzenia.

## 8. Scenariusze end-to-end

### A. Pismo Ewy i przygotowanie pakietu przez Kacpra

1. **Dziś.** Wybierz profil Ewy. Otwórz „Masz nowe pismo z urzędu” z dzwonka. Ewa może wejść w pełne pismo albo użyć „Wyjaśnij pismo”.
2. Użyj **Poproś o pomoc**, sprawdź pola zakresu i utwórz zaproszenie. Otwórz link w niezależnym kontekście. Przy wznowieniu pomocnik korzysta z obecnego **Sprawy → Wspólne**.
3. Kacper zapisuje adres i uzasadnienie, dołącza przykładową kopię albo prosi Ewę o dokument i dołącza udostępnioną kopię. Przekazuje kompletny pakiet do zatwierdzenia.
4. Ewa otwiera powiadomienie o gotowym pakiecie. Sprawdza dane i plik, wybiera decyzję. Wynik jest widoczny w statusie sprawy, w historii Ewy oraz w powiadomieniach Kacpra właściwych dla jego roli. Cofnięcie dostępu z **Zakończ współpracę** blokuje następne żądania pomocnika.
5. **Docelowo.** Pismo pozostaje w „Moje” przez cały cykl. Kacper wraca przez „Pomagam”. Pierwszy ekran odpowiada na pytania o wymaganie, termin i możliwe działania. Decyzja jasno opisuje zapis wyniku w aplikacji. Poprawki są widoczną opcją, a odrzucenie otrzymuje potwierdzenie.

### B. Skierowanie Ewy i plan wizyty

1. **Dziś.** Otwórz skierowanie okulistyczne z dzwonka, **Sprawy → Zdrowie** lub katalogu. Ewa może sama zorganizować wizytę albo wybrać **Poproś o pomoc** i ustawić zakres oraz czas.
2. Otwórz link Kacpra niezależnie. Kacper widzi dane w ustalonym zakresie, wybiera placówkę, termin i przygotowania, a następnie przekazuje plan. Zapisany plan można przywrócić po odświeżeniu.
3. Ewa otwiera powiadomienie i sprawdza plan. Akceptacja dodaje wizytę do **Wizyty → Nadchodzące**. Można zwrócić plan do poprawy, odrzucić go albo zakończyć udostępnienie w Upoważnieniach.
4. **Docelowo.** Wejście katalogowe to **Usługi → Zdrowie**, a wiersz w Sprawach otwiera konkretne skierowanie lub decyzję. Status skierowania, planu i wizyty pochodzi ze spójnego przebiegu. Zakres można sprawdzić też w Danych.

### C. Paszport Zosi i zgoda Tomasza

1. **Dziś.** Wybierz Aleksandrę i otwórz **Sprawy → Wspólne → Moja rodzina** lub **Usługi → Rodzina**. Klient uruchamia sesję po wejściu. Otwórz profil Zosi lub ekran przygotowania do wyjazdu i przejdź do sprawy paszportu.
2. Wybierz cel podróży i punkt paszportowy, zapisz wniosek, sprawdź zakres i poproś Tomasza o zgodę. Otwórz link Tomasza z ekranu zaproszeń w innym kontekście.
3. Tomasz otwiera prośbę i akceptuje albo odmawia. Obie role widzą decyzję i historię w udostępnionym zakresie. Odmowa umożliwia Aleksandrze aktualizację danych i ponowienie prośby.
4. **Docelowo.** Profil Zosi jest przewidywalnym początkiem w **Usługi → Rodzina**, a rozpoczęta sprawa ma stałe miejsce w Sprawach. Powiadomienie Tomasza prowadzi do decyzji bez dodatkowego szukania.

### D. Powiadomienie i właściwa czynność

1. **Dziś.** Zdarzenie domenowe pojawia się w skrzynce dostępnej z dzwonka. Użytkownik otwiera pozycję, a aplikacja zapisuje odczyt w odpowiednim źródle i otwiera pismo, plan wizyty albo zgodę. Wybrane testy pokrywają odświeżenie i utrzymanie odczytu.
2. **Docelowo.** Tytuł mówi, jaka czynność jest teraz potrzebna. Pozycja ma stabilne odwołanie do sprawy i decyzji. Po odświeżeniu, zamknięciu, wygaśnięciu lub cofnięciu dostępu prowadzi do aktualnego, dozwolonego widoku, z przewidywalnym powrotem do skrzynki. Listę, plakietkę i ekran sprawy weryfikować razem dla obu ról.

## 9. Uruchomienie i testy

W PowerShell przejdź do katalogu projektu. Użyj Node 24. Polecenia `npm.cmd` odpowiadają skryptom z [package.json](../package.json). Użyj przeglądarki Chromium Playwright, a jej instalację wykonaj jednorazowo, jeśli nie ma jej w środowisku.

```powershell
Set-Location -LiteralPath 'C:\Users\piotr\Documents\ChatGPT\Mobywatel'
node --version
npm.cmd ci
npx.cmd playwright install chromium
```

Development w dwóch terminalach, oba z katalogu projektu.

```powershell
# Terminal 1
npm.cmd run server

# Terminal 2
npm.cmd run dev
```

- Normalna aplikacja: [127.0.0.1:5173](http://127.0.0.1:5173/). Vite przekazuje `/api/` do `127.0.0.1:4190`. Stan procesu: [127.0.0.1:4190/api/health](http://127.0.0.1:4190/api/health). W dev port wynika z [vite.config.ts](../vite.config.ts).
- Dwie role w zwykłym interfejsie: otwórz właściciela w jednym kontekście, utwórz zaproszenie i otwórz jego link w drugim profilu przeglądarki lub oknie prywatnym. Pozostaw oba konteksty otwarte i sprawdź przygotowanie, decyzję, dzwonek i cofnięcie bez ręcznego odświeżania.
- Tryb testowy dwóch telefonów: [127.0.0.1:5173/?pokaz=most](http://127.0.0.1:5173/?pokaz=most). Do próby na dwóch urządzeniach w zaufanej sieci użyj na obu tego samego adresu LAN frontendu i ustaw ten origin w `APP_ORIGIN` procesu Node. Loopback wskazuje osobno na każde urządzenie.

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run test:e2e -- --workers 2
# W razie potrzeby pojedyncza ścieżka
npm.cmd run test:e2e -- tests/e2e/most.spec.ts
```

Playwright według [playwright.config.ts](../playwright.config.ts) uruchamia lub ponownie wykorzystuje backend na 4190, frontend dev na 4183 i podgląd buildu na 4184. Wykonaj build przed E2E. Przed przebiegiem upewnij się, że na tych portach nie pozostały starsze procesy, ponieważ konfiguracja może je ponownie wykorzystać. Zwykłe `npm.cmd run preview` używa domyślnego portu 4173 i nadal potrzebuje backendu na 4190 dla współpracy.

Lokalny podgląd produkcyjny z klientem i API w jednym procesie, przykładowo na porcie używanym uprzednio w projekcie.

```powershell
npm.cmd run build
$env:PORT = '4195'
$env:BIND_HOST = '127.0.0.1'
$env:SERVE_DIST = '1'
$env:APP_ORIGIN = 'http://127.0.0.1:4195'
npm.cmd run server
```

Po uruchomieniu otwórz [127.0.0.1:4195](http://127.0.0.1:4195/). Na hostingu użyj właściwego `APP_ORIGIN` HTTPS i doprowadź frontend oraz `/api/` do tej samej usługi lub tego samego publicznego originu. [netlify.toml](../netlify.toml) zawiera build i publikację plików statycznych. Taka konfiguracja sama nie wystawia backendu potrzebnego w scenariuszach współpracy. Domyślny Asystent działa bez klucza do modelu. Szczegóły opcjonalnej konfiguracji są w [server/.env.example](../server/.env.example) i [AI-INTEGRATION.md](AI-INTEGRATION.md).

## 10. Pliki i odniesienia wizualne

- **Na początek:** [src/main.tsx](../src/main.tsx), [src/App.tsx](../src/App.tsx), [src/CivicChrome.tsx](../src/CivicChrome.tsx), [src/navigation.ts](../src/navigation.ts), [src/CaseHub.tsx](../src/CaseHub.tsx), [server/index.mjs](../server/index.mjs). Szczegółowe pliki domen są podlinkowane w sekcjach 2 i 3.
- **Testy:** [API wspólnych spraw](../tests/most.test.mjs), [Testy przeglądarkowe współpracy](../tests/e2e/most.spec.ts), [Zdrowie API](../tests/wellness.test.mjs), [Zdrowie E2E](../tests/e2e/wellness.spec.ts), [Rodzina E2E](../tests/e2e/family.spec.ts), [testy nawigacji](../tests/navigation.test.ts) i [testy układu](../tests/e2e/civic-design.spec.ts).
- **Dokumentacja:** [PRODUCT_OVERHAUL_AUDIT.md](PRODUCT_OVERHAUL_AUDIT.md), [MOST.md](MOST.md), [HEALTH.md](HEALTH.md), [FAMILY_MODULE.md](FAMILY_MODULE.md) i [README.md](../README.md). Starsze instrukcje mogą zawierać nazwy z wcześniejszych iteracji, np. dodatkowy przycisk wejścia jako Aleksandra. Porównuj z bieżącym kodem i testami.
- **Zrzuty obecnej implementacji:** [Dokumenty Ewy 430 px](screenshots/wellness-home-430.png), [katalog Usług](screenshots/wellness-services-430.png), [mDowód 390 px](screenshots/night-identity-390.png), [lista Spraw](screenshots/night-cases-390.png), [zakres współpracy 320 px](screenshots/delegation-scope-320.png), [decyzja Ewy](screenshots/delegation-review-390.png), [zadanie zdrowotne Kacpra](screenshots/wellness-shared-assignment.png), [zgoda opiekuna](screenshots/night-family-consent-390.png).
- **Referencja projektowa:** aktualny mDowód jako wzorzec Midnight Titanium. [ASSETS.md](ASSETS.md) opisuje pochodzenie zasobów. Starsze ekrany z `docs/screenshots/` dokumentują iteracje i wymagają sprawdzenia przed wykorzystaniem jako porównania. Zrzuty obecnej wersji są materiałem wyjściowym do redesignu.

## START HERE — NEXT CODEX SESSION

> Kontynuuj istniejący projekt mObywatel Razem w katalogu repozytorium. Przeczytaj cały `docs/HANDOFF_NEXT_SESSION.md`. Sprawdź rzeczywisty stan katalogu i Git, aktualne pliki oraz baseline testów. Zidentyfikuj zmiany po przekazaniu i zachowaj je. Korzystaj z ukończonego audytu, a dodatkowe dochodzenie ogranicz do nowych rozbieżności lub regresji.
>
> Zacznij od P0.1. Wprowadź **Dokumenty, Sprawy, Usługi, Dane**. Umieść mDowód na początku Dokumentów, skieruj działania do Spraw i uporządkuj „Moje” oraz „Pomagam” według roli. Zachowaj kontekstowego Asystenta i wejście do rozmowy ogólnej, działające zaproszenia i zakresy dostępu. Wdrażaj kolejne etapy zgodnie z priorytetem i jawnie oznaczaj, czego jeszcze nie wdrożono.
>
> Po każdym etapie uruchom właściwe testy. Przed przekazaniem uruchom build, Node i Playwright. Zweryfikuj na rzeczywistych zrzutach szerokości 320, 375, 390 i 430 px, kolejność treści, działanie stopek i powrót. Utrzymaj działające przepływy wspólnych spraw, Zdrowia i Rodziny oraz ograniczenia przykładowych danych. W raporcie podaj konkretne wyniki, ewentualne regresje i ścieżki do zrzutów. Publikację uzależnij od weryfikacji dat, trwałości oraz działania zwykłego wejścia i zaproszeń pod docelowym adresem.
