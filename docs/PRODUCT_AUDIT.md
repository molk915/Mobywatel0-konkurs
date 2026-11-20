# Audyt produktu

## Stan przed dodaniem Zdrowia

- Cztery miejsca w dolnej nawigacji działają. Sprawy mają już podział Moje/Wspólne, więc Zdrowie otrzyma widoczne wejście z katalogu usług w Sprawach i własny nagłówek z powrotem.
- MOST ma niezależne tokeny ról, odczyt zdarzeń i synchronizację w dwóch sesjach. Rodzina ma własny proces zgody, historię i projekcje ról. Zachowujemy ich kontrakty i dodajemy wspólny widok spraw oraz skrzynkę opartą o zdarzenia tych procesów.
- Dane profili i nawigacja są rozdzielone w lokalnym store. Serwer będzie przechowywał oddzielny stan demonstracyjnego Zdrowia dla każdego profilu. Zaproszenie Kacpra utworzy osobny widok tylko dla udostępnionego skierowania.
- Obecny asystent obsługuje kontekst spraw i dokumentów. W Zdrowiu otrzyma przygotowane kroki organizacyjne i odnośniki do dokumentów oraz wizyt.
- Kolejność wdrożenia obejmuje pełny obieg skierowania i uprawnienia API, widoki Zdrowia, integrację ze Sprawami i powiadomieniami, a potem regresję i pokaz na dwóch ekranach.

## Audyt poprzedniej wersji MOST

Przegląd wykonano na istniejącym prototypie. Punktem odniesienia są ścieżki Playwright dla Dokumentów, Spraw, Asystenta, Danych, Rodziny i dwóch sesji MOST.

| Moduł | Cel i aktualny rezultat | Luka i decyzja |
| --- | --- | --- |
| Dokumenty | Odczyt danych, dobór dokumentów i udostępnienie konkretnego zakresu | Utrzymać szczegóły mDowodu i oddzielić udostępnianie danych od dostępu do sprawy. |
| Sprawy | Przeprowadzka, utrata portfela i wyjaśnienie pisma prowadzą do lokalnych projektów lub wyników symulacji | U Ewy wzorcowe wezwanie konkuruje z kartą MOST. Umieścić jedną sprawę w filtrze właściwym dla etapu. Zachować samodzielny scenariusz pisma w wyborze nowej sprawy. |
| MOST | Pomocnik może przesłać tekst, właściciel może go przyjąć lub odrzucić | To nie wystarcza do uzupełnienia wezwania. Potrzebne są dane formularza, dołączony dokument, uzasadnienie i pojedyncza decyzja o całym pakiecie. |
| Powiadomienia | Dzwonek otwiera przypomnienia oparte głównie na przykładowej treści | Zdarzenia współpracy powinny mieć odbiorcę, czas, stan odczytu i kierować do właściwego etapu sprawy. |
| Asystent | Deterministyczne wskazówki prowadzą do działania w znanych scenariuszach | Dodać wejście z wezwania Ewy z objaśnieniem i konkretnymi skrótami, bez zbierania danych ponownie. |
| Dane | Wybór zakresu, potwierdzenie, wygasający kod demo i historia | Zachować odrębny model od udzielania dostępu w MOST. |
| Rodzina | Role i synchronizacja zgody na przykładzie paszportu | Odczyt statusu członka powinien wyjaśniać, które działanie jest dostępne i kto może je wykonać. |

Wspólny stan i egzekwowanie ról pozostają po stronie istniejącego serwera. Końcowa autoryzacja zapisuje wynik demonstracji lokalnie na serwerze pokazu. Prototyp nie podpisuje ani nie wysyła pism do administracji.
