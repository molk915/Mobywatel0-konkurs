# Zdrowie i pomoc w przygotowaniu wizyty

Wejście do modułu znajduje się w **Sprawy → Zdrowie**. Profil Ewy ma przykładowe skierowanie, recepty, wyniki i historię leczenia. Dane Aleksandry i Kacpra są oddzielne. Główna dolna nawigacja ma cztery pozycje.

## Pomoc w ramach aplikacji

W zwykłej aplikacji wybierz profil Ewy. Otwórz skierowanie ze **Spraw → Zdrowie** lub ze wspólnego centrum powiadomień.

1. U Ewy otwórz nowe skierowanie okulistyczne i wybierz **Poproś o pomoc**.
2. Ustaw szczegóły dostępne dla Kacpra, uprawnienie do przygotowania wizyty oraz czas. Wybierz **Utwórz upoważnienie**. W Upoważnieniach wybierz **Otwórz zadanie Kacpra** lub skopiuj link do jego przeglądarki.
3. Link otwiera przydzielone zadanie w Sprawach, w tej samej aplikacji. Możesz do niego wrócić przez **Sprawy → Wspólne → Pomoc dla Ewy** albo przez dzwonek. Wybierz **Przygotuj wizytę**, wskaż placówkę i termin, dostosuj listę przygotowań i przekaż plan do zatwierdzenia.
4. U Ewy otwórz powiadomienie o gotowym planie. Zatwierdź wizytę lub wpisz fikcyjną uwagę i zwróć plan do poprawy albo odrzuć.
5. Po zatwierdzeniu sprawdź **Wizyty → Nadchodzące**, powiadomienie Kacpra i historię działań Ewy w **Upoważnieniach**.
6. Cofnięcie dostępu działa z **Upoważnień** na każdym etapie. Profil aplikacji wybiera się jawnie, a link ze skierowaniem przyznaje dostęp tylko do zadania.

Z poziomu szczegółów wyniku lub zaplanowanej wizyty można udostępnić pojedynczy dokument do odczytu. Przycisk **Przypomnij jutro** na skierowaniu ustawia przypomnienie w dzwonku, które można wyłączyć przed upływem terminu.

## Uruchomienie lokalne

W trybie deweloperskim uruchom `npm run server` i `npm run dev` w osobnych terminalach. Frontend startuje domyślnie na porcie 5173. W trybie produkcyjnym wykonaj `npm run build`, a następnie uruchom `npm run server` z `SERVE_DIST=1` i `APP_ORIGIN` ustawionym na adres pokazu. Opcjonalne `PORT` zmienia domyślny port 4190.

## Zakres prototypu

- Wszystkie placówki, terminy, dokumenty, kody recept i zdarzenia są demonstracyjne. Zatwierdzenie dodaje termin do terminarza aplikacji. Połączenie z IKP i P1 jest koncepcją.
- Serwer przechowuje dane w pamięci. Sesja Zdrowia jest ważna do 60 dni. Odświeżenie zachowuje sesję w tej samej karcie. Restart procesu rozpoczyna nową sesję. Link daje dostęp osobie, która go posiada, na 5, 15 lub 60 minut. Cofnięcie zamyka odczyt i zapis od razu. Otwarty ekran usuwa dane przy kolejnym odczycie, zwykle po około sekundzie.
- Powiadomienia działają wewnątrz prototypu. W terminarzu dostępna jest symulacja przypomnień, kod recepty ma prefiks DEMO, a dokument wyników można pobrać jako plik tekstowy. Asystent Zdrowia pomaga organizacyjnie i pozwala zapisać pytania do lekarza.
- Sprawy pokazują wspólne etapy dla aktywnych procesów urzędowych, rodzinnych i zdrowotnych. Poszczególne procesy zachowują własne reguły decyzji i dane.

## Weryfikacja

`npm test` obejmuje uprawnienia, poprawki, wygaśnięcie, cofnięcie i idempotencję decyzji. `npm run test:e2e` obejmuje oba niezależne konteksty, odświeżenie, Powiadomienia, przejścia do dokumentów, filtry i wznawianie pomocy ze Spraw.
