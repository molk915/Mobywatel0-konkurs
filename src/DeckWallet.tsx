import { GestureDeck } from "./GestureDeck";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  FileText,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react";
import { DigitalCard, documentTitles } from "./DigitalCard";
import {
  caseMeta,
  receiptNextStep,
  type Draft,
  type Profile,
  type Receipt,
} from "./domain";
export function Wallet({
  profile,
  draft,
  pending,
  onDocument,
  onShare,
  onAll,
  onLetter,
  onResume,
  onSelect,
  protectedPesel,
  initialDocument,
}: {
  profile: Profile;
  draft?: Draft;
  pending?: Receipt;
  onDocument: (id: number) => void;
  onShare: (id: number) => void;
  onAll: () => void;
  onLetter: () => void;
  onResume: () => void;
  onSelect: (id: number) => void;
  protectedPesel: boolean;
  initialDocument?: number;
}) {
  const [active, setActive] = useState(initialDocument || 0),
    [attention, setAttention] = useState(false);
  const reduced = useReducedMotion(),
    swiped = useRef(false);
  const names = documentTitles(profile);
  const nextAction = useRef<(() => void) | null>(null);
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => setHost(document.querySelector(".phone")), []);
  useEffect(() => {
    if (!attention) return;
    const previous = document.activeElement as HTMLElement;
    host
      ?.querySelector<HTMLButtonElement>(".attention-sheet header button")
      ?.focus();
    return () => {
      if (!nextAction.current && !document.querySelector(".layer"))
        previous?.focus();
    };
  }, [attention, host]);
  const choose = (id: number) => {
    setActive(id);
    onSelect(id);
  };
  const order = [0, 1, 2, 3].filter((id) => id !== active);
  const next = draft
    ? caseMeta[draft.kind].steps[draft.step]
    : pending
      ? receiptNextStep(pending)
      : "Wyjaśnij pismo i sprawdź termin";
  return (
    <section className="deck-home">
      <header className="deck-heading">
        <h1>Twój portfel</h1>

      </header>
      <GestureDeck
        p={profile}
        active={active}
        onSelect={choose}
        onOpen={onDocument}
        onAll={onAll}
      />
      <div className="deck-controls">
        <span aria-live="polite">{names[active]}</span>
        <div role="tablist" aria-label="Wybierz dokument">
          {[
            "Dowód",
            "Prawo jazdy",
            "Pojazd",
            profile.extra === "Karta EKUZ" ? "EKUZ" : "Studia",
          ].map((name, id) => (
            <button
              key={id}
              role="tab"
              aria-label={name}
              aria-selected={active === id}
              tabIndex={active === id ? 0 : -1}
              onClick={() => choose(id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                  e.preventDefault();
                  e.stopPropagation();
                  const next = (active + (e.key === "ArrowRight" ? 1 : 3)) % 4;
                  choose(next);
                  e.currentTarget.parentElement
                    ?.querySelectorAll<HTMLButtonElement>("button")
                    [next]?.focus();
                }
              }}
            >
              <i />
            </button>
          ))}
        </div>
      </div>
      <div className="deck-actions">
        <button onClick={() => onDocument(active)}>
          Szczegóły
          <ArrowUpRight size={17} />
        </button>
        <button onClick={() => onShare(active)}>
          <ScanLine size={19} />
          Udostępnij
        </button>
      </div>
      <button
        className="attention-trigger wallet-reminder"
        onClick={() => setAttention(true)}
        aria-expanded={attention}
      >
        <span className="attention-dot">{draft || pending ? "↗" : "1"}</span>
        <span>
          <strong>
            {draft
              ? caseMeta[draft.kind].short
              : pending
                ? caseMeta[pending.kind].short
                : "Wymaga Twojej uwagi"}
          </strong>
          <small>{next}</small>
        </span>
        <ChevronDown size={18} />
      </button>
      {host &&
        createPortal(
          <AnimatePresence
            onExitComplete={() => {
              const run = nextAction.current;
              nextAction.current = null;
              run?.();
            }}
          >
            {attention && (
              <motion.div
                className="attention-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Sprawy wymagające uwagi"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    const items = Array.from(
                      e.currentTarget.querySelectorAll<HTMLButtonElement>(
                        "button",
                      ),
                    );
                    const first = items[0],
                      last = items.at(-1);
                    if (e.shiftKey && document.activeElement === first) {
                      e.preventDefault();
                      last?.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                      e.preventDefault();
                      first?.focus();
                    }
                  }
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setAttention(false);
                  }
                }}
              >
                <button
                  className="attention-scrim"
                  onClick={() => setAttention(false)}
                  aria-label="Zamknij panel spraw"
                />
                <motion.section
                  className="attention-sheet"
                  initial={reduced ? false : { y: 260 }}
                  animate={{ y: 0 }}
                  exit={{ y: 260 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 380, damping: 36 }
                  }
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.2 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 65) setAttention(false);
                  }}
                >
                  <i className="sheet-grip" />
                  <header>
                    <h2>Na teraz</h2>
                    <button
                      onClick={() => setAttention(false)}
                      aria-label="Zamknij"
                    >
                      <X size={21} />
                    </button>
                  </header>
                  <p>Jeden konkretny krok. Reszta może poczekać.</p>
                  <button
                    className="attention-next"
                    aria-label={
                      draft || pending
                        ? "Kontynuuj sprawę"
                        : "Przeczytaj wyjaśnienie"
                    }
                    onClick={() => {
                      nextAction.current =
                        draft || pending ? onResume : onLetter;
                      setAttention(false);
                    }}
                  >
                    <FileText size={25} />
                    <span>
                      <small>
                        {draft || pending
                          ? "ZAPISANA SPRAWA"
                          : "PISMO Z URZĘDU · DEMO"}
                      </small>
                      <strong>{next}</strong>
                      <b>
                        {draft || pending
                          ? "Kontynuuj sprawę"
                          : "Przeczytaj wyjaśnienie"}
                        <ChevronRight size={16} />
                      </b>
                    </span>
                  </button>
                  <div className="attention-security">
                    <ShieldCheck size={16} />
                    {protectedPesel
                      ? "PESEL chroniony w pokazie"
                      : "Nic nie zostanie wysłane bez Twojej zgody"}
                  </div>
                </motion.section>
              </motion.div>
            )}
          </AnimatePresence>,
          host,
        )}
    </section>
  );
}
