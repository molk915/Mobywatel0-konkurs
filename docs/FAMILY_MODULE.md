# mObywatel Rodzina

## Cel produktu

Dwie osoby na własnych urządzeniach mogą razem przygotować jedną sprawę rodzinną. Każda widzi bieżący etap oraz zakres informacji przekazanych w związku ze sprawą. Scenariusz konkursowy wykorzystuje wyłącznie fikcyjne dane.

## Funkcjonalności i przebieg pokazu

1. W zakładce **Sprawy → Wspólne → Moja rodzina** wybierz **Wejdź jako Aleksandra**. Powstaje niezależny pokaz z Aleksandrą, Tomaszem i dziesięcioletnią Zosią.
2. Wybierz **Przygotuj rodzinę do wyjazdu**. Lista wyróżnia paszport Zosi. Otwórz sprawę, sprawdź dane i uzupełnij brakujące pola z przykładowych opcji. Zapisz i sprawdź podsumowanie.
3. Sprawdź odbiorcę i zakres. Wybierz **Poproś Tomasza o zgodę**. Na ekranie sprawy wybierz **Udostępnij link dla Tomasza**, a następnie otwórz link w nowej karcie albo skopiuj go na urządzenie Tomasza. Na ekranie sesji nadal widać aktualny status sprawy.
4. W sesji Tomasza otwórz prośbę i wybierz zgodę lub odmowę. Widok Aleksandry automatycznie odczytuje ten sam stan z serwera. Zgoda kończy przygotowanie wniosku. Po odmowie Aleksandra może uzupełnić dane i ponowić prośbę.
5. Status i historia są dostępne w przestrzeni rodziny. Można też otworzyć osobny widok Zosi i sprawdzić, jakie informacje są dla niej dostępne.

## Architektura i model danych

React otwiera moduł z istniejącej nawigacji spraw. Współdzielona sprawa ma inny cykl życia niż prywatne szkice w lokalnym store, więc istniejący store zachowuje odrębne profile i sprawy.

- `src/family/fixtures.ts` zawiera fikcyjne relacje, dokumenty i zamkniętą listę wartości formularza.
- `src/family/model.ts` definiuje kontrakt sprawy i jej wersjonowanych zdarzeń. Cykl to `draft → pending → ready` lub `pending → declined → draft`. Sprawa zawiera wybór celu podróży i punktu paszportowego, numer wersji oraz chronologiczną historię.
- `server/family.mjs` obsługuje sprawy, poświadczenia demonstracyjne i uprawnienia w istniejącym procesie Node. Każdy pokaz ma osobny stan, maksymalnie przez osiem godzin lub do restartu procesu. Jednoczesne zapisy mają kontrolę wersji.
- `src/family/session.ts` obsługuje poświadczenie w `sessionStorage`, polecenia HTTP i odczyt stanu co 1,5 sekundy. Odpowiedzi mają `no-store`, a service worker pomija `/api/`. Utrata połączenia blokuje zapis do czasu ponownego odczytu.

## Uprawnienia

| Rola | Dostęp | Czynności |
| --- | --- | --- |
| Aleksandra, opiekunka prowadząca | Statusy paszportów domowników, własny szkic, zakres prośby i historia współpracy | Przygotowanie i ponowienie prośby do Tomasza |
| Tomasz, drugi opiekun | Statusy paszportów domowników. Dane sprawy i widoczna dla niego historia pojawiają się po skierowaniu do niego prośby | Decyzja w bieżącej prośbie |
| Zosia, dziecko | Imiona i relacje domowników, status własnego paszportu | Odczyt własnego statusu |

Uprawnienia sprawdza serwer na podstawie poświadczenia przypisanego do roli i pokazu. Przekazanie wniosku ma stałego odbiorcę, cel, status i zakres obejmujący imię i wiek dziecka, typ dokumentu, cel podróży oraz punkt paszportowy. Historia zawiera czas, autora, identyfikator prośby i dane przekazane z każdą wersją prośby. Serwer projektuje odpowiedź osobno dla roli. Zakończone decyzje pozostają w historii.

## Uruchomienie

W dwóch terminalach, z katalogu projektu, uruchom `npm run server` oraz `npm run dev`. Otwórz `http://localhost:5173`. Jeden komputer wystarczy do pokazu w dwóch kartach lub profilach przeglądarki.

Aby pokazać drugi wariant od początku, otwórz nową kartę bezpośrednio z adresem aplikacji i ponownie wejdź jako Aleksandra. Otwórz link Tomasza z nowej sesji.

Do pokazu w zaufanej sieci Wi-Fi ustaw w terminalu backendu `$env:APP_ORIGIN = 'http://ADRES_IP_KOMPUTERA:5173'` przed uruchomieniem `npm run server`. Oba urządzenia muszą otworzyć aplikację przez ten adres i mieć dostęp do portu 5173. Linki przejmują adres, z którego korzysta nadawca. Backend nadal słucha na loopback i jest osiągalny przez proxy Vite. Wersja produkcyjna wymaga serwowania `dist` i przekierowania `/api/` do jednej instancji Node w tym samym originie HTTPS, wskazanym przez `APP_ORIGIN`. Sam hosting statyczny obsługuje pozostałe lokalne moduły.

## Kryteria ukończenia

- Dwa odrębne widoki otrzymują i aktualizują ten sam stan bez ręcznego odświeżenia.
- Zgoda i odmowa prowadzą do odpowiednich wyników i wpisów w historii. Próba zapisu poza rolą, nieaktualna decyzja lub odczyt danych spoza zakresu kończy się odmową lub ograniczoną odpowiedzią.
- Ekrany mieszczą się w 390 × 844 i 320 × 740, a Dokumenty mają stałe nagłówek, przycisk dodawania i nawigację.
- Build, testy domenowe, testy API i testy przeglądarkowe przechodzą. Sprawdzenie na fizycznych urządzeniach jest osobnym krokiem weryfikacji.

## Granice prototypu

Relacje są zaszyte w danych demonstracyjnych. Posiadacz linku może przyjąć przypisaną mu rolę w tym pokazie. Link umieszcza sekret we fragmencie URL, a aplikacja zapisuje go w sesji karty. Limit pokazów w procesie to 256. Restart kończy aktywne pokazy, a osobiste sprawy pozostają w dotychczasowym zapisie lokalnym. Wniosek kończy się na przygotowaniu demonstracyjnym. Cały przebieg odbywa się poza systemami urzędowymi.

## Weryfikacja przeglądarkowa

Przebiegi zgody i odmowy testują dwa niezależne konteksty Chromium przy 390 × 844 i 320 × 740. Dodatkowy pokaz wersji produkcyjnej przez adres interfejsu sieci lokalnej na jednym komputerze, w dwóch osobnych procesach Chromium, potwierdził automatyczną aktualizację po akceptacji. Test na dwóch fizycznych urządzeniach pozostaje do wykonania.
