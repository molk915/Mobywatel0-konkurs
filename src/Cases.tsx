import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Simulator } from "./Simulator";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Car,
  CheckCheck,
  ChevronRight,
  Clock3,
  FileText,
  House,
  Plus,
  ShieldCheck,
} from "lucide-react";
import {
  caseMeta,
  receiptNeedsAction,
  receiptNextStep,
  type CaseKind,
  type CitizenState,
  type Profile,
  type Receipt,
} from "./domain";
export function Cases({
  p,
  c,
  onStart,
  onReceipt,
  onDocument,
}: {
  p: Profile;
  c: CitizenState;
  onStart: (kind: CaseKind, data?: Record<string, string>) => void;
  onReceipt: (r: Receipt) => void;
  onDocument: (id: number) => void;
}) {
  const drafts = Object.values(c.drafts).filter((d) => !!d),
    pending = c.receipts.filter(receiptNeedsAction),
    finished = c.receipts.filter((r) => !receiptNeedsAction(r));
  const activeCount = drafts.length + pending.length;
  const [section, setSection] = useState<"todo" | "active" | "done">(
    activeCount ? "active" : finished.length ? "done" : "todo",
  );
  const [picker, setPicker] = useState(false);
  const reduced = useReducedMotion();
  const previous = useRef({ active: activeCount, done: finished.length });
  useEffect(() => {
    if (activeCount > previous.current.active) setSection("active");
    else if (activeCount === 0 && finished.length > previous.current.done)
      setSection("done");
    previous.current = { active: activeCount, done: finished.length };
  }, [activeCount, finished.length]);
  const letterWaiting =
    !c.receipts.some((r) => r.kind === "letter") && !c.drafts.letter;
  const todoCount = 1 + Number(letterWaiting) + Number(!c.protected);
  const tabs = [
    { id: "todo" as const, label: "Do zrobienia", count: todoCount },
    { id: "active" as const, label: "W toku", count: activeCount },
    { id: "done" as const, label: "Zakończone", count: finished.length },
  ];
  return (
    <section className="citizen-cases">
      <header className="cases-heading">
        <span className="cases-eyebrow">TWOJE SPRAWY</span>
        <h1>
          Spokojnie.
          <br />
          Masz to pod kontrolą<span>.</span>
        </h1>
        <p>
          {p.first}, tu znajdziesz terminy i następny krok w Twoich sprawach.
        </p>
      </header>
      <button
        className={"new-life-event " + (picker ? "expanded" : "")}
        aria-expanded={picker}
        onClick={() => setPicker(!picker)}
      >
        <span className="new-event-icon">
          <Plus size={23} />
        </span>
        <span>
          <strong>Nowa sytuacja życiowa</strong>
          <small>Powiedz, co się zmienia. Ułożymy plan.</small>
        </span>
        <ArrowUpRight size={20} />
      </button>
      {picker && (
        <motion.div
          className="life-event-options"
          initial={reduced ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.22 }}
        >
          <h2>Co chcesz uporządkować?</h2>
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
                <Icon size={23} />
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
      <div className="case-segments" role="tablist" aria-label="Status spraw">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={section === t.id}
            onClick={() => setSection(t.id)}
          >
            {t.label}
            <span>{t.count}</span>
            {section === t.id && (
              <motion.i
                layoutId="case-tab"
                transition={
                  reduced
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 36 }
                }
              />
            )}
          </button>
        ))}
      </div>
      <section
        className="case-inbox"
        aria-label={tabs.find((t) => t.id === section)!.label}
      >
        <div className="case-list-title">
          <h2>{tabs.find((t) => t.id === section)!.label}</h2>
          <span>
            {section === "todo"
              ? "Najpierw to, co ważne"
              : section === "active"
                ? "Postęp zapisuje się automatycznie"
                : "Twoje potwierdzenia"}
          </span>
        </div>
        {section === "todo" && (
          <>
            {letterWaiting && (
              <button
                className="inbox-item important"
                onClick={() => onStart("letter")}
              >
                <span className="inbox-symbol">
                  <FileText size={23} />
                </span>
                <span>
                  <span className="case-overline">URZĄD MIASTA · PRZYKŁAD</span>
                  <strong>Pismo, które warto zrozumieć</strong>
                  <small>Brakujący dokument do wniosku</small>
                  <em>
                    <CalendarDays size={13} />
                    Odpowiedź do 27 listopada
                  </em>
                </span>
                <ChevronRight size={18} />
              </button>
            )}
            <button className="inbox-item" onClick={() => onDocument(2)}>
              <span className="inbox-symbol blue">
                <Car size={23} />
              </span>
              <span>
                <span className="case-overline">TWÓJ POJAZD · DEMO</span>
                <strong>Badanie techniczne Toyoty</strong>
                <small>Ważne do 1 grudnia · za 14 dni</small>
              </span>
              <ChevronRight size={18} />
            </button>
            {!c.protected && (
              <button className="inbox-item" onClick={() => onStart("wallet")}>
                <span className="inbox-symbol green">
                  <ShieldCheck size={23} />
                </span>
                <span>
                  <span className="case-overline">BEZPIECZEŃSTWO</span>
                  <strong>Sprawdź ochronę tożsamości</strong>
                  <small>Wybierz świadomie działania w pokazie</small>
                </span>
                <ChevronRight size={18} />
              </button>
            )}
            <p className="cases-local-note">
              Przypomnienia korzystają z danych demonstracyjnych.
            </p>
          </>
        )}
        {section === "active" && (
          <>
            {drafts.map((d) => (
              <button
                className="inbox-item"
                key={d.kind}
                onClick={() => onStart(d.kind)}
              >
                <span className="inbox-symbol red">
                  <Clock3 size={23} />
                </span>
                <span>
                  <span className="case-overline">ROBOCZA SPRAWA</span>
                  <strong>{caseMeta[d.kind].short}</strong>
                  <small>
                    {caseMeta[d.kind].steps[d.step]} · krok {d.step + 1} z{" "}
                    {caseMeta[d.kind].steps.length}
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
                </span>
                <ArrowRight size={19} />
              </button>
            ))}
            {pending.map((r) => (
              <button
                className="inbox-item important"
                key={r.id}
                onClick={() => onReceipt(r)}
              >
                <span className="inbox-symbol">
                  <FileText size={23} />
                </span>
                <span>
                  <span className="case-overline">PAKIET FORMALNOŚCI</span>
                  <strong>{caseMeta[r.kind].short}</strong>
                  <small>{receiptNextStep(r)}</small>
                  <em>
                    {
                      r.operations?.filter(
                        (o) =>
                          o.status === "accepted" || o.status === "manual-done",
                      ).length
                    }
                    /{r.operations?.length} kroków gotowych
                  </em>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
            {!activeCount && (
              <div className="cases-empty">
                <CheckCheck size={28} />
                <strong>Nie ma nic niedokończonego</strong>
                <p>
                  Gdy rozpoczniesz sprawę, wrócisz tutaj do zapisanego etapu.
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
                  <CheckCheck size={23} />
                </span>
                <span>
                  <span className="case-overline">POTWIERDZENIE DEMO</span>
                  <strong>{caseMeta[r.kind].short}</strong>
                  <small>
                    {new Date(r.at).toLocaleDateString("pl-PL")} · zapisano
                    lokalnie
                  </small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
            {!finished.length && (
              <div className="cases-empty">
                <CheckCheck size={28} />
                <strong>Tu będą Twoje potwierdzenia</strong>
                <p>Po zakończeniu sprawy jej wynik zostaje na urządzeniu.</p>
              </div>
            )}
          </>
        )}
      </section>
      <Simulator onPlan={(data) => onStart("move", data)} />
    </section>
  );
}
