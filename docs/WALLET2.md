# Wallet Experience 2.0

Kontynuacja istniejącego projektu. Nowy GestureDeck oddziela geometrię i gesty od danych oraz wyglądu DigitalCard.

## Inspiracje i decyzje

Obejrzano oba obrazy użytkownika. Przeniesiono duże proporcje kart, regularne nakładanie, spokojne tło i czytelne grzbiety; nie kopiowano znaków banków, Apple, przewoźników ani grafik kart. Stos jest prosty i pozbawiony przypadkowego skręcenia. Karuzela pokazuje sąsiadów po bokach i zmienia ich skalę. Motyw dokumentów pozostaje biało-czerwony, z odrębną kompozycją prawa jazdy, pojazdu i EKUZ.

## Dwa tryby

Stos rozwija się pionowym przeciągnięciem albo przyciskiem. Odstępy i wysokość wynikają z ciągłej wartości ruchu. Po zwolnieniu sprężyna kończy gest. W rozwiniętym stosie działa natywne przewijanie strony; przycisk pozwala go zwinąć. Dotknięcie dokumentu wybiera go i otwiera jego szczegóły z tym samym layoutId.

Karuzela przesuwa wszystkie dokumenty razem z palcem. Skala wynika z odległości od środka. Krótki gest wraca do bieżącego dokumentu. Dotknięcie sąsiada sprowadza go na środek; dotknięcie środkowej karty otwiera szczegóły. Układ jest zapamiętywany lokalnie. Strzałki klawiatury i dotychczasowy wybór dokumentów pozostają dostępne. Reduced motion wyłącza sprężynowe przejścia.

## Dokument prowadzi do działania

Pojazd ma informację o zbliżającym się badaniu. W szczegółach przycisk zmiany adresu właściciela uruchamia istniejącą przeprowadzkę z wybranym krokiem pojazdu i kontekstem WX DEMO. Udostępnianie, asystent i wcześniejsze trzy scenariusze pozostają zachowane. Sprzedaży pojazdu nie dodawano jako czwartego, nieukończonego scenariusza.

## Weryfikacja

Pełna regresja: 16 testów przeglądarkowych, w tym dwa nowe dla rozwijania stosu, rzeczywistej pozycji karty podczas przeciągania i zapisu trybu. Sprawdzane są także krótkie gesty i dotknięcie sąsiada. Zrzuty wallet2-* obejmują stos, rozwinięcie, karuzelę, ekran 320 px i ramkę telefonu. Domyślny asystent pozostaje demonstracyjny. Fizyczne urządzenia i czytniki ekranowe wymagają osobnej próby. Nic nie opublikowano.
