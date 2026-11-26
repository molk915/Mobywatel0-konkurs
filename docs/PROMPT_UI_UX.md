# Prompt do nowej sesji Codex

```text
Przejmujesz istniejący prototyp mObywatel MOST. Pracuj w aktualnym repozytorium. Zacznij od docs/HANDOFF_UI_UX.md i otwórz makietę docs/screenshots/reference-most-ui-ux-2026-11-26.png. Sprawdź git status i uruchom aplikację, żeby zobaczyć obecny Start/Dokumenty, MOST Ewy i MOST Kacpra. Następnie zaprojektuj i zaimplementuj nowy UI/UX w istniejącym prototypie.

Cel. Osoba starsza ma samodzielnie znaleźć sprawę, poprosić bliską osobę o pomoc i zrozumieć, co jej udostępnia. Najważniejszą funkcją jest MOST. Adres / otwiera pełną aplikację. Już na pierwszym ekranie pokaż dużą, dopracowaną kartę z przyciskiem „Otwórz MOST”. Zapewnij wyraźne wejście z nawigacji oraz powrót „Pełna aplikacja” z MOST. Zachowaj działające wejścia do Dokumentów, Zdrowia, Rodziny i pozostałych usług.

Priorytet pierwszej iteracji. Doprowadź do wysokiej jakości trzy widoki z makiety: pełną aplikację z wyróżnionym MOST, MOST Ewy i MOST Kacpra. Ewa widzi najpilniejszą sprawę, termin i następny krok, np. „Poproś o pomoc” albo „Sprawdź szkic”. Kacper widzi, komu pomaga, następne zadanie i pozostałe dostępne sprawy oraz terminy. Listę spraw pokaż bez wchodzenia w „Dostęp”. Historię i zakres dostępu umieść w kontekście sprawy. W podsumowaniu udostępnienia pokaż odbiorcę, czynności i czas. Po powrocie ze szczegółów zachowaj profil, właściwą listę i możliwość otwarcia kolejnej sprawy. Podepnij działania do istniejącej logiki i danych, a treść karty uzależnij od rzeczywistego statusu.

Kierunek wizualny. Użyj makiety jako wzorca hierarchii i dopracowania. Zaprojektuj własny, rozpoznawalny interfejs nowoczesnej polskiej usługi publicznej. Weź z Apple HIG rytm odstępów, hierarchię typografii, przewidywalną nawigację i czytelny stan wybranej zakładki. Z GOV.UK weź proste etykiety akcji, jasne podsumowania i komunikaty błędu. Jasne powierzchnie, granatowy tekst, bordowy akcent akcji, subtelne separatory i spójne ikony liniowe. Użyj gradientu oszczędnie na karcie wejścia do MOST i wykorzystaj istniejącą typografię oraz grafikę mDowodu. Nadaj każdemu ekranowi jeden wyraźny główny krok. Dopasuj dolną nawigację do prawdziwych sekcji aplikacji. Używaj wyraźnych statusów zapisanych słowami, widocznego fokusu, tekstu podstawowego około 16–17 px i obszarów dotykowych około 44 px lub większych. Przygotuj stany pusty, ładowania, błędu, braku dostępu i zapisanego szkicu.

Referencje:
- Makieta produktu: docs/screenshots/reference-most-ui-ux-2026-11-26.png
- mObywatel i polskie nazwy usług: https://www.gov.pl/web/mobywatel
- Apple HIG, czytelność i nawigacja: https://developer.apple.com/design/human-interface-guidelines/accessibility oraz https://developer.apple.com/design/human-interface-guidelines/tab-bars
- GOV.UK, akcje i podsumowania: https://design-system.service.gov.uk/components/button/ oraz https://design-system.service.gov.uk/patterns/check-answers/
- WCAG 2.2: https://www.w3.org/WAI/WCAG22/quickref/

Zweryfikuj wynik w przeglądarce, zrób zrzuty trzech ekranów i obejrzyj je w swoim przebiegu. Sprawdź 320, 390 i 430 px, większy tekst, klawiaturę, fokus, desktop i pokaz dwóch telefonów. Przejdź Ewa udostępnia pismo → Kacper zapisuje szkic i przekazuje go → Ewa sprawdza szkic i widzi historię. Sprawdź też powrót Kacpra do pozostałych spraw Ewy i odświeżenie. Uruchom build i odpowiednie istniejące testy Playwright. Zachowaj sprawdzone API, uprawnienia, backend oraz połączenie Vercel/Neon. Przygotuj najpierw działającą wersję lokalną do obejrzenia.
```
