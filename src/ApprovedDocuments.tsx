import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight, Car, CarFront, Check, ChevronRight, GraduationCap, Grid2X2, IdCard, Plus,
  ScanLine, ShieldCheck, Sparkles, UsersRound, X,
} from "lucide-react";
import { CivicHeader, CivicNav, WavePattern } from "./CivicChrome";
import { DigitalCard, documentTitles } from "./DigitalCard";
import type { Profile, Tab } from "./domain";

const defaultDocs = [0, 1, 2, 4];
const descriptions = [
  "Cyfrowy dokument tożsamości",
  "Kategorie i uprawnienia",
  "Dowód rejestracyjny i OC",
  "Dokument demonstracyjny",
  "Zniżki i uprawnienia dla rodziny",
];

function DocumentIcon({ id, profile }: { id: number; profile: Profile }) {
  const Icon = id === 1 ? CarFront : id === 2 ? Car : id === 4 ? UsersRound
    : id === 3 ? profile.extra === "Karta EKUZ" ? ShieldCheck : GraduationCap : IdCard;
  return <Icon size={22} />;
}

function DocumentCatalog({ host, profile, ids, onSave, onClose }: {
  host: Element;
  profile: Profile;
  ids: number[];
  onSave: (ids: number[]) => void;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const close = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const names = documentTitles(profile);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const base = host.querySelector<HTMLElement>(".base");
    if (base) base.inert = true;
    close.current?.focus();
    return () => {
      if (base) base.inert = false;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [host]);

  return createPortal(
    <div className="approved-catalog" role="dialog" aria-modal="true" aria-labelledby={headingId} onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
      if (event.key !== "Tab") return;
      const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("section button");
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }}>
      <button className="approved-catalog-backdrop" tabIndex={-1} aria-label="Zamknij katalog" onClick={onClose} />
      <motion.section className="civic-sheet" initial={reduced ? false : { y: "100%" }} animate={{ y: 0 }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 39, mass: .85 }}>
        <span className="sheet-handle" />
        <header><h2 id={headingId}>Katalog dokumentów</h2><button ref={close} onClick={onClose} className="civic-icon-button" aria-label="Zamknij"><X size={20} /></button></header>
        <p>Wybierz dokumenty widoczne w tym profilu.</p>
        {[0, 1, 2, 4, 3].map((id) => (
          <button className="approved-catalog-item" key={id} onClick={() => onSave(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])} aria-pressed={ids.includes(id)}>
            <span className="approved-doc-icon"><DocumentIcon id={id} profile={profile} /></span>
            <span>{names[id]}</span>{ids.includes(id) ? <Check size={19} /> : <Plus size={19} />}
          </button>
        ))}
        <button className="approved-add" onClick={onClose}>Gotowe</button>
      </motion.section>
    </div>, host,
  );
}

export function DocumentSelection({ p, ids = defaultDocs, onOpen, onSave, overview, recent }: {
  p: Profile;
  ids?: number[];
  onOpen: (id: number) => void;
  onSave: (ids: number[]) => void;
  overview?: ReactNode;
  recent?: ReactNode;
}) {
  const [catalog, setCatalog] = useState(false);
  const root = useRef<HTMLElement>(null);
  const host = catalog ? root.current?.closest(".phone") : null;
  const names = documentTitles(p);
  const reduced = useReducedMotion();
  return (
    <section className="approved-selection" ref={root}>
      <header className="approved-heading">
        <div>{!ids.includes(0) && <p>{p.name}</p>}<h1>Dokumenty</h1></div>
        <button className="civic-icon-button" aria-label="Zarządzaj" title="Zarządzaj dokumentami" onClick={() => setCatalog(true)}><Grid2X2 size={18} /></button>
      </header>
      <div className="approved-selection-scroll" data-testid="document-scroll">
        <div className="approved-document-list">
          {ids.includes(0) && <motion.button className="approved-hero civic-pattern-card" aria-label="mDowód" onClick={() => onOpen(0)}
            whileTap={reduced ? undefined : { scale: .988 }}>
            <WavePattern />
            <img className="approved-hero-watermark" src="/document-lines.svg" alt="" />
            <span className="wallet-hero-label"><i className="polish-flag" /> Dokument tożsamości</span>
            <strong>mDowód</strong>
            <span className="wallet-hero-person">{p.name}</span>
            <span className="approved-hero-bottom"><span>Otwórz dokument</span><span className="civic-icon-button"><ArrowRight size={20} /></span></span>
          </motion.button>}
          {overview}
          {ids.some((id) => id !== 0) && <h2 className="wallet-section-label">{ids.includes(0) ? "Pozostałe dokumenty" : "Twoje dokumenty"}</h2>}
          <div className="wallet-list">{ids.filter((id) => id !== 0).map((id) => (
            <motion.button key={id} className="approved-document-row civic-row-card" onClick={() => onOpen(id)}
              whileTap={reduced ? undefined : { scale: .99 }}>
              <span className="approved-doc-icon"><DocumentIcon id={id} profile={p} /></span>
              <span><strong>{names[id]}</strong><small>{descriptions[id]}</small></span>
              <ChevronRight size={19} />
            </motion.button>
          ))}</div>
          {!ids.length && <p className="approved-empty">W tym profilu nie ma dokumentów. Wybierz „Dodaj”, aby otworzyć katalog.</p>}
        </div>
        {recent}
      </div>
      <footer className="approved-selection-footer">
        <button className="approved-add" onClick={() => setCatalog(true)}><Plus size={20} /> Dodaj</button>
      </footer>
      {host && <DocumentCatalog host={host} profile={p} ids={ids} onSave={onSave} onClose={() => setCatalog(false)} />}
    </section>
  );
}

function ApprovedIdentity({ p }: { p: Profile }) {
  const fields = [
    ["Data urodzenia", p.birth], ["Numer PESEL", p.pesel],
    ["Numer dokumentu", p.number], ["Ważność", "12.06.2034"],
  ];
  return (
    <article className="approved-identity civic-pattern-card">
      <WavePattern />
      <header><small>Dokument demonstracyjny</small><strong>mDowód</strong><img src="/document-lines.svg" alt="" /></header>
      <div className="approved-identity-person">
        <img src={"/portraits/" + p.id + ".png"} alt={"Fikcyjny portret: " + p.name} />
        <span><small>Imię i nazwisko</small><strong>{p.name}</strong></span>
      </div>
      <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <footer><i className="polish-flag" /><span><small>Obywatelstwo</small><strong>Polskie</strong></span><b>DEMO</b></footer>
    </article>
  );
}

export function ApprovedDocument({ p, id, address, protectedPesel, onClose, onShare, onWallet, onAssistant, onGo, onProfile, onNotifications, unreadCount }: {
  p: Profile; id: number; address: string; protectedPesel: boolean;
  onClose: () => void; onShare: () => void; onWallet: () => void;
  onAssistant: () => void; onGo: (tab: Tab) => void; onProfile: () => void; onNotifications: () => void;
  unreadCount?: number;
}) {
  const [details, setDetails] = useState(false);
  const name = documentTitles(p)[id];
  const detailsText = [
    address, "Kategoria B · blankiet DEMO 026/2026 · 0 punktów karnych",
    "Toyota Corolla · WX DEMO · 2021. OC: 12.04.2027. Badanie: 01.12.2026. VIN: DEMO0000000000000.",
    p.extra, "Numer: DEMO KDR " + p.id.toUpperCase() + " · karta demonstracyjna",
  ][id];
  return (
    <div className="approved-detail-shell">
      <CivicHeader profile={p} unreadCount={unreadCount} onBack={onClose} onNotifications={onNotifications} onProfile={onProfile} />
      <div className="approved-detail-scroll">
        <header className="approved-heading"><div><h1 tabIndex={-1}>{name}</h1><p>{descriptions[id]}</p></div></header>
        {id === 0 ? <ApprovedIdentity p={p} /> : <DigitalCard p={p} id={id} />}
        <div className="approved-detail-actions">
          <button className="secondary" aria-expanded={details} onClick={() => setDetails(!details)}>Szczegóły</button>
          <button className="primary" onClick={onShare}><ScanLine size={19} /> Udostępnij</button>
        </div>
        {details && <section className="approved-extra civic-row-card">
          <h2>Dane dokumentu</h2><p>{detailsText}</p>
          <button onClick={onWallet}>Ochrona danych · {protectedPesel ? "włączona w demo" : "sprawdź plan"}</button>
        </section>}
        <button className="approved-context civic-row-card" onClick={onAssistant}>
          <span className="approved-doc-icon"><Sparkles size={20} /></span>
          <span><strong>Zapytaj o ten dokument</strong><small>Asystent</small></span><ArrowRight size={19} />
        </button>
      </div>
      <CivicNav tab="home" onGo={(tab) => tab === "home" ? onClose() : onGo(tab)} onAssistant={onAssistant} />
    </div>
  );
}
