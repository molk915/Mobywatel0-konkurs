import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Car,
  Check,
  CheckCheck,
  ChevronRight,
  FileText,
  House,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Simulator } from "./Simulator";
import { WavePattern } from "./CivicChrome";
export type CaseCard = { id: string; section: "todo" | "active" | "done"; shared: boolean; content: ReactNode };
const sections = [
  { id: "todo", label: "Do zrobienia" },
  { id: "active", label: "W toku" },
  { id: "done", label: "Zakończone" },
] as const;
type Section = (typeof sections)[number]["id"];
import {
  caseMeta,
  receiptNeedsAction,
  type CaseKind,
  type CitizenState,
  type Draft,
  type Profile,
  type Receipt,
} from "./domain";
export function draftAction(d: Draft) {
  return d.kind === "move"
    ? [
        "Ustal zakres przeprowadzki",
        "Uzupełnij nowy adres",
        "Wybierz potrzebne formalności",
        "Sprawdź przygotowany plan",
      ][d.step]
    : d.kind === "wallet"
      ? [
          "Wskaż utracone dokumenty",
          "Wybierz działania ochronne",
          "Sprawdź i zatwierdź ochronę",
        ][d.step]
      : [
          "Dodaj pismo do wyjaśnienia",
          "Przeczytaj wyjaśnienie i termin",
          "Przygotuj odpowiedź z załącznikiem",
          "Sprawdź szkic odpowiedzi",
        ][d.step];
}
export function processAction(r: Receipt) {
  return r.operations?.some((o) => o.status === "needs-document")
    ? "Dołącz dokument do zameldowania"
    : r.operations?.some((o) => o.status === "manual")
      ? "Sprawdź krok poza aplikacją"
      : "Otwórz zapisany wynik";
}
export function Cases({
  p,
  c,
  onStart,
  onReceipt,
  onDocument,
  collaboration = [],
  initialShared = false,
}: {
  p: Profile;
  c: CitizenState;
  onStart: (kind: CaseKind, data?: Record<string, string>) => void;
  onReceipt: (r: Receipt) => void;
  onDocument: (id: number) => void;
  collaboration?: CaseCard[];
  initialShared?: boolean;
}) {
  const drafts = Object.values(c.drafts).filter((d) => !!d),
    pending = c.receipts.filter(receiptNeedsAction),
    finished = c.receipts.filter((r) => !receiptNeedsAction(r)),
    activeCount = drafts.length + pending.length;
  const [personalSection, setPersonalSection] = useState<Section>();
  const [sharedSection, setSharedSection] = useState<Section>();
  const [picker, setPicker] = useState(false);
  const [collection, setCollection] = useState<"personal" | "shared">(initialShared ? "shared" : "personal");
  const reduced = useReducedMotion(),
    previous = useRef({ active: activeCount, done: finished.length });
  useEffect(() => {
    if (activeCount > previous.current.active) setPersonalSection("active");
    else if (!activeCount && finished.length > previous.current.done)
      setPersonalSection("done");
    previous.current = { active: activeCount, done: finished.length };
  }, [activeCount, finished.length]);
  const letterWaiting =
    p.id !== "ewa" && !c.receipts.some((r) => r.kind === "letter") && !c.drafts.letter;
  const shared = collection === "shared";
  const currentCards = collaboration.filter((item) => item.shared === shared);
  const localCounts = { todo: 1 + Number(letterWaiting) + Number(!c.protected), active: activeCount, done: finished.length };
  const tabs = sections.map((item) => ({
    ...item, count: (shared ? 0 : localCounts[item.id]) + currentCards.filter((card) => card.section === item.id).length,
  }));
  const suggestedPersonal = currentCards.some((item) => item.section === "todo") ? "todo"
    : activeCount ? "active" : finished.length ? "done" : "todo";
  const section = shared ? sharedSection ?? tabs.find(({ count }) => count > 0)?.id ?? "todo"
    : personalSection ?? suggestedPersonal;
  const setSection = shared ? setSharedSection : setPersonalSection;
  const emptyHelp = shared && !currentCards.length;
  const sectionCards = currentCards.filter((item) => item.section === section);
  return (
    <section className="citizen-cases">
      <header className="cases-heading">
        <h1>Sprawy</h1>
        {!shared && <button
          aria-label="Nowa sytuacja życiowa"
          aria-expanded={picker}
          onClick={() => setPicker(!picker)}
        >
          <Plus size={17} />
          Nowa sprawa
        </button>}
      </header>
      <div className="case-collections" role="group" aria-label="Widok spraw">
        <button aria-pressed={!shared} onClick={() => setCollection("personal")}>Moje</button>
        <button aria-pressed={shared} onClick={() => {
          if (shared) return;
          setCollection("shared");
          setSharedSection(undefined);
          setPicker(false);
        }}>Pomagam</button>
      </div>
      {picker && (
        <motion.div
          className="life-event-options"
          initial={reduced ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2>Co zmienia się w Twoim życiu?</h2>
          {(["move", "wallet", "letter"] as CaseKind[]).map((k) => {
            const Icon =
              k === "move" ? House : k === "wallet" ? ShieldCheck : FileText;
            return (
              <button
                key={k}
                onClick={() => {
                  setPicker(false);
                  onStart(k);
                }}
              >
                <Icon size={22} />
                <span>
                  <strong>{caseMeta[k].short}</strong>
                  <small>{caseMeta[k].description}</small>
                  <em>{caseMeta[k].time}</em>
                </span>
                <ChevronRight size={17} />
              </button>
            );
          })}
        </motion.div>
      )}
      {emptyHelp ? <section className="cases-help-empty" aria-labelledby="cases-help-heading">
        <span className="most-icon"><CheckCheck size={22} /></span>
        <h2 id="cases-help-heading">Sprawy, w których pomagasz</h2>
        <p>Otwórz link od bliskiej osoby lub zeskanuj jej kod QR. Zaproszona sprawa pojawi się tutaj.</p>
      </section> : <><div
        className="case-segments"
        role="tablist"
        aria-label="Status spraw"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const next =
              (tabs.findIndex((t) => t.id === section) +
                (e.key === "ArrowRight" ? 1 : 2)) %
              3;
            setSection(tabs[next].id);
            e.currentTarget
              .querySelectorAll<HTMLButtonElement>("button")
              [next]?.focus();
          }
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={section === t.id}
            aria-controls="case-panel"
            tabIndex={section === t.id ? 0 : -1}
            onClick={() => setSection(t.id)}
          >
            {t.label}
            <span>{(collection === "personal" ? t.count : 0) + currentCards.filter((item) => item.section === t.id).length}</span>
            {section === t.id && (
              <motion.i
                layoutId="case-tab"
                transition={
                  reduced
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 400, damping: 35 }
                }
              />
            )}
          </button>
        ))}
      </div>
      <section
        className="case-inbox"
        id="case-panel"
        aria-label={tabs.find((t) => t.id === section)!.label}
      >
        <div className="case-list-title">
          <h2>{tabs.find((t) => t.id === section)!.label}</h2>
        </div>
        {sectionCards.map((item) => <div key={item.id}>{item.content}</div>)}
        {collection === "shared" && !sectionCards.length && <div className="cases-empty">
          <CheckCheck size={26} /><p>Brak wspólnych spraw na tym etapie.</p>
        </div>}
        {collection === "personal" && <>
        {section === "todo" && (
          <>
            {letterWaiting && (
              <button
                className="inbox-item important civic-pattern-card case-letter"
                onClick={() => onStart("letter")}
              >
                <span className="inbox-symbol">
                  <FileText size={21} />
                </span>
                <span>
                  <span className="case-overline">PISMO Z URZĘDU · DEMO</span>
                  <strong>Urząd prosi o dokument</strong>
                  <small>Sprawdź, czego brakuje i jak odpowiedzieć.</small>
                  <em>
                    <CalendarDays size={12} />
                    Do 27 listopada
                  </em>
                  <b className="case-cta">
                    Przeczytaj wyjaśnienie
                    <ArrowRight size={14} />
                  </b>
                </span>
                <ChevronRight size={16} />
                <WavePattern />
              </button>
            )}
            <button className="inbox-item" onClick={() => onDocument(2)}>
              <span className="inbox-symbol blue">
                <Car size={21} />
              </span>
              <span>
                <span className="case-overline">TOYOTA COROLLA · DEMO</span>
                <strong>Zbliża się badanie pojazdu</strong>
                <small>
                  Ważne do 1 grudnia. Badanie wykonasz poza aplikacją.
                </small>
                <b className="case-cta">
                  Sprawdź terminy w dokumencie
                  <ArrowRight size={14} />
                </b>
              </span>
              <ChevronRight size={16} />
            </button>
            {!c.protected && (
              <button className="inbox-item" onClick={() => onStart("wallet")}>
                <span className="inbox-symbol green">
                  <ShieldCheck size={21} />
                </span>
                <span>
                  <span className="case-overline">TOŻSAMOŚĆ</span>
                  <strong>Wybierz ochronę swoich danych</strong>
                  <small>
                    Zastrzeżenie PESEL i dokumentu to osobne decyzje.
                  </small>
                  <b className="case-cta">
                    Zobacz plan ochrony
                    <ArrowRight size={14} />
                  </b>
                </span>
                <ChevronRight size={16} />
              </button>
            )}
          </>
        )}
        {section === "active" && (
          <>
            {drafts.map((d) => (
              <button
                className="inbox-item important"
                key={d.kind}
                onClick={() => onStart(d.kind)}
              >
                <span className="inbox-symbol">
                  <House size={21} />
                </span>
                <span>
                  <span className="case-overline">
                    {caseMeta[d.kind].short.toUpperCase()} · ZAPISANY PLAN
                  </span>
                  <strong>{draftAction(d)}</strong>
                  <small>
                    Masz przygotowany krok {d.step + 1} z{" "}
                    {caseMeta[d.kind].steps.length}. Zmiany są lokalne.
                  </small>
                  <span className="case-inline-progress">
                    <i
                      style={{
                        width:
                          ((d.step + 1) / caseMeta[d.kind].steps.length) * 100 +
                          "%",
                      }}
                    />
                  </span>
                  <b className="case-cta">
                    Kontynuuj od tego miejsca
                    <ArrowRight size={14} />
                  </b>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
            {pending.map((r) => (
              <button
                className="inbox-item important"
                key={r.id}
                onClick={() => onReceipt(r)}
              >
                <span className="inbox-symbol">
                  <FileText size={21} />
                </span>
                <span>
                  <span className="case-overline">
                    {caseMeta[r.kind].short.toUpperCase()} · PAKIET
                  </span>
                  <strong>{processAction(r)}</strong>
                  <small>
                    {
                      r.operations?.filter(
                        (o) =>
                          o.status === "accepted" || o.status === "manual-done",
                      ).length
                    }{" "}
                    z {r.operations?.length} formalności gotowych. Każda ma
                    osobny status.
                  </small>
                  <b className="case-cta">
                    Otwórz następny krok
                    <ArrowRight size={14} />
                  </b>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
            {!activeCount && !sectionCards.length && (
              <div className="cases-empty">
                <CheckCheck size={28} />
                <strong>Nie ma nic niedokończonego</strong>
                <p>
                  Rozpoczęte plany i przygotowane operacje pojawią się tutaj.
                  Aplikacja nie wykonuje działań bez zgody.
                </p>
              </div>
            )}
          </>
        )}
        {section === "done" && (
          <>
            {finished.map((r) => (
              <button
                className="inbox-item"
                key={r.id}
                onClick={() => onReceipt(r)}
              >
                <span className="inbox-symbol green">
                  <Check size={21} />
                </span>
                <span>
                  <span className="case-overline">
                    {new Date(r.at).toLocaleDateString("pl-PL")} · SYMULACJA
                  </span>
                  <strong>{caseMeta[r.kind].short}</strong>
                  <small>
                    Wynik i historia zostały zapisane na urządzeniu.
                  </small>
                  <b className="case-cta">
                    Otwórz potwierdzenie
                    <ArrowRight size={14} />
                  </b>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
            {!finished.length && !sectionCards.length && (
              <div className="cases-empty">
                <CheckCheck size={28} />
                <strong>Tu będą Twoje potwierdzenia</strong>
                <p>Zakończone symulacje pozostają dostępne razem z historią.</p>
              </div>
            )}
          </>
        )}
        </>}
      </section></>}
      {collection === "personal" && <Simulator onPlan={(data) => onStart("move", data)} />}
    </section>
  );
}
