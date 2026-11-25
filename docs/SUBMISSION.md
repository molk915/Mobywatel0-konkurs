# mObywatel MOST na mObywatel Challenge

## Tytuł

mObywatel MOST — bliska osoba pomaga, decyzja należy do Ciebie

## Opis zgłoszenia

Kiedy Ewa potrzebuje pomocy przy sprawie urzędowej, mObywatel MOST pozwala jej przekazać wnukowi Kacprowi wybraną sprawę. Ustala, które czynności może wykonać i jak długo ma dostęp. W zakładce **Moje** Ewa widzi swoje sprawy, przyznane upoważnienia i historię działań. Może też cofnąć dostęp.

Kacper widzi przekazane sprawy i udostępnione terminy w zakładce **Pomagam**. Przy mandacie zapisuje szkic i może potwierdzić płatność, jeśli Ewa przyznała mu takie uprawnienie. Przy piśmie Kacper może przygotować odpowiedź do decyzji Ewy. Ewa przegląda treść i załącznik, zatwierdza pakiet albo prosi o poprawki.

Prototyp działa bez logowania i korzysta z fikcyjnych danych. W jednej karcie można przełączyć się między profilami, sprawdzić zakres Kacpra i zobaczyć wynik po stronie Ewy.

## Próba dla jurora

Główny link prowadzi do `/?start=most-hub` na publicznej domenie. Cały scenariusz można przejść w jednej karcie.

1. W **MOST → Moje** u Ewy wybierz **Przekaż sprawę Mandat drogowy**. Sprawdź zakres, przejdź do potwierdzenia i wybierz **Potwierdź dostęp**.
2. Kliknij nazwę profilu nad panelem MOST i wybierz Kacpra. W **Pomagam** otwórz udostępniony mandat na 150 zł.
3. Wybierz **Opłać mandat**, zaznacz BLIK, zapisz szkic i potwierdź płatność demo.
4. Wróć do listy spraw, przełącz profil na Ewę i otwórz **Moje**. Mandat ma status **Zakończona**. W historii sprawy widać działania Kacpra.

Pod `/?pokaz=most3` oba telefony mają własne Dokumenty, Sprawy, Usługi, Dane i MOST. Wejdź w MOST Ewy i wybierz **Przygotuj zaproszenie**, a następnie **Wyślij zaproszenie do Kacpra**. Drugi telefon wyświetli zaproszenie na aktualnym ekranie. Scenariusz pisma urzędowego opisany poniżej jest również dostępny pod `/?pokaz=most`.

### Pokaz w 60 sekund

1. Otwórz `/?pokaz=most` i uruchom demonstrację. U Ewy wybierz **Poproś o pomoc** i pokaż, że zaproszenie dotyczy konkretnego pisma oraz wybranych czynności.
2. Utwórz zaproszenie. U Kacpra otwórz sprawę i przygotuj trzy pozycje z listy **Twoje zadania**, korzystając z adresu, uzasadnienia i kopii demo.
3. Przekaż pakiet Ewie. Pokaż komunikat **Teraz Twoja kolej**, sprawdź zawartość i zatwierdź. W drugim oknie status zmieni się automatycznie.

### Pokaz w 3 minuty

1. Zamiast dołączać kopię demo u Kacpra, wybierz **Poproś Ewę o dokument**. U Ewy udostępnij kopię umowy z ekranu sprawy. U Kacpra dołącz kopię i przekaż całość.
2. U Ewy wybierz **Poproś o poprawki**. Wpisz uwagę do uzasadnienia. U Kacpra zapisz zmienione uzasadnienie i odeślij pakiet.
3. U Ewy pokaż poprzednie i aktualne uzasadnienie w sekcji **Pakiet po poprawkach**. Zatwierdź, przejdź do historii i cofnij dostęp. U Kacpra pojawi się informacja o zakończeniu dostępu.

### Co można pokazać i zweryfikować

| Element | Zachowanie prototypu |
| --- | --- |
| Jedna sprawa dla dwóch osób | Serwer synchronizuje konkretne zadania, prośby o dokument i decyzje w dwóch niezależnych sesjach. |
| Dostęp dobrany do sprawy | Link przekazuje wyłącznie rolę i zakres dla jednej sprawy. Wygaśnięcie i cofnięcie są egzekwowane przez serwer. |
| Decyzja właściciela | Ewa widzi zawartość i wcześniejsze wartości po poprawkach. Jej decyzja dotyczy konkretnie sprawdzonej wersji pakietu. |
| Dane i wynik | Pismo, osoby i kopie umowy są fikcyjne. Zatwierdzenie zapisuje stan pokazu. Doręczenie i podpis urzędowy pozostają poza zakresem. |

## Uruchomienie i publikacja

Zaimportuj repozytorium do Vercela jako projekt Vite. Utwórz projekt PostgreSQL na planie Free w Neon i dodaj jego adres połączenia z włączonym poolingiem jako `DATABASE_URL` w zmiennych środowiskowych Vercela. Zostaw `MOST_BACKEND_URL` puste, aby korzystać z API w Vercelu. Funkcja tworzy tabelę stanu przy pierwszym wywołaniu. Termin i ważność uprawnień są sprawdzane przy odczycie Centrum kontroli.

Jeśli API działa na osobnym serwerze, zamiast `DATABASE_URL` ustaw `MOST_BACKEND_URL` na jego pełny adres HTTPS bez ścieżki. W środowisku tego serwera ustaw `APP_ORIGIN` na adres aplikacji w Vercelu.

Tryb demonstracyjny działa bez klucza. Aby włączyć własny model, dodaj w zakładce **Environment** usługi `ASSISTANT_PROVIDER=compatible`, `MODEL_BASE_URL`, `MODEL_NAME` i `MODEL_API_KEY`. Po wdrożeniu sprawdź publiczne ścieżki `/api/health` i `/?start=most-hub`.

Przykład lokalnego uruchomienia tego samego obrazu, który można wdrożyć na serwerze z Dockerem.

```text
docker build -t mobywatel-most:contest .
docker run -d --name mobywatel-most --restart unless-stopped -p 127.0.0.1:4197:8080 -e APP_ORIGIN=http://localhost:4197 --mount type=volume,source=mobywatel-most-data,target=/var/lib/most mobywatel-most:contest
```

W wariancie Docker użyj jednej instancji kontenera z trwałym wolumenem `/var/lib/most`. Ustaw `APP_ORIGIN` na dokładny publiczny adres HTTPS bez końcowego ukośnika i skieruj ruch HTTPS na port kontenera 8080. Endpoint `GET /api/health` sprawdza dostępność procesu. Sesje MOST właściciela wygasają po 14 dniach, a zaproszenia Kacpra po 10 minutach. Nowe wejście bez zapisanej sesji tworzy nową sprawę na danych demonstracyjnych.

Po wdrożeniu przejdź cały scenariusz na publicznym adresie w nowym oknie prywatnym i sprawdź, czy status oraz historia pozostają po odświeżeniu. Formularz wymaga linku HTTPS działającego bez logowania do czasu ogłoszenia wyników. Termin podany przez organizatora to 30 listopada 2026, do końca dnia w Polsce. [Oficjalne warunki konkursu](https://mobywatel.ai/)
