# Raport weryfikacji — 17 listopada 2026

## Wykonane sprawdzenia

| Obszar | Dowód | Wynik |
|---|---|---|
| TypeScript i build produkcyjny | `npm run build`, Vite 8.3.8, cache `7139f46abb8b` | PASS |
| Logika procesów, zgód, person, asystenta | Testy Node: walidacja wszystkich etapów, blokada bez zgody, potwierdzenia, izolacja stanu, wypełnienie miasta | PASS |
| Bezpieczny zakres załączników | Test odrzucenia >5 MB i HTML przed zapisem | PASS |
| Service worker | Test instalacji cache, aktywacji, nawigacji bez sieci, pomijania `/api/` | PASS w teście kodu |
| Łączna liczba testów automatycznych | `npm test`: 15 testów, 15 udanych, 0 błędów | PASS |
| Zależności runtime | `npm audit --omit=dev`: 0 podatności | PASS |
| Ekran 390 × 844 | Faktyczne zrzuty i oględziny w przeglądarce | PASS |
| Ramka na desktopie 1280 × 720 | Pełna obudowa mieści się na ekranie; pomiar DOM: brak przewijania dokumentu | PASS |
| Wszystkie zakładki | Start, Dokumenty, Sprawy, Dane; otwieranie asystenta i profilu | PASS |
| Przeprowadzka | Puste dane blokowane; wpisany adres, zapis, zamknięcie, odświeżenie, wznowienie; wybór formalności; brak zgody blokuje; potwierdzenie | PASS w przeglądarce |
| Zgubiony portfel | Wybór dowodu, kart i prawa jazdy, cofnięcie i zachowanie wyboru, plan, świadoma zgoda, status PESEL i dalsze kroki | PASS w przeglądarce |
| Pismo | Przykład, wyjaśnienie, walidacja pustej odpowiedzi, szkic, potwierdzenie, rozwinięcie zapisanego tekstu | PASS w przeglądarce |
| Rzeczywisty lokalny załącznik | Utworzenie pliku TXT, zapis IndexedDB, pobranie, odświeżenie, ponowne odczytanie oraz obecność w potwierdzeniu | PASS w produkcyjnym podglądzie |
| Dokumenty | mDowód, prawo jazdy, pojazd, EKUZ, legitymacja Kacpra; szczegóły, maskowanie i ujawnienie, zakres udostępnienia prawa jazdy | PASS w przeglądarce |
| Kontrola danych | Brak zgody blokuje utworzenie kodu; pełnoletność bez danych; wycofanie zgody biblioteki; automatyczne wygaśnięcie po zamknięciu kodu i wpis w historii | PASS w przeglądarce |
| Asystent | Intencja przeprowadzki, odpowiedź o prywatności, przejście do procesu, automatyczne uzupełnienie miasta Warszawa | PASS w przeglądarce |
| Profile i większy tekst | Przełączenie Aleksandra → Kacper → Ewa; Kacper nie widzi zakończonych spraw Aleksandry; dokument studenta; przełącznik większego tekstu | PASS w przeglądarce |
| Nawigacja | Przyciski Wstecz i Zamknij, systemowy powrót przeglądarki z Danych do potwierdzenia | PASS w przeglądarce |
| Konsola | Wykryty błąd cleanup efektu asystenta został poprawiony; ponowne otwarcie i rozmowa działają. Odczyt logów nowej sesji produkcyjnej zwrócił `[]` | PASS w sprawdzonej sesji |

Ostatnie zmiany po sesji UI: formatowanie źródeł i dodatkowe odfiltrowanie historii nawigacji między profilami. Build i 15 testów wykonano po tych zmianach; ostatniego zabezpieczenia historii nie sprawdzono ponownie w UI.

## Niezamknięte bramki

1. **Instalacja PWA i pełny restart offline w prawdziwej przeglądarce/na fizycznym telefonie — NIEPOTWIERDZONE.** Manifest, ikony i service worker są wygenerowane. Aplikacja zgłosiła stan rejestracji `ready`. Próba przeładowania po wyłączeniu serwera we wbudowanej przeglądarce dała pusty widok. Nie ustalono, czy ograniczenie dotyczy obsługi nawigacji tego środowiska, czy produktu. Podjęto próbę sprawdzenia w natywnej Operze; Computer Use zatrzymało obsługę, bo nie mogło wiarygodnie ustalić URL. Nie uznajemy testów service workera w Node za dowód instalacji lub pracy offline na urządzeniu.
2. **Audyt całej referencji — CZĘŚCIOWY.** Obejrzano wizualnie pięć układów dokumentów, cztery persony, szczegóły mDowodu, prawa jazdy, karty rodzinnej i pojazdu; przypomnienia, skrzynkę, utratę portfela z potwierdzeniem, przygotowanie odpowiedzi na pismo, historię rozmowy i udostępnianie/przyjmowanie danych. Rozpoczęto scenariusz zakupu auta. Kod publicznej paczki wykorzystano do inwentaryzacji, bez kopiowania do projektu. Nie przeklikano do końca wszystkich dodatkowych gałęzi, np. mStłuczki, narodzin dziecka, phishingu i płatności. Wymóg użytkownika, by sprawdzić każdą funkcjonalność referencji, pozostaje otwarty.
3. **Publiczny link HTTPS — DO WDROŻENIA.** Dostarczono statyczny build i konfigurację hostingu. Nie opublikowano strony ani nie wysłano zgłoszenia. Przed konkursem wymagany jest publiczny test bez logowania i ponowne sprawdzenie zasad organizatora.
4. **Pełny audyt dostępności — NIE WYKONANO.** Są etykiety, duży tekst, obsługa klawiatury, focus, respektowanie ograniczonego ruchu i lokalne komunikaty walidacji. Nie deklarujemy zgodności WCAG ani testów czytnika ekranu na urządzeniu.

## Zrzuty

- `screenshots/03-potwierdzenie.jpg` — przeprowadzka zakończona lokalnie.
- `screenshots/04-minimum-danych.jpg` — świadome udostępnienie wyłącznie potwierdzenia pełnoletności.

W narzędziu obejrzano też ekran główny, formularz błędnego adresu, wyjaśnienie pisma, dokumenty oraz ramkę desktopową. Dwa powyższe pliki zapisano przed końcowymi drobnymi korektami kontrastu; przedstawiają rzeczywiste działające widoki tej implementacji.

## Zależności developerskie

Pełny `npm audit` zgłosił 5 ostrzeżeń high związanych z łańcuchem `picomatch`/Vite; registry nie oferowało poprawionej wersji `picomatch` ponad 4.0.7. `npm audit fix` nie usunął ich bez sugerowania zmiany głównej wersji Vite. Nie wykonano automatycznego wymuszonego downgrade'u narzędzi. Runtime ma 0 podatności według sprawdzonego audytu. Publicznie należy hostować statyczny `dist`, a nie dev server.
