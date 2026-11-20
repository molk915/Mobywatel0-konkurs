# Kontrola wizualna Portfela — 17 listopada

Zakres: wyłącznie prezentacja Portfela i dokumentów. Backend, scenariusze i logika spraw pozostały bez zmian. Stan początkowy nadal wybiera mDowód.

## Diagnoza na podstawie ekranu użytkownika i obu inspiracji

1. Jednakowa szerokość, odstęp 32 px i duża wysokość aktywnej karty spłaszczały stos do pasków. Inspiracje mają wyraźne grzbiety i spójną geometrię fizycznych obiektów.
2. Duże imię oraz wielki watermark PL konkurowały z typem dokumentu. Dane niższego poziomu były za drobne, a kompozycja przypominała kartę profilu.
3. Przełącznik, instrukcja, podpis, kropki, dwa przyciski i dwa panele tworzyły zbyt wiele niezależnych elementów. Dokument tracił pierwszeństwo.

## Pierwszy przegląd: obrazy art-stack-1 i art-carousel-1

Stos: zmiana proporcji na 350 × 232 px i odstępu warstw na 46 px poprawiła rozpoznawalność dokumentów, ale równa szerokość nadal osłabiała głębię. Etykiety metadanych były zbyt drobne. Dolny obszar wymagał jednej dominującej akcji.

Karuzela: centralna karta była czytelniejsza, lecz luka nad nią pozostała za duża. Sąsiednie dokumenty pokazywały ucięte twarze i fragmenty danych. Wielkość sekcji nie odpowiadała nowej wysokości dokumentu.

## Drugi przegląd: obrazy art-stack-2 i art-carousel-2

Poprawki: delikatne zwężanie tylnych kart, większe etykiety, spójne promienie, dyskretne cienie i spokojne materiały. Usunięto duży watermark oraz instrukcje i redundantne wskaźniki. Opcje przeniesiono do menu; nawigacja klawiaturą pozostaje dostępna. Udostępnianie jest główną akcją, szczegóły akcją drugorzędną. Asystent na Portfelu ma formę spokojnego wiersza bez osobnego kafla.

Karuzelę podniesiono i skrócono jej sekcję. Nieaktywne karty pokazują kolor oraz nazwę na krawędzi zamiast przypadkowo uciętych danych właściciela. Aktywna karta zachowuje całą zawartość. Wersja stosu i karuzeli były osobno otwierane i oglądane przy 390 × 844.

Ocena: rezultat jest spokojniejszy i hierarchicznie czytelniejszy od zgłoszonej wersji. Nie jest to dowód uzyskania jakości Apple Wallet — ocena estetyczna należy również do użytkownika. Testy funkcjonalne są osobnym sprawdzeniem zachowania, nie miarą jakości projektu.

Zachowano gesty, rozwijanie, menu widoku, szczegóły, udostępnianie i zapisany kontekst spraw. Sprawdzono ponownie trzy pełne scenariusze i oba tryby gestów.
