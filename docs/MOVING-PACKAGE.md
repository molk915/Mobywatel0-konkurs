# Pakiet przeprowadzki

Aktualizacja z 17 listopada 2026. Zachowano obecny portfel i nawigację.

Przed potwierdzeniem użytkownik widzi osobny zakres danych i odbiorcę każdej wybranej formalności. Po potwierdzeniu powstają odrębne wyniki:

- Zameldowanie czeka na potwierdzenie prawa do lokalu. Użytkownik może dołączyć plik lokalnie lub użyć rzeczywistego demonstracyjnego pliku TXT. Po zapisie status zmienia się na przyjęty w symulacji.
- Aktualizacja adresu podatkowego otrzymuje osobny numer i status przyjęcia w symulacji.
- Wybrana sprawa pojazdu pozostaje oznaczona jako krok do samodzielnego wykonania.

Każda formalność ma numer, odbiorcę, minimalny zakres danych oraz opis wyniku. Historia dostępu zawiera osobne zdarzenia dla formalności; uzupełnienie załącznika tworzy dodatkowy wpis. Załączniki pozostają w IndexedDB, bez wysyłania do urzędów. Statusy i pliki przetrwają odświeżenie. Stare potwierdzenia z wcześniejszych wersji pozostają czytelne.

Weryfikacja: build produkcyjny, 20 testów jednostkowych i 5 scenariuszy przeglądarkowych. Dodatkowy test obejmuje uzupełnienie dokumentu, przejście dwóch formalności do przyjętych i zachowanie wyniku po odświeżeniu.
