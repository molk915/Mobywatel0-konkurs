import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, GitBranch } from "lucide-react";
import type { FormData } from "./domain";
export function Simulator({ onPlan }: { onPlan: (data: FormData) => void }) {
  const [open, setOpen] = useState(false),
    [tenure, setTenure] = useState("rent"),
    [tax, setTax] = useState(false);
  const reduced = useReducedMotion();
  const hasTitle = tenure !== "guest";
  return (
    <>
      <button
        className="simulation-entry"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <GitBranch size={25} />
        <span>
          <strong>Co się stanie, jeśli…</strong>
          <small>Sprawdź plan, zanim zmienisz adres</small>
        </span>
        <ArrowRight size={18} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.section
            className="simulator"
            aria-label="Symulacja przeprowadzki"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="eyebrow">BEZ ZOBOWIĄZAŃ · SYMULACJA</div>
            <h2>
              Nowy adres.
              <br />
              Co zmieni się dla Ciebie?
            </h2>
            <p>
              Przykład: przeprowadzka na stałe z Warszawy do Krakowa. Obywatel
              Polski, osoba dorosła, bez działalności gospodarczej.
            </p>
            <fieldset className="simulation-choices">
              <legend>Jak zamieszkasz?</legend>
              <div>
                {[
                  ["rent", "Wynajmuję"],
                  ["own", "Moje lokum"],
                  ["guest", "U bliskich"],
                ].map(([id, label]) => (
                  <label key={id}>
                    <input
                      type="radio"
                      name="tenure"
                      value={id}
                      checked={tenure === id}
                      onChange={() => setTenure(id)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="simulation-tax">
              <input
                type="checkbox"
                checked={tax}
                onChange={(e) => setTax(e.target.checked)}
              />
              Chcę sprawdzić aktualizację adresu podatkowego
            </label>
            <ol className="decision-path" aria-live="polite">
              <li>
                <b>1</b>
                <strong>
                  {hasTitle
                    ? "Przygotuj dokument do lokalu"
                    : "Poproś właściciela o potwierdzenia"}
                </strong>
                <p>
                  {tenure === "rent"
                    ? "Przygotuj np. umowę najmu potwierdzającą Twój tytuł do lokalu."
                    : tenure === "own"
                      ? "Przygotuj np. dokument potwierdzający własność."
                      : "Przy braku własnego tytułu potrzebne są potwierdzenie pobytu od właściciela oraz dokument jego tytułu do lokalu."}
                </p>
              </li>
              <li>
                <b>2</b>
                <strong>Zameldowanie na pobyt stały</strong>
                <p>
                  Ten krok wymaga dokumentów z etapu 1. W tym przykładzie: do 30
                  dni od przybycia. Usługa bez opłaty; zgłoszenie wymaga
                  zatwierdzenia.
                </p>
              </li>
              {tax && (
                <li>
                  <b>3</b>
                  <strong>Sprawdź adres dla celów podatkowych</strong>
                  <p>
                    Odrębny krok. Aktualny adres można wskazać w deklaracji lub
                    zgłoszeniu aktualizacyjnym. Wybór formularza zależy od
                    Twojej sytuacji.
                  </p>
                </li>
              )}
              <li>
                <b>{tax ? 4 : 3}</b>
                <strong>Bank i pracodawca</strong>
                <p>
                  Wykonujesz samodzielnie, poza prototypem. Meldunek nie
                  aktualizuje automatycznie danych we wszystkich instytucjach.
                </p>
              </li>
            </ol>
            <div className="simulation-summary">
              <span>
                <b>{tax ? 4 : 3}</b>
                <small>etapy w tym wariancie</small>
              </span>
              <span>
                <b>{hasTitle ? "Twój" : "Właściciela"}</b>
                <small>dokument do lokalu</small>
              </span>
              <span>
                <b>0 zł</b>
                <small>usługa zameldowania</small>
              </span>
            </div>
            <button
              className="primary"
              onClick={() =>
                onPlan({
                  city: "Kraków",
                  meldunek: "true",
                  tax: String(tax),
                  car: "false",
                  tenure,
                })
              }
            >
              Utwórz roboczy plan
              <ArrowRight size={17} />
            </button>
            <details className="simulation-sources">
              <summary>Założenia i źródła</summary>
              <p>
                To ograniczony przykład, nie pełna analiza Twoich obowiązków.
                Kwota dotyczy samej usługi zameldowania, nie wszystkich kosztów
                przeprowadzki. Plan nie jest wnioskiem. Sprawdź wymagania przed
                rzeczywistym działaniem.
              </p>
              <a
                href="https://www.gov.pl/web/gov/zamelduj-sie-na-pobyt-staly-lub-czasowy-dluzszy-niz-3-miesiace"
                target="_blank"
                rel="noreferrer"
              >
                Zameldowanie — gov.pl ↗
              </a>
              <a
                href="https://samorzad.gov.pl/web/gmina-korczew/aktualizacja-adresu-zamieszkania-osoby-fizycznej-nieprowadzacej-dzialalnosci-gospodarczej"
                target="_blank"
                rel="noreferrer"
              >
                Aktualizacja adresu — samorzad.gov.pl ↗
              </a>
            </details>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
