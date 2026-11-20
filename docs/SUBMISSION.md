# mObywatel MOST na mObywatel Challenge

## Tytuł

mObywatel MOST — bliska osoba pomaga, decyzja należy do Ciebie

## Opis zgłoszenia

Gdy urząd prosi o uzupełnienie dokumentów, bliska osoba często pomaga przy jednym ekranie albo prosi o przesłanie całego pisma. mObywatel MOST jest dla osób, które chcą przyjąć taką pomoc i zachować kontrolę nad swoją sprawą. Przykładem jest Ewa, która musi odpowiedzieć na pismo dotyczące lokalu i prosi o wsparcie wnuka.

Ewa udostępnia Kacprowi jedną sprawę i wybiera, czy może on poprosić o dokument oraz komentować. Kacper otwiera zaproszenie na drugim telefonie lub w drugiej karcie. Widzi treść zadania, uzupełnia odpowiedź i przekazuje pakiet do sprawdzenia. Ewa ma podgląd adresu, uzasadnienia i załącznika. Może zatwierdzić pakiet, poprosić o poprawki albo go odrzucić. Historia pokazuje, kto wykonał poszczególne czynności. Ewa może cofnąć dostęp w trakcie współpracy.

Asystent pomaga zrozumieć pismo, a MOST prowadzi obie osoby przez przygotowanie jednej odpowiedzi w zsynchronizowanej sprawie. Prototyp działa bez logowania i korzysta z fikcyjnych danych. Zatwierdzony pakiet zapisuje się w prototypie.

## Próba dla jurora

Główny link prowadzi do `/?start=most` na publicznej domenie.

1. W sprawie Ewy wybierz **Poproś o pomoc**, sprawdź zakres i wybierz **Utwórz zaproszenie**.
2. Wybierz **Otwórz zadanie Kacpra**. W karcie Ewy wybierz **Przejdź do współpracy**.
3. Jako Kacper wstaw i zapisz adres oraz uzasadnienie demo, dołącz kopię demonstracyjną i wybierz **Przekaż do zatwierdzenia**.
4. W karcie Ewy wybierz **Sprawdź przygotowaną sprawę**. Sprawdź pakiet i wybierz **Zatwierdź pakiet**. Status zmieni się również u Kacpra.
5. Aby pokazać kontrolę dostępu, wybierz u Ewy **Zakończ współpracę → Cofnij dostęp** i wróć do Kacpra. Historia pozostaje u Ewy.

Podczas prezentacji na wspólnym ekranie można otworzyć `/?pokaz=most` i wybrać **Rozpocznij demonstrację**. Pojawią się dwa zsynchronizowane telefony obsługujące te same operacje i API.

## Uruchomienie i publikacja

Przykład lokalnego uruchomienia tego samego obrazu, który można wdrożyć na serwerze z Dockerem.

```text
docker build -t mobywatel-most:contest .
docker run -d --name mobywatel-most --restart unless-stopped -p 127.0.0.1:4197:8080 -e APP_ORIGIN=http://localhost:4197 --mount type=volume,source=mobywatel-most-data,target=/var/lib/most mobywatel-most:contest
```

Publiczne wdrożenie wymaga jednej instancji kontenera z trwałym wolumenem `/var/lib/most`. Ustaw `APP_ORIGIN` na dokładny publiczny adres HTTPS bez końcowego ukośnika i skieruj ruch HTTPS na port kontenera 8080. Endpoint `GET /api/health` sprawdza dostępność procesu. Sesje MOST właściciela wygasają po 14 dniach, a zaproszenia Kacpra po 10 minutach. Nowe wejście bez zapisanej sesji tworzy nową sprawę na danych demonstracyjnych.

Po wdrożeniu przejdź cały scenariusz na publicznym adresie w nowym oknie prywatnym i sprawdź też zeskanowanie QR drugim urządzeniem. Formularz wymaga linku HTTPS działającego bez logowania do czasu ogłoszenia wyników. Termin podany przez organizatora to 30 listopada 2026, do końca dnia w Polsce. [Oficjalne warunki konkursu](https://mobywatel.ai/)
