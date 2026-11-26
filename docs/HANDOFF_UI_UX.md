# mObywatel MOST — przekazanie prac UI/UX

Stan na **26 listopada 2026 r.** Ten dokument opisuje najnowszy kierunek interfejsu. Starsze pliki `HANDOFF.md` i `HANDOFF_NEXT_SESSION.md` dokumentują poprzednie etapy.

## Stan wdrożony

- Repozytorium `molk915/Mobywatel0-konkurs`, gałąź `main`, punkt odniesienia `046d8d0`. Lokalny katalog to `C:\Users\piotr\OneDrive\Pulpit\Mobywatel0-konkurs`.
- Publiczna wersja działa na Vercelu. [Pełna aplikacja](https://mobywatel0-konkurs-qznq.vercel.app/) startuje na Dokumentach. [Centrum kontroli Ewy](https://mobywatel0-konkurs-qznq.vercel.app/?start=most-hub) i [pokaz dwóch telefonów](https://mobywatel0-konkurs-qznq.vercel.app/?pokaz=most3) mają osobne wejścia.
- Prototyp zawiera Dokumenty, Sprawy, Usługi, Dane i MOST, w tym Zdrowie oraz Rodzinę. Ewa może udostępnić konkretną sprawę i ograniczyć dostęp. Kacper widzi przekazane sprawy i terminy, może zapisać szkic i przekazać go Ewie do decyzji. Działają również demonstracyjna płatność mandatu i historia działań. Operacje są symulowane.
- Na produkcji zweryfikowano oryginalną panoramę Warszawy w tle desktopu, otwieranie mDowodu z nową granatowo-bordową grafiką oraz położenie „Moje / Pomagam” pod tytułem Centrum kontroli. Przed publikacją przeszły build i ukierunkowane testy Playwright dokumentów oraz MOST, w tym przepływ dwóch telefonów. Nowy kierunek UI nie ma jeszcze implementacji ani testu z nowymi użytkownikami.
- Frontend to React, TypeScript i Vite. Produkcja używa tras API na Vercelu i konfiguracji Neon. Lokalnie uruchom `npm run server` i `npm run dev` w osobnych terminalach. Na Windows można użyć `npm.cmd`.

## Ustalony kierunek kolejnej iteracji

**Główny link `/` otwiera pełną aplikację.** MOST ma być jej najlepiej widoczną funkcją, z dużą kartą „Potrzebujesz pomocy w sprawie?” i przyciskiem „Otwórz MOST” na pierwszym ekranie oraz wyraźnym wejściem z nawigacji. „Pełna aplikacja” zapewnia prosty powrót z MOST do pozostałych usług. Najnowsza [makieta trzech ekranów](screenshots/reference-most-ui-ux-2026-11-26.png) pokazuje pożądany kierunek wizualny i hierarchię. Nazwy spraw, daty, ikony i dolna nawigacja z makiety wymagają dopasowania do działającego produktu.

**MOST Ewy** zaczyna się od najważniejszej sprawy, terminu i akcji, np. „Poproś o pomoc” lub „Sprawdź szkic”. Dalej są pozostałe sprawy, „Kto ma dostęp”, terminy i historia. Podsumowanie udostępnienia pokazuje osobę, zakres i czas dostępu. QR pojawia się w kontekście dodawania osoby.

**MOST Kacpra** zaczyna się od sprawy Ewy z opisem kolejnego działania, np. „Przygotuj odpowiedź”. Po zapisaniu i przekazaniu szkicu interfejs pokazuje wynik. Powrót prowadzi do tej samej listy Kacpra, z zachowaniem profilu i dostępu do pozostałych spraw Ewy. Zmiana profilu ma jasną etykietę w pokazie. Stan obu telefonów wynika z istniejących danych i uprawnień.

Informacja zwrotna z pierwszej próby była konkretna. Testerowi podobała się aplikacja po eksploracji, ale na wejściu nie wiedział, co zrobić. W obecnym Centrum kontroli sprawy są schowane pod „Dostępem”, akcja QR pojawia się przed listą spraw, a kilka zestawów zakładek rywalizuje o uwagę. Sprawdzić też zgłoszone przykrywanie początku tytułu przez nagłówek podczas przewijania.

## Mapa kodu i weryfikacja

- `src/App.tsx`, `src/CivicChrome.tsx`, `src/navigation.ts` — start, nawigacja, profile i zachowanie Wstecz.
- `src/most/MostHub.tsx`, `ControlCenter.tsx`, `components.tsx`, `control.css`, `most.css` — wejście i układ MOST, widoki ról, dostęp, terminy oraz historia.
- `src/most/MostOwner.tsx`, `MostHelper.tsx`, `ControlCasePanel.tsx` — właściwe czynności na sprawach. `src/most/MostDashboardShowcase.tsx` oraz `src/main.tsx` — pokaz dwóch telefonów.
- `src/product-system.css`, `src/civic-system.css`, `src/ApprovedDocuments.tsx` — wspólny styl, ramka telefonu i mDowód. `public/warsaw-sunset.png` to oryginalne tło użytkownika.
- Po zmianach uruchomić `npm run build` i odpowiednie testy z `tests/e2e/most-profile.spec.ts`, `most-dashboard.spec.ts`, `civic-design.spec.ts` i `app.spec.ts`. Przejść ścieżkę od pełnej aplikacji przez Ewa → Kacper → Ewa, sprawdzić Wstecz i odświeżenie oraz obejrzeć realne zrzuty przy 320, 390 i 430 px, z większym tekstem i na desktopie.

## Oficjalne referencje projektowe

- Polskie nazwy usług i charakter komunikacji publicznej. [mObywatel na Gov.pl](https://www.gov.pl/web/mobywatel)
- Hierarchia aplikacji mobilnej, czytelne etykiety i dostępność. [Apple HIG — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) · [Apple HIG — Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- Etykiety przycisków oparte na czynności oraz podsumowanie przed decyzją Ewy. [GOV.UK Design System — Button](https://design-system.service.gov.uk/components/button/) · [GOV.UK Design System — Check answers](https://design-system.service.gov.uk/patterns/check-answers/)
- Kontrast, powiększanie tekstu, fokus, klawiatura i układ na małych ekranach. [W3C — WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
