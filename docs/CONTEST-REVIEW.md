# Powtórna ocena kierunku konkursowego

Stan źródeł i projektu: 17 listopada 2026.

## Co podaje organizator

Publiczne zasady wymagają klikalnego prototypu dostępnego bez logowania. Wskazują przewagę w prostocie, wygodzie, dostępności lub zakresie załatwianych spraw. Dopuszczają całą aplikację albo jedną kompletną sprawę. Polskie modele są mile widziane, ale nieobowiązkowe. Termin: 30 listopada 2026, koniec dnia czasu polskiego. Dziesięć wyróżnionych koncepcji zostanie zaprezentowanych w Sejmie. Publiczna strona nie podaje punktowej rubryki ani wag oceny. Referencja jest niezależnym prototypem, nie oficjalną usługą państwa.

Źródło: [zasady i pytania mObywatel Challenge](https://mobywatel.ai/). Link „zasady” na stronie prowadzi do jej sekcji pytań; sprawdzono także pełną stronę.

## Nasza ocena produktu — nie kryteria ogłoszone przez jury

Samodzielny styl jest potrzebny, lecz zmiana kompozycji nie dowodzi większej użyteczności. Sprawny build i automatyczne testy dowodzą wyłącznie sprawdzonych zachowań technicznych. Obecnej wersji nie należy opisywać jako pewnego zwycięzcy ani produktu całościowo lepszego od referencji.

Najbardziej obiecujący kierunek: **jedna sytuacja życiowa uruchamia spójny zestaw formalności, które obywatel rozumie i kontroluje**. Przykład do pokazu: przeprowadzka.

### Co już jest

- Rozpoznanie intencji przeprowadzki, edytowalne uzupełnienie miasta i prowadzony proces.
- Trzy ścieżki z walidacją, podsumowaniem i świadomą zgodą.
- Trwały stan spraw, załączników, rozmów i person; wznowienie po przeładowaniu.
- Minimalny zakres udostępnienia, odbiorca, cel, wycofanie zgody i historia.
- Testy produkcyjnego restartu offline w Chromium.

### Co ogranicza przewagę

| Obszar | Stan obecny | Potrzebny dowód przewagi |
|---|---|---|
| Rezultat sprawy | Przeprowadzka zapisuje lokalny adres, plan i potwierdzenie | Osobny wynik każdej wybranej formalności, odbiorca, brakujące dokumenty i dalszy krok |
| Kontrola danych | Historia pokazuje zbiorcze zdarzenie sprawy | Powiązanie każdej formalności z konkretnym zakresem danych i śladem dostępu |
| Dokumenty | Oryginalny, czytelniejszy portfel z fikcyjnymi danymi | Porównanie szybkości odnalezienia dokumentu i odczytu ważnych danych z referencją |
| Asystent | Jawny silnik demonstracyjny; adapter serwerowy | Spójne przekazanie rozmowa → formularz → wynik; bez utraty kontekstu i bez potwierdzania przez model |
| Pismo | Dokładne wyjaśnienie przykładu, ograniczona analiza własnego tekstu | Widoczne powiązanie wyjaśnienia z fragmentami pisma, poprawianie wykrytych danych oraz kontrola terminu |
| Dostępność | Większy tekst, focus, klawiatura, ograniczony ruch | Test czytnika ekranu, powiększenia i ukończenia sprawy przez osoby o różnych potrzebach |
| Publikacja | Lokalny adres i paczka statyczna | Publiczny HTTPS sprawdzony bez konta, także na telefonie |

## Główny scenariusz prezentacji

1. Obywatel pisze: „Przeprowadzam się do Warszawy”.
2. Podaje dane raz; aplikacja pokazuje tylko brakujące pytania.
3. Widzi pakiet wybranych formalności i wymagania każdej z nich.
4. Sprawdza odbiorców oraz zakres danych przed zatwierdzeniem.
5. Zatwierdza jednoznacznie oznaczoną symulację.
6. Widzi wyniki poszczególnych działań: przyjęte w pokazie, wymagające uzupełnienia albo do samodzielnego wykonania.
7. Wraca do sprawy później i rozumie, co już zrobiono, a co nadal wymaga jego działania.

Punkty 3–4 i 6 wymagają pogłębienia obecnej implementacji. Nie są jeszcze obietnicą działającej integracji administracyjnej.

## Jak oceniać kolejne iteracje

Porównać te same zadania i dane w obu prototypach. Zapisać ukończenie bez pomocy, liczbę działań, cofnięcia, błędy i zrozumienie zgody. Czas mierzyć dopiero w powtarzalnej procedurze; nie utożsamiać szybkości automatyzacji z szybkością użytkownika. Oddzielać wyniki testów od opinii o estetyce.

Przewagę należy prezentować jako konkretny wynik w określonym zadaniu. Wynik pojedynczego benchmarku nie uprawnia do ogłoszenia całkowitej wyższości produktu ani przewidywania decyzji jury.

## Sprawdzony punkt porównawczy

W publicznej wersji referencji z profilem Kacpra wpisano „Przeprowadzam się do Warszawy”. Interfejs odpowiedział brakiem obsługi i propozycjami innych tematów. W naszym prototypie ta sama intencja uruchomiła proces przeprowadzki z edytowalną miejscowością Warszawa. To wykazana różnica w obsłudze jednego zadania, nie ocena całej aplikacji. Dowody: `benchmark-moving.json`, `screenshots/reference-moving.png`, `screenshots/own-moving.png`.
