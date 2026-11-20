# Audyt produktu przed przebudową

| Ścieżka | Obserwacja | Zmiana |
| --- | --- | --- |
| Start i dokumenty | Start pokazuje dokumenty i dzwonek. Otwarcie mDowodu, dodawanie dokumentów i udostępnianie działają. Na starcie brakuje następnej czynności iwejścia do usług. | Zachować dokumenty na pierwszym ekranie. Dodać priorytet spraw do załatwienia i wejście do katalogu bez dodatkowej zakładki dolnej. |
| Sprawy i usługi | Sprawy mają osobiste i wspólne filtry. Zdrowie ma wejście ze Spraw, ale Rodzina i MOST zależą od wiedzy, w którym filtrze szukać. | Udostępnić jedno wejście do Zdrowia, Rodziny i pomocy. Sprawy będą nadal pokazywać przydzielone zadania wynikające ze stanu serwera. |
| MOST urzędowy | Ewa może zlecić pakiet i go zatwierdzić. Zaproszenie Kacpra ładuje osobny interfejs, a pokaz jest reklamowany w zwykłej aplikacji. | Zachować tokeny, uprawnienia i scenariusz. Otwierać zaproszenie w Sprawach, włączyć dzwonek i zadanie pomocnika do zwykłej nawigacji. Pokaz pozostanie osiągalny pod bezpośrednim adresem testowym. |
| Zdrowie | Skierowanie i wizyta działają w dwóch sesjach. Historia ma filtry, ale nie ma wyszukiwania. Udostępnianie i przypomnienia obejmują tylko dotychczasowy scenariusz skierowania i wizyty. | Dodać wyszukiwanie i szczegóły, przypomnienie dla skierowania oraz odczyt pojedynczego wyniku lub wizyty z cofanym dostępem. Usunąć techniczne etykiety z działań. |
| Rodzina i Asystent | Wniosek paszportowy i decyzja opiekuna działają przez istniejące API. Asystent zna kontekst pisma, dokumentu i skierowania. Wejście do Rodziny oraz powrót z asystenta wymagają dopracowania. | Zachować przepływ i stan Rodziny. Dodać wejście z usług i kontekstowe działania w Zdrowiu. |
| Stan i powiadomienia | Dane lokalne są podzielone według profilu. MOST, Rodzina i Zdrowie mają osobne reguły domenowe i tworzą zdarzenia widoczne we wspólnej skrzynce. Poprzedni test Zdrowia ujawnił niejednoznaczny selektor po osadzeniu widoku pomocnika w aplikacji. | Listy i skrzynka korzystają z projekcji serwera właściwych dla każdej roli. Zaproszenia zachowują stan po odświeżeniu. Testy użyją dzwonka we właściwym widoku i sprawdzą powrót do zadań. |

Kolejność prac obejmuje nawigację i wejście do usług, osadzenie obu ról MOST w aplikacji, obsługę udostępniania i przypomnień w Zdrowiu oraz regresję z przejściem rzeczywistych scenariuszy w przeglądarce.
