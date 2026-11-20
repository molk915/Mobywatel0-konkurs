# Przebudowa po uwagach o portfelu i ekranie spraw

## Co zmieniło się w działającej aplikacji

Portfel jest teraz talią czterech osobnych dokumentów. Tylne karty mają dostępne do dotknięcia grzbiety, a wybrana karta wychodzi na przód ze sprężynowym ruchem. Obsługiwane są gest poziomy, klawiatura i bezpośredni wybór. Projekty kart są własne: neutralny mDowód z portretem i biało-czerwonym detalem, prawo jazdy, karta pojazdu z autorską ilustracją i dokument dodatkowy. Jedna implementacja `DigitalCard` jest używana w portfelu i szczegółach; Motion łączy ich położenie przy otwieraniu. Dokumenty pozostają jawnie fikcyjne.

Pod talią znajdują się działania dotyczące wybranego dokumentu. Przypomnienie otwiera rzeczywisty dolny panel. Można go zamknąć przyciskiem, klawiszem Escape, dotknięciem tła lub gestem w dół. Rozpoczęcie sprawy czeka na domknięcie panelu, aby nie pozostawiać dwóch nakładających się dialogów.

Asystent ma jedno wejście nad dolną nawigacją. Nawigacja zawiera Portfel, Sprawy i Dane. Pasek zmienia opis zależnie od ekranu i zapisanych procesów. Asystent otrzymuje ograniczony kontekst: ekran, numer wybranego dokumentu, etap rozpoczętej sprawy i status ochrony. Polecenie „Udostępnij ten dokument” tworzy kartę prowadzącą do właściwego zakresu, np. uprawnień kategorii B. „Kontynuuj sprawę” otwiera zapisany etap, bez ponownego uzupełniania danych. W szczegółach dokumentu jest także działające wejście „Zapytaj o ten dokument”.

„Sprawy” mają krótki nagłówek, rozpoczęcie nowej sytuacji i zachowane trzy statusy. Główne karty nazywają następną czynność, np. „Uzupełnij nowy adres” lub „Dołącz dokument do zameldowania”. Nie sugerują pracy urzędu ani autonomicznego działania AI. Informują o przygotowanym planie i potrzebnej decyzji użytkownika.

Przeprowadzka ma interaktywną oś etapów prowadzącą do konkretnej formalności, widoczne zależności dokumentu i zameldowania, datę pobytu, ograniczony przykład terminu oraz pobierany szkic danych TXT. Wciąż działa uzupełnienie lokalnego pliku, osobne wyniki, ręczne potwierdzenie kroku zewnętrznego, historia, kontekstowy asystent i odtworzenie po odświeżeniu. Szkic nie jest formularzem urzędowym. Założenia terminu dla obywatela Polski i pobytu stałego mają odnośnik do [gov.pl](https://www.gov.pl/web/gov/zamelduj-sie-na-pobyt-staly-lub-czasowy-dluzszy-niz-3-miesiace).

„Dane” pokazują działający wybór minimalnego zakresu i podgląd wyniku. Wybór jest przekazywany do rzeczywistego ekranu zgody. Są aktywne zgody, odwołanie tam, gdzie jest możliwe, historia i jawna informacja o kontekście używanym przez asystenta. Odbiorca pozostaje widoczny również przy aktywnym kodzie. Usunięto duże hasła reklamowe.

## Porównanie z referencją

Referencja ma stos, karuzele, listę i siatkę, co potwierdzają `variants.js` oraz screenshot użytkownika. Sam stos, wybór układu, interaktywna karta zgody i AI nie są naszą innowacją. Nie dodawaliśmy pięciu wariantów układu kosztem jakości jednego.

Naszym konkretnym argumentem pozostaje przebadana ścieżka przeprowadzki: plan istnieje niezależnie od rozmowy, ma osobne wyniki, brakujący dokument, krok zewnętrzny, historię i powrót do zapisanego etapu. W publicznej skryptowej referencji i w uruchomionym ZIP-ie to samo polecenie o przeprowadzce nie uruchamia gotowego procesu; dowody są w `reference-zip-audit.json` i `native-audit.json`. Referencja backendowa ma narzędzia informacji o usługach i szerszy zakres — bez uruchomienia modelu nie można wnioskować o wszystkich jej odpowiedziach.

Ocena wizualna obejmowała analogiczne widoki mobilne i ramkę telefonu. Referencja pozostaje mocna pod względem rozpoznawalnych materiałów dokumentów, głosu, aparatu, wymiany danych i zakresu narzędzi. Nasza wersja nie ma tych wszystkich możliwości i nie twierdzimy, że wygrywa w każdym kryterium. Jakość estetyczna wymaga także oceny użytkowników, nie tylko testów technicznych.

## Weryfikacja i ograniczenia

Sprawdzono trzy kompletne scenariusze, jawne zgody, osobne statusy, rzeczywiste pliki testowe i pobieranie, historię, odświeżenie, PWA offline, trzy profile, wyszukiwanie, klawiaturę, gesty, panel i kontekst asystenta. Rozmiary: 390 × 844, 320 × 740, 1280 × 1040. Zrzuty `experience-*` zostały faktycznie obejrzane; pomiar klatek i szerokości interfejsu zapisuje `experience-audit.json`.

Nie przeprowadzono testów na fizycznym iOS/Android, VoiceOver/TalkBack ani integracji z płatnym modelem. Domyślny asystent jest jawnym trybem regułowym; backend i kontrakt są gotowe do dalszej integracji. Nie publikowano aplikacji i nie wysłano zgłoszenia.

Starszy [przegląd](NATIVE-REVIEW.md) opisuje wcześniejszą wersję. Obecne komponenty: `DeckWallet`, `DigitalCard`, `CaseHub`, `PrivacyHub`, `ProcessRoute`.

Wynik końcowy: kompilacja produkcyjna poprawna, 25/25 testów logiki i backendu oraz 14/14 testów Chromium. Test pliku przeprowadzki sprawdza także rzeczywistą zawartość pobranego szkicu. Lokalny podgląd na porcie 4173 odpowiada HTTP 200.

Pomiar ruchu po kontroli jakości: przed optymalizacją 240 klatek, p95 33,4 ms i maksimum 150 ms; po usunięciu zbędnej perspektywy, przygotowaniu warstw kompozycji i asynchronicznym dekodowaniu portretów: p95 16,7 ms, maksimum 33,4 ms, bez klatek ponad 40 ms i bez long tasks w tej próbie. Surowe wyniki: motion-before-compositing.json i motion-audit.json. To porównanie lokalnego środowiska Chromium, nie gwarancja dla urządzeń użytkowników.
