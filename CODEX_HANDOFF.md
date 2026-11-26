# mObywatel Razem — przekazanie projektu

## Cel produktu

mObywatel Razem to konkursowy prototyp mobilnego portfela dokumentów i obsługi spraw publicznych. Użytkownik ma dojść od powiadomienia lub pytania w czacie do wykonania operacji, statusu i potwierdzenia. Gdy potrzebuje wsparcia, może udostępnić wybraną sprawę bliskiej osobie. Właściciel określa zakres, może cofnąć dostęp i zachowuje wgląd w wynik. Pomocnik może przygotować sprawę do decyzji właściciela lub samodzielnie zakończyć dozwoloną operację.

Referencyjny ZIP organizatorów był dostępny jako `C:/Users/piotr/Downloads/mobywatel-ai.zip`. W poprzedniej sesji sprawdzono `mockup/agent.js`, `serwer/agent.py` i licencję MIT. Inspiracją były karty akcji i wyraźne potwierdzanie operacji w rozmowie. Wyróżnikiem aplikacji jest współdzielenie konkretnej sprawy, ograniczona reprezentacja przez inną osobę, cofanie dostępu i wspólny wynik po przejściu przez aplikację lub czat. Cel konkursowy to przeklikalny pokaz na dwóch telefonach, z wiarygodnym, czytelnym interfejsem i jednoznacznym oznaczeniem symulacji.

## Stan repozytorium

- Katalog `C:/Users/piotr/OneDrive/Pulpit/Mobywatel0-konkurs`, gałąź `main`, HEAD `7f21f5a initial commit`. Ta migawka opisuje katalog roboczy, w którym jest dużo niezatwierdzonych zmian. W commicie HEAD brakuje wielu funkcji opisanych poniżej.
- Zmienione śledzone pliki obejmują `README.md`, `docs/{ASSETS,CONTEST-REVIEW,SUBMISSION}.md`, `index.html`, ikony i manifest w `public/`, `vite.config.ts`, `playwright.config.ts`, `server/{.env.example,assistant.mjs,index.mjs,most.mjs,wellness.mjs}`, ekrany i style w `src/` oraz testy logiki, API i E2E. Pełną bieżącą listę zmodyfikowanych i nieśledzonych plików zwraca `git status --short`.
- Istotne nieśledzone pliki implementacji to `server/workflows.mjs`, `server/workflow-assistant.mjs`, `src/workflows/`, `src/ServiceDirectory.tsx`, `src/most/DelegationPanel.tsx`, `src/product-system.css` i testy `tests/e2e/{workflows,chat,delegated-operation}.spec.ts`. Zachować przed resetem, czyszczeniem lub przenoszeniem pracy do innego checkoutu.
- `server/.env`, `.most-state/`, `dist/` i `test-results/` są lokalne i ignorowane. Nie kopiować sekretów do dokumentacji, logów, frontendu ani Git. Ta sesja zmienia jedynie dwa pliki przekazania.

## Architektura i miejsca w kodzie

| Obszar | Implementacja |
|---|---|
| Frontend | React 19, TypeScript, Vite, Motion, Lucide i QRCode. `src/main.tsx` wybiera aplikację, pokaz współpracy lub widok przekazanego workflow. `src/App.tsx` spina profile, nawigację, overlaye, czat i powiadomienia. `src/navigation.ts` waliduje trasy z historii. `src/CivicChrome.tsx`, `src/civic-system.css`, `src/product-system.css` odpowiadają za wspólny wygląd. |
| Dane frontendu | `src/domain.ts` definiuje profile demonstracyjne, dane obywatela, wiadomości, starsze szkice i wyniki. `src/storage.ts` zapisuje profil i lokalną historię do Web Storage. Identyfikator rozmowy oddziela sprawy. Starsze wiadomości bez identyfikatora należą do rozmowy ogólnej. |
| Backend | `server/index.mjs` uruchamia serwer HTTP Node, rozpoznaje trasy, kontroluje dozwolony Origin, limity JSON i częstotliwość zapytań. Moduły `server/{workflows,most,wellness,family}.mjs` odpowiadają za operacje i stan. `server/static.mjs` obsługuje opcjonalne serwowanie buildu. |
| Trwały zapis | `server/state.mjs` zapisuje osobne migawki V8 `family.v8`, `most.v8`, `wellness.v8` i `workflows.v8` w `MOST_STATE_DIR`. Używa pliku tymczasowego i zmiany nazwy. Przy pustej konfiguracji zapis backendu jest w pamięci. Warto trzymać katalog poza kodem produkcyjnym i uruchamiać jednego zapisującego backendowego pracownika na katalog. |
| Operacje Spraw | `src/CaseHub.tsx` pokazuje Moje/Pomagam oraz Do zrobienia/W toku/Zakończone. `src/workflows/model.ts` definiuje typy `fine`, `tax`, `registration`, `tax-address`, statusy, dane wejściowe, potwierdzenia i historię. `Workspace.tsx` służy zarówno ekranowi sprawy, jak i osadzonemu formularzowi w czacie oraz pomocnikowi. |
| Wspólne sprawy | `server/most.mjs` przechowuje pokoje, role, tokeny, zaproszenia, zakresy, aktywność, przygotowany pakiet, wersje, komentarze i zdarzenia. `src/most/model.ts` zawiera kontrakty, `session.ts` transport i polling, `MostOwner.tsx`, `MostHelper.tsx` i `MostWork.tsx` obsługują współpracę przy piśmie. `DelegationPanel.tsx` i `components.tsx` obsługują powiązanie QR oraz listę upoważnień pomocnika. |
| Pozostałe moduły | `src/ApprovedDocuments.tsx` — portfel i widoki dokumentów. `src/ServiceDirectory.tsx` — katalog usług. `src/PrivacyHub.tsx` — zakresy i dostęp. `src/Inbox.tsx` — powiadomienia. `src/health/HealthWorkspace.tsx`, `src/health/session.ts`, `server/wellness.mjs` — Zdrowie. `src/family/FamilyWorkspace.tsx`, `server/family.mjs` — Rodzina. |
| PWA | `public/manifest.webmanifest`, `scripts/generate-sw.mjs`, `src/main.tsx` i `tests/sw.test.mjs`. Service worker cache’uje aplikację, a ruch `/api/` omija cache. |

## API i synchronizacja

| Endpoint | Sposób użycia |
|---|---|
| `GET /api/health` | Stan backendu i tryb dostawcy modelu. |
| `POST /api/workflows/session` | Zakłada sesję demonstracyjnego profilu i zwraca token oraz jego sprawy. |
| `GET/POST /api/workflows` | Właściciel odczytuje sprawy oraz wykonuje `prepare`, `confirm`, `read`, `grant` i `revoke`. |
| `GET/POST /api/workflows/delegated` | Token przypisany do jednej sprawy. Pomocnik może odczytać tę sprawę oraz wykonać `prepare` i `confirm`. |
| `POST /api/workflows/assistant` | Rozpoznaje intencję w sesji właściciela i zwraca odpowiedź opartą na autoryzowanych danych. Obsługa pisma wymaga tokenu właścicielki pokoju Ewy. |
| `POST /api/assistant` | Starszy adapter odpowiedzi i propozycji przekazywanych do interfejsu. |
| `POST /api/most/session`, `GET/POST /api/most/case` | Pokój właściciela, QR, przyjęcie, zakres, operacje pakietu, wersjonowanie, cofanie i historia współpracy. |
| `POST /api/family/session`, `GET/POST /api/family/case`, odpowiedniki `/api/wellness/` | Odrębne role, zgody i widoki domen Rodzina i Zdrowie. |

- Backend odróżnia właściciela od pomocnika przez tokeny Bearer. Linki pomocnika używają fragmentów `#most=` i `#workflow=`. Pokój osoby zaufanej musi mieć aktywne przyjęte zaproszenie. Token operacyjny wiąże konkretną sprawę z tym połączeniem i jest sprawdzany przy każdym odczycie i zapisie. Cofnięcie sprawy lub odłączenie osoby blokuje dalsze działania. Grant operacyjny ma limit siedmiu dni i dodatkowo zależy od ważności połączenia. Zwykłe zaproszenie do pisma ma dziesięć minut. Powiązane zaproszenie do pisma jest ograniczone ważnością połączenia i limitem siedmiu dni.
- `src/workflows/session.ts` pobiera stan mniej więcej co trzy sekundy, gdy dokument jest widoczny, i przy powrocie fokusu. `src/most/session.ts` odpytuje stan pokoju i porównuje rewizję oraz listę przypisań. Synchronizacja korzysta z HTTP, a różne przeglądarki mają własne sesje.
- `server/workflows.mjs` sprawdza rewizję operacji i trwale zapisuje numer potwierdzenia. Ponowienie potwierdzenia tej samej wersji zwraca istniejący wynik. W razie błędu zapisu ten moduł przywraca poprzedni stan w pamięci. W potwierdzeniu widoczne jest wykonanie przez osobę zaufaną.
- Pismo używa `reviewId`. Standardowy pomocnik przygotowuje pakiet. Właścicielka zatwierdza i wysyła. Alternatywna ścieżka wymaga aktywnej osoby zaufanej, jawnego `maySubmit` i zakresu obejmującego pismo, formularz, odpowiedź oraz załączniki. Pomocnik zatwierdza własne wysłanie wyłącznie dla bieżącej sprawdzonej wersji.

## Funkcje i poziom sprawdzenia

Status dotyczy zakresu opisanej funkcji w prototypie. Weryfikację z bieżącej sesji opisano osobno poniżej.

| Funkcja | Status | Zakres i dowód |
|---|---|---|
| Dokumenty | **GOTOWE I SPRAWDZONE** | Demonstracyjne dokumenty, widok szczegółowy i przepływ udostępniania z wyborem zakresu. Testy `app.spec.ts`, `experience.spec.ts`, `wallet2.spec.ts` obejmują różne części portfela. |
| Sprawy | **GOTOWE I SPRAWDZONE** | Operacyjne workflow i podział na statusy. Mandat, podatek, dwa formularze przeprowadzki i pismo Ewy kończą się zapisem w backendzie. Testy `workflows.spec.ts`, `delegated-operation.spec.ts`. |
| Usługi | **GOTOWE I SPRAWDZONE** | Katalog kieruje do Zdrowia, Rodziny, przeprowadzki i asystenta. Scenariusze domenowe oraz przejście z Usług do czatu mają testy. |
| Dane | **GOTOWE I SPRAWDZONE** | Wybór zakresu udostępnianych danych, wycofywanie zgody i wejście do Osoby zaufanej. Testy `app.spec.ts` i `experience.spec.ts`. |
| Wspólne sprawy, QR i Osoby zaufane | **GOTOWE I SPRAWDZONE** | Połączenie osobnymi sesjami, przyjęcie zaproszenia, przypisanie i cofnięcie. E2E płatności korzysta z linku odpowiadającego QR. Fizycznego skanowania aparatem między urządzeniami nie zweryfikowano. |
| ePełnomocnictwa i samodzielność pomocnika | **GOTOWE I SPRAWDZONE** | Wewnętrzne upoważnienia w zakresie płatności, zgłoszeń przeprowadzki i pisma z prawem wysłania. API w `tests/server.test.mjs`; E2E mandatu oraz wcześniejsza próba pisma w dwóch sesjach Chrome. |
| Mandaty | **GOTOWE I SPRAWDZONE** | Fikcyjny mandat Kacpra 300 zł. Wybór metody demo, podsumowanie, niepowodzenie testowe i ponowienie, zapis wyniku, potwierdzenie i wykonanie przez pomocnika. Testy API i Chrome. |
| Podatki | **CZĘŚCIOWO GOTOWE** | Podatek od nieruchomości korzysta z tego samego silnika płatności i mechanizmu przekazania co mandat. Brak dedykowanego pokrycia pełnego przebiegu podatku przez osobę zaufaną w przeglądarce. |
| Pisma urzędowe | **GOTOWE I SPRAWDZONE** | Pismo Ewy, formularz, załącznik, przegląd, poprawki, zwykła wysyłka i wysyłka przez pomocnika z wyraźnym upoważnieniem. Testy API i przeglądarkowe opisane wyżej. |
| Przeprowadzka | **GOTOWE I SPRAWDZONE** | Pobyt stały i aktualizacja adresu podatkowego jako dwa odrębne zgłoszenia demo. E2E właściciela sprawdza ponowne użycie adresu i potwierdzenia. API sprawdza zgłoszenie pobytu przez pomocnika. Przekazanie ZAP‑3 nie ma oddzielnego E2E. |
| Zdrowie | **GOTOWE I SPRAWDZONE** | Demonstracyjne skierowania, wizyty, wyniki, recepty i historia; współpraca przy wizycie według zakresu oraz decyzja właścicielki. `tests/wellness.test.mjs` i `tests/e2e/wellness.spec.ts`. |
| Rodzina | **GOTOWE I SPRAWDZONE** | Odrębne role i współpraca w sprawie dziecka, w tym zgoda opiekuna w pokazie paszportowym. `tests/family.test.mjs`, `tests/e2e/family.spec.ts`. |
| Asystent AI | **GOTOWE I SPRAWDZONE** dla bieżącego zakresu | Karty i formularze czynności, osobne rozmowy, automatyczne pierwsze pytanie po otwarciu sprawy/dokumentu i pytanie po dodaniu załącznika do pisma. `chat.spec.ts`, `server.test.mjs`; przed handoffem istniała wcześniejsza próba GPT‑4.1 na żywo. |
| Powiadomienia i historia działań | **GOTOWE I SPRAWDZONE** dla obecnych modułów | Statusy, potwierdzenia i historia dokumentowane w danych operacyjnych. Pismo i współpraca mają własne zdarzenia oraz stan przeczytania. Brakuje jednego globalnego rejestru audytu wszystkich operacji i grantów. |
| Prawnie skuteczne pełnomocnictwo, podpis, WebAuthn | **NIEZAIMPLEMENTOWANE** | To osobne zadania MOST 3.0. |

## Ostatni etap i ważne ograniczenia

- Z normalnego katalogu Spraw usunięto pozycje prowadzące do samej propozycji, m.in. badanie pojazdu i wymianę prawa jazdy. Usunięto też wejście do planu zmiany danych pojazdu z `src/ApprovedDocuments.tsx`. Starszy kod szkiców i wyników istnieje dla zachowania danych i starszego prototypu. `src/navigation.ts` kieruje przywracany szkic przeprowadzki do aktualnego wyboru formularzy. Stare przypisania wspólnych spraw są filtrowane.
- Mandat, podatek i przeprowadzka mają wspólne reguły wykonania i grantów w `server/workflows.mjs`. Łączenie QR, lista przypisań i zależna ważność dostępu łączą go z `server/most.mjs`. Pismo pozostaje w module wspólnych spraw, a jego wykonanie i potwierdzenie są widoczne w tym samym pokoju z obu ról. Zdrowie i Rodzina utrzymują własne reguły zgody.
- `server/workflow-assistant.mjs` używa OpenAI-compatible tool calling do wyboru dozwolonej intencji. Treść karty i status pochodzą z backendu. W razie problemu działa rozpoznawanie regułowe. `server/assistant.mjs` ma starszy adapter i mechanizm `prepare_process`. Asystent otwiera lub osadza ten sam formularz i nie zatwierdza operacji. Sesja delegowana nie stanowi obecnie samodzielnego kontekstu AI.
- `MostWork.tsx` pozwala dołączyć przykładową kopię albo plik PDF/PNG/JPG do 5 MB. Backend zapisuje nazwę, typ, rozmiar i skrót SHA‑256, a zawartość pliku pozostaje na urządzeniu. Skrót oblicza Web Crypto w przeglądarce. To ogranicza działanie w niezaufanym kontekście HTTP na telefonie w LAN. Podgląd i pobranie demonstracyjnej kopii są dostępne dla przykładowych dokumentów. Załącznik użytkownika nie jest przekazywany jako plik do urzędu ani do modelu.
- Profil demonstracyjny wybiera użytkownik, bez produkcyjnego logowania i potwierdzania tożsamości. Link jest uprawnieniem typu bearer. Kto go zdobędzie przed wygaśnięciem lub cofnięciem, może skorzystać z przypisanego zakresu. Origin jest zabezpieczeniem uzupełniającym. Brakuje przypisania uprawnienia do trwale zweryfikowanej tożsamości, twardego ponownego uwierzytelnienia i podpisu.
- Zapis migawkowy jest projektowany dla pojedynczego procesu. Nie ma wspólnej transakcji między magazynami modułów ani kontroli dostępu na poziomie produkcyjnej bazy. Ogólny wrapper zapisu pokoi w `server/index.mjs` zwraca błąd zapisu, lecz nie ma mechanizmu cofania mutacji analogicznego do workflow. Zapisane czaty i część starszych danych lokalnych zależą od przeglądarki.
- Brakuje audytu wszystkich odczytów i centralnego panelu pełnomocnictw, integracji z faktycznym bankiem lub rejestrem, rzeczywistej wysyłki dokumentów oraz monitorowania terminów w tle. W katalogu usług i w starszym kodzie są nadal elementy edukacyjne oraz dane demonstracyjne. Ten audyt nie wykazał konkretnych nowych nieaktywnych przycisków w głównym przepływie i nie obejmował klikania całego interfejsu.
- Pokrycie warte uzupełnienia obejmuje pełne E2E podatku i obu zgłoszeń w roli pomocnika, udział modelu w kontekście uprawnienia pomocnika, rzeczywiste dwa urządzenia i scenariusze błędu trwałego zapisu. Diagnostykę uruchomienia z modelem, konfigurację i jego kontrakt uzupełnia `docs/AI-INTEGRATION.md`. Ta dokumentacja zawiera też starszą terminologię planów.

## Uruchamianie i testy

- Użyć Node 22 z obsługą `--experimental-strip-types` oraz npm. Po instalacji zależności backend demo uruchamia `npm.cmd run server`, a frontend `npm.cmd run dev`. Domyślnie API jest na `127.0.0.1:4190`, Vite na porcie 5173, a jego proxy obsługuje `/api`.
- Dla trwałego zapisu ustawić `MOST_STATE_DIR` przed uruchomieniem Node, np. `$env:MOST_STATE_DIR='.most-state/operational-demo'`. Pozostawić ten sam katalog przy restarcie. Inne używane ustawienia to `PORT` lub `ASSISTANT_PORT`, `BIND_HOST`, `APP_ORIGIN` dla dodatkowego originu, `SERVE_DIST=1` dla statycznego buildu i `MOBYWATEL_API_PORT` dla proxy Vite.
- Konfiguracja modelu jest w `server/.env`. Wzór w `server/.env.example`. Używane nazwy to `ASSISTANT_PROVIDER`, `MODEL_BASE_URL`, `MODEL_NAME`, `MODEL_API_KEY`. Projekt wcześniej skonfigurowano z GPT‑4.1. Backend można uruchomić jako `node --use-system-ca --env-file=server/.env --experimental-strip-types server/index.mjs`. Flaga z certyfikatami systemowymi rozwiązała w tym Windowsie weryfikację TLS. Dla starszego transportu czatu ustawić przed startem Vite `$env:VITE_ASSISTANT_MODE='server'`.
- W poprzednim etapie zaktualizowany pokaz działał pod `http://127.0.0.1:4186` z proxy do 4193, `APP_ORIGIN` ustawionym na port 4186 i katalogiem `.most-state/operational-demo`. Porty 5173 oraz 4184 mogły obsługiwać inne lub starsze procesy. Przed restartem sprawdzić port i proces. Przy własnym uruchomieniu odpowiednio ustawić `PORT`, `APP_ORIGIN` i `MOBYWATEL_API_PORT`.
- Pokaz dwóch telefonów otwiera parametr `/?pokaz=most` na działającym froncie. Wejście bezpośrednio do pisma Ewy w aplikacji to `/?start=most`. Niezależna sesja pomocnika korzysta z własnego kontekstu przeglądarki oraz linku lub QR.
- `npm.cmd test` uruchamia razem testy jednostkowe i API. Samo API można sprawdzić poleceniem `node --experimental-strip-types --test tests/server.test.mjs tests/most.test.mjs tests/family.test.mjs tests/wellness.test.mjs`. Testy serwerowe otwierają lokalne porty.
- `npm.cmd run build` kompiluje TypeScript, Vite i generuje service workera. `npm.cmd run test:e2e` uruchamia Playwright. `playwright.config.ts` uruchamia testowy backend 4191, dev 4183 i preview 4184. Przed testami potrzebny jest build i wolne porty. Na tym komputerze można użyć zainstalowanego Chrome z konfiguracją `use.channel = "chrome"`, gdy własny Chromium Playwright nie jest zainstalowany.

### Wynik bieżącej sesji przekazania

- Ponownie uruchomiono `npm.cmd test` na aktualnym katalogu roboczym. **40 przeszło, 0 niepowodzeń, 0 pominiętych**. Wynik obejmuje logikę, lokalne API, odtworzenie stanu i operacje delegowane z `tests/server.test.mjs`.
- W sesji przekazania nie uruchamiano produkcyjnego buildu, pełnego Playwright, pokazu dwóch fizycznych telefonów ani połączenia z GPT‑4.1. Browserowe i modelowe obserwacje przy funkcjach pochodzą z etapu implementacji, a nie z ponownej próby w tej sesji.
- `git diff --name-only --cached` zwrócił pustą listę. Zachowane zmiany są w obszarze roboczym. Uwzględnić osobno pliki nieśledzone.

Starszy opis kontekstu istnieje w `docs/HANDOFF_NEXT_SESSION.md`. Do startu MOST 3.0 użyć tej aktualnej migawki.

## MOST 3.0 — oddzielna, przyszła misja

Najważniejsze zadanie następnej sesji to rozwój wspólnych spraw w kompleksowy system cyfrowej reprezentacji obywatela. Następna sesja dostanie oddzielny prompt implementacyjny.

Plan obejmuje centrum kontroli pełnomocnictw, precyzyjne zakresy zasobów i operacji, monitorowanie terminów przeglądów, OC, dokumentów i spraw, samodzielne wykonywanie czynności przez osobę zaufaną, formalne modele i generowanie dokumentów pełnomocnictwa, podpisy elektroniczne, WebAuthn lub biometrię w miarę możliwości, uwzględnienie uprawnień w asystencie, historię dostępu i działań, cofanie i wygasanie grantów oraz pełne testy dwóch niezależnych sesji. To lista **planowana**. Prototyp realizuje dziś wybrane zakresy, wykonanie, historię operacji, wygasanie, cofanie i test wybranych przepływów.

- Każda sprawa pokazywana jako dostępna powinna kończyć się konkretnym, zweryfikowanym wynikiem. Ekrany „Przygotuj plan” zostały wycofane z katalogu.
- Właściciel zachowuje kontrolę nad zakresem. Jawnie upoważniony pomocnik może wykonać operację samodzielnie. Własne działania, działania pomocnika i karty AI powinny korzystać ze wspólnych reguł backendu.
- Rozróżniać wewnętrzne upoważnienie demo, prawną reprezentację, uwierzytelnienie użytkownika i podpis elektroniczny. Biometria lub WebAuthn służą do uwierzytelniania. Prawnie wymagany podpis wymaga osobnego mechanizmu.
- Płatności, zgłoszenia, dokumenty i statusy konkursowe mają pozostać jednoznacznie oznaczonymi symulacjami. Zachować działające procesy i spójny, dopracowany interfejs mobilny.
