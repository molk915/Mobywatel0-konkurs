# mObywatel Razem — współpraca przy piśmie

W aktualnej nawigacji właściciel wraca do pisma przez **Sprawy → Moje**, a pomocnik przez **Sprawy → Pomagam**. Termin pisma powstaje przy założeniu sprawy i jest wspólny dla obu ról. Właścicielska sesja pisma wygasa po 14 dniach, a zaproszenie pozostaje ważne przez 10 minut.

Ustawienie zmiennej `MOST_STATE_DIR` włącza trwały zapis stanu wspólnych spraw, Zdrowia i Rodziny. Wskaż katalog zapisywalny przez pojedynczą instancję Node, poza katalogiem publicznym. Zachowaj ten katalog między uruchomieniami. Pliki zawierają dane przykładowe oraz aktywne poświadczenia sesji. Bez ustawienia zmiennej stan pozostaje w pamięci procesu.

Funkcja współdzielenia spraw umożliwia wspólne przygotowanie odpowiedzi na jedno fikcyjne wezwanie. Ewa wybiera zakres dostępu. Kacper uzupełnia adres lokalu, dołącza kopię umowy i zapisuje uzasadnienie. Ewa podejmuje jedną decyzję dotyczącą całego pakietu. Po zakończeniu dostępu projekt i historia zostają u Ewy.

## Pomoc w aplikacji

Wybierz profil Ewy i otwórz pismo ze startu, Spraw lub Powiadomień. Wybierz **Poproś o pomoc**, ustaw zakres i utwórz zaproszenie. Link lub QR otwiera przydzielone pismo w zwykłej aplikacji. Kacper może do niego wrócić przez **Sprawy → Wspólne** oraz z dzwonka. Ewa dostaje powiadomienie, gdy pakiet czeka na jej decyzję, i może cofnąć dostęp ze szczegółów sprawy.

## Narzędzie testowe dwóch telefonów

1. W katalogu repozytorium uruchom `npm run server` i `npm run dev` w osobnych terminalach. Jeśli brakuje zależności, wykonaj `npm ci`. Użyj Node.js 24.
2. Otwórz bezpośrednio `http://localhost:5173/?pokaz=most` i wybierz **Rozpocznij demonstrację**. Narzędzie ma stan odseparowany od zwykłego interfejsu.
3. U Ewy wybierz **Poproś o pomoc**, sprawdź zakres i kliknij **Utwórz zaproszenie**. Na prawym telefonie Kacper może otworzyć udostępnione pismo i zacząć pracę.
4. U Kacpra użyj **Wstaw adres demo → Zapisz formularz**, dołącz kopię demonstracyjną i użyj **Wstaw uzasadnienie demo → Zapisz uzasadnienie**. Drugi wariant to **Poproś Ewę o dokument**, a po jej udostępnieniu **Dołącz dokument Ewy**.
5. Kliknij **Przekaż do zatwierdzenia**. U Ewy otwórz powiadomienie o gotowej sprawie albo wybierz **Sprawdź przygotowaną sprawę**. Ewa może zatwierdzić pakiet, wskazać poprawki lub go odrzucić. Po zatwierdzeniu Kacper otrzyma powiadomienie, a pakiet pozostanie zamknięty do edycji. Dostęp do odczytu trwa do wygaśnięcia albo do wybrania **Zakończ współpracę → Cofnij dostęp**.
6. **Zacznij od nowa** resetuje obie role w tym pokazie. **Wróć do aplikacji** otwiera zwykłą aplikację.

Na telefonie wybierz profil Ewy i otwórz wyróżnione pismo w **Sprawach**. Widok **Wspólne** prowadzi również do selektora profili. Po utworzeniu zaproszenia skopiuj link albo użyj kodu QR na drugim telefonie. Odbiorca dostaje własną sesję pomocy. Jeden adres aplikacji musi być osiągalny na obu urządzeniach. Dla zaufanej sieci lokalnej otwórz aplikację na adresie komputera, np. `http://ADRES_IP:5173`, i ustaw ten sam adres w `APP_ORIGIN` backendu przed jego uruchomieniem.

Ewa może także zresetować pokaz z historii współpracy na pojedynczym telefonie.

## Dane i uprawnienia

| Czynność | Ewa | Kacper |
| --- | --- | --- |
| Odczyt pisma | Pełne fikcyjne pismo | Treść i opcjonalny numer, jeżeli Ewa je zaznaczyła |
| Odczyt i dodawanie komentarzy | Przy otwartej współpracy i włączonych komentarzach | Przy otwartej współpracy i włączonych komentarzach |
| Przygotowanie pakietu | Własny formularz, uzasadnienie i załącznik | Oddzielne uprawnienia do formularza, uzasadnienia, załączników i prośby o dokument |
| Końcowa decyzja, cofnięcie dostępu, reset | Tak | Brak uprawnienia |
| Historia współpracy | Pełna oś czasu | Bieżący status i powiadomienia dla pomocnika |

Serwer tworzy oddzielne losowe tokeny ról i zwraca tylko pola dopuszczone dla danej roli. PESEL nigdy nie trafia do odpowiedzi API dla pomocnika. Zaproszenie i dostęp wygasają 10 minut po jego utworzeniu. Wygasły lub cofnięty wpis nie daje dalszego odczytu ani zapisu. Ponowna współpraca wymaga nowego zaproszenia. Projekt i oś czasu przeżywają odświeżenie karty.

## Synchronizacja

Proces Node obsługuje zasób `/api/most`. Obie role odczytują stan mniej więcej co 850 ms i zapisują zmiany osobnymi żądaniami. Serwer sprawdza kompletność i blokuje edycję pakietu w trakcie przeglądu. Decyzja odnosi się do konkretnej wersji pakietu. Skrzynka i stan odczytu są przypisane do danej roli. Utrata połączenia blokuje zapisy i uruchamia ponawianie.

Tryb prezentacji uruchamia dwa dokumenty aplikacji w osobnych ramkach. Strona prezentacji przekazuje link zaproszenia do prawej ramki i koordynuje reset. Dane pakietu, komentarze, powiadomienia i decyzje przepływają przez API. Role korzystają z oddzielnych kluczy sesji. Kod QR powstaje w przeglądarce.

## Build i udostępnienie

Po `npm ci` uruchom `npm run build`. Do lokalnego sprawdzenia produkcyjnego w jednym procesie Node w PowerShell wykonaj:

```powershell
$env:SERVE_DIST = '1'
$env:APP_ORIGIN = 'http://127.0.0.1:4190'
npm run server
```

Otwórz `http://127.0.0.1:4190/?pokaz=most`. Na hostingu ustaw `SERVE_DIST=1`, `APP_ORIGIN=https://<publiczna-domena>` i ewentualnie `BIND_HOST=0.0.0.0` jeśli wymaga tego platforma. Proces używa `PORT` przekazanego przez hosting, domyślnie 4190. Zakończ TLS w warstwie platformy lub reverse proxy. Wystaw aplikację i `/api/` pod tym samym originem HTTPS, z jedną instancją procesu Node. Sam statyczny hosting plików jest wystarczający dla lokalnych modułów aplikacji. Wspólne sprawy i Rodzina korzystają z backendu.

## Ograniczenia prototypu

Link pozwala posiadaczowi odegrać rolę pomocnika w jednej fikcyjnej sprawie w czasie ważności zaproszenia. Wdrożenie urzędowe wymagałoby rzeczywistego uwierzytelnienia, podstawy udzielenia dostępu i audytu. Limit to 256 równoległych wspólnych spraw w pojedynczym procesie. Aplikacja działa bez klucza do modelu i połączeń z systemami administracji.

## Weryfikacja

- `npm test` sprawdza uprawnienia API, kompletność pakietu, odczyt powiadomień, poprawki, odrzucenie, wygaśnięcie i cofnięcie dostępu.
- `npm run test:e2e` przechodzi główną ścieżkę w oddzielnych sesjach Chromium i uruchamia obie role w trybie konkursowym.
- Zrzuty bieżącego przebiegu obejmują [pokaz dwóch telefonów](screenshots/delegation-desktop.png), [zakres na 320 px](screenshots/delegation-scope-320.png), [zadania Kacpra](screenshots/delegation-tasks-375.png), [powiadomienia](screenshots/delegation-inbox.png) i [pakiet do zatwierdzenia](screenshots/delegation-review-390.png).

Publiczny adres HTTPS i próba na dwóch fizycznych urządzeniach pozostają do zweryfikowania.
