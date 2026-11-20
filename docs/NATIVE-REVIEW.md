# Wersja z 17 listopada 2026: dokumenty i procesy

## Zmiana produktu

Kontynuacja istniejącej aplikacji; zachowane scenariusze, zapis, załączniki, zgody i profile. Portfel prezentuje jeden dokument, przełączany zakładką, klawiaturą lub gestem. Zdjęcia są wygenerowanymi fikcyjnymi portretami, a grafika samochodu jest autorskim SVG. Kolor dokumentu rozróżnia kategorię; czerwony akcent prowadzi do najważniejszych działań. Bez godła, wzoru urzędowego i zdjęć z referencji.

„Sprawy” mają trzy stany: Do zrobienia (jawne przypomnienia demo), W toku (robocze formularze i pakiety wymagające działania), Zakończone (wyniki symulacji). Katalog trzech sytuacji jest otwierany osobno. Zakończenie symulacji nie jest zakończeniem rzeczywistej czynności urzędowej; kroki do wykonania poza aplikacją są oznaczone.

Przeprowadzka jest trwałym pakietem z osobnymi wynikami formalności. Można uzupełnić dokument, potwierdzić samodzielny krok, obejrzeć historię i otworzyć asystenta znającego status tej sprawy. Historia pozostaje niezależna od rozmowy. Plan przed zgodą wyjaśnia odbiorców i zakres; dodatkowa karta kontroli tłumaczy powód, użyte informacje i konsekwencje potwierdzenia.

Symulator „Co się stanie, jeśli?” obejmuje jeden ograniczony przykład: dorosły obywatel Polski, przeprowadzka na stałe, bez działalności gospodarczej. Zmiana sposobu zamieszkania zmienia wymagane dokumenty; opcjonalny krok podatkowy zmienia ścieżkę. Wybór tworzy edytowalny plan, nigdy wniosek. Założenia i linki źródłowe znajdują się w interfejsie. Kwota 0 zł dotyczy wyłącznie usługi zameldowania. Nie jest kalkulacją całej przeprowadzki.

## Faktyczny audyt referencji

Źródła: ZIP użytkownika z Downloads, [publiczny prototyp](https://mobywatel.ai/aplikacja?osoba=kacper), [konkurs](https://mobywatel.ai/). Przeczytano README, logikę dokumentów i rozmów w core.js, animacje style.css, scenariusze, znak.js oraz backend: server.py, agent.py, narzedzia.py i akcje.py. Import definicji potwierdził 33 narzędzia odczytu, 27 akcji i 6 narzędzi UI. Referencja obsługuje dostawców OpenAI, Anthropic i zgodne API, głos oraz bazę wiedzy. Nie testowano płatnych modeli ani głosu bez kluczy.

Referencję z ZIP uruchomiono lokalnie na Pythonie, z usuniętymi kluczami dostawców z procesu. W przeglądarce sprawdzono scenariusz zgubionego portfela: wybór dokumentu → podgląd operacji → zgoda → symulowane Face ID → wynik. Publiczny prototyp i ZIP odpowiadają na „Przeprowadzam się z Warszawy do Krakowa” komunikatem o braku obsługi w tej wersji. Dowody: native-audit.json, reference-zip-audit.json i zrzuty reference-current-*, reference-zip-*.

Agent backendowy referencji wykonuje narzędzia odczytu i generuje karty akcji; wykonanie akcji następuje po potwierdzeniu. Znak korzysta z kamery za zgodą, dekodera, odnawianych żetonów i komunikacji serwerowej. Nie przeprowadzono wymiany między dwoma fizycznymi urządzeniami ani pełnej regresji wszystkich 60 narzędzi. Samo istnienie kodu nie stanowi dowodu działania każdej gałęzi.

## Porównanie tych samych kryteriów

| Kryterium | Nasza wersja | Referencja i ograniczenia oceny |
|---|---|---|
| Wygląd | Własne dokumenty, portrety, biało-czerwony detal, spójne powierzchnie. Obejrzane zrzuty wszystkich zakładek. | Mocniejsze, rozpoznawalne materiały dokumentów i bogatsze ilustracje; część zasobów wyłączona z MIT. Preferencja estetyczna wymaga oceny ludzi. |
| Ruch | Sprężynowe przełączanie i przesuwanie dokumentów, przejścia warstw, obsługa ograniczenia ruchu. Testowane rzeczywiste gesty i klawiatura. | Dopieszczone przejście stosu w rozmowę i wiele wariantów dokumentów. Nie dowiedziono globalnej przewagi płynności naszej wersji. |
| Intuicyjność | Osobna sprawa i następny krok, bez szukania w historii rozmowy. | Bardzo krótka droga do działania z głównego pola rozmowy; sprawdzono portfel. Brak badania z użytkownikami obu wersji. |
| Szczegóły | Jawna zgoda, powrót do dokumentu po udostępnieniu, odwołanie zgody, zapis plików i historia etapów. | Kontekstowe karty, Face ID, kamera i wymiana danych. Nasz kod udostępniania jest ilustracyjny, bez skanowania między urządzeniami. |
| Zakres | Trzy kompletne scenariusze demonstracyjne, symulator przeprowadzki. | Zdecydowanie większy katalog narzędzi i scenariuszy. Nie twierdzimy, że mamy szerszy zakres. |
| Jakość przeprowadzki | Edytowalny plan, osobne statusy, uzupełnienie dokumentu, ręczny krok, historia i trwały powrót. | Potwierdzony brak gotowej obsługi tego polecenia w skryptowym pokazie. Backend LLM może udzielać wskazówek przez gdzie_zalatwic/karta_uslugi; tego nie zbadano bez modelu. |
| Innowacja | Połączenie trwałego pakietu, interaktywnego wariantu decyzji i kontekstowego asystenta w tym konkretnym scenariuszu. | Referencja już łączy kolejne czynności, np. zakup auta i świadczenia po narodzinach dziecka. Sam pakiet, AI lub karta zgody nie są nowym wynalazkiem. |
| Wiarygodność | Wyraźna symulacja, odróżnienie zapisu od wysyłki, źródła założeń. | Niezależny prototyp, bez rzeczywistego połączenia z administracją. Obie wersje to koncepcje. |

## Weryfikacja

- 24 testy logiki, nawigacji, załączników, service workera i backendu; 11 testów w Chromium. Ponownie uruchomione po końcowych zmianach.
- Mobilny 390 × 844, mały 320 × 740, desktop 1280 × 1040 z urządzeniem. Zrzuty faktycznie obejrzano; poprawiono wykryte obcięcie przycisku asystenta i błąd powrotu do zakończonej sprawy.
- Wszystkie trzy scenariusze, walidacja zgody, odświeżenie, offline, trzy profile, wyszukiwanie dokumentów, gest, klawiatura, tworzenie i odwołanie zgody, plik TXT z dysku testowego, pobranie i historia po odświeżeniu.
- Próbka requestAnimationFrame podczas zmiany dokumentów: mediana ok. 16,7 ms, p95 ok. 16,8 ms w izolowanym Chromium na tym komputerze. To pomiar środowiska testowego, nie gwarancja wydajności urządzeń użytkowników.
- Rzeczywista integracja z płatnym/hostowanym modelem nie została uruchomiona. Adapter sprawdzono atrapą dostawcy; HTTP backendu sprawdzono rzeczywistymi żądaniami lokalnymi.

Pozostaje niezależna ocena użytkowników, VoiceOver/TalkBack, klawiatura i instalacja na fizycznym iOS/Android oraz test produkcyjnego hostingu HTTPS. Nie opublikowano aplikacji i nie wysłano zgłoszenia.
