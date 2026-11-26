# mObywatel Razem

**Twoje sprawy. Twoja decyzja. Nie musisz działać sam.**

Decyzje projektowe, 17 listopada 2026. Repozytorium startowe było puste — brak istniejącego interfejsu do poprawy.

## Teza
Obywatel opisuje sytuację, aplikacja porządkuje formalności. Rdzeniem jest trwała sprawa z planem, minimalnym zakresem danych, świadomym zatwierdzeniem i potwierdzeniem. Rozmowa pomaga, ale nie zastępuje nawigacji.

## Architektura informacji
Start: portfel, pilna sprawa, asystent i bieżący postęp. Dokumenty: cztery osobne dokumenty z detalami i selektywnym udostępnianiem. Sprawy: rozpoczęte, zakończone i trzy sytuacje życiowe. Dane: aktywne zgody, historia dostępu, zakres i cel. Profil: zmiana persony demonstracyjnej, dostępność, instalacja, reset.

## Trzy ścieżki
Przeprowadzka: kontekst → adres i termin → plan oraz odbiorcy → podsumowanie i zgoda → symulowane potwierdzenie i dalsza lista.
Portfel: wybór utraconych rzeczy → plan ochrony → osobne konsekwencje PESEL/dowodu/banku → potwierdzenie → lokalny status i kroki do samodzielnego wykonania.
Pismo: przykładowe pismo lub wklejony tekst → proste wyjaśnienie z odniesieniami do treści → wybór działania → sprawdzenie szkicu → symulowane zapisanie odpowiedzi.

## Język wizualny
Mobilne proporcje 390 px, dotykowe kontrolki min. 44 px, grafit, kredowe tło, czerwień malinowa, zieleń statusu. Duże tytuły, krótkie akapity, listy z separatorami. Karta dokumentu z liniowym wzorem zabezpieczającym, widocznym oznaczeniem DEMO i inicjałami zamiast pożyczonego zdjęcia. Brak kopiowania godła i zdjęć referencji. Ramka telefonu tylko na desktopie. Ruch respektuje prefers-reduced-motion.

## Badanie referencji
Źródła: https://mobywatel.ai i https://mobywatel.ai/aplikacja?osoba=kacper. Oglądano działający portfel, szczegóły dokumentów, listę przypomnień, skrzynkę, rozmowę o sprawach, utratę portfela, potwierdzenie, historię oraz zmianę profilu. Mocne strony: realistyczna obudowa, szybki portfel, zwięzły język. Obserwacje: nakładające się karty utrudniają trafienie; ukryte dialogi pozostają w drzewie dostępności; odpowiedź o wszystkich sprawach dla Kacpra pokazuje dane Toyoty z innej persony; daty przykładowych przypomnień są starsze od daty urządzenia. Procesy są osadzone w długiej rozmowie, bez stałego widoku etapu. Nasze rozwiązanie: osobne, wznawialne sprawy, dane izolowane per profil, lista dokumentów i jawny ślad zgód.

## Inspiracje i własne wnioski
LifeSG organizuje usługi wokół momentów życia: https://www.life.gov.sg/moments-of-life-is-now-lifesg. Wniosek projektowy: jedna przeprowadzka może łączyć kilka obowiązków.
Estoński Data Tracker pokazuje operacje na danych: https://ria.ee/en/state-information-system/people-centred-data-exchange/data-tracker. Consent Service pozwala przeglądać i wycofywać zgody: https://www.ria.ee/en/state-information-system/people-centred-data-exchange/data-consent-service. Wniosek: obywatel widzi odbiorcę, cel i zakres, a udostępnienie wieku nie wymaga numeru dokumentu.
TAMM łączy kontekstową pomoc z usługami: https://www.dge.gov.ae/en/news/dge-abu-dhabi-launches-tamm-3. Wniosek: asystent przekazuje użytkownika do procesu, a nigdy sam go nie zatwierdza.

## Konkurs
Publiczna strona wymaga klikalnego prototypu bez logowania, linku HTTPS i opisu; wskazuje termin 30.11.2026 do końca dnia w Polsce. Polskie modele są mile widziane, nieobowiązkowe. Prawa pozostają przy autorze; należy mieć prawa do materiałów. Strona nie publikuje punktowej rubryki oceny. Podkreśla prostotę, wygodę, dostępność i kompletne sprawy. Nie jest oficjalną usługą administracji. Formularza nie wysłano. Spełnienie wymogu publicznego linku pozostaje krokiem wdrożeniowym po wyborze hostingu przez autora.

## Granice demonstracji
Brak połączeń urzędowych, biometrii i prawdziwego modelu AI. Lokalna, deterministyczna analiza intencji i wzorców tekstu. Wyjaśnienie dowolnego pisma nie stanowi analizy prawnej. Operacje zmieniają wyłącznie stan przeglądarki. API produkcyjne wymaga serwera, autoryzacji, weryfikacji procedur, bezpiecznego podpisu i audytu.
