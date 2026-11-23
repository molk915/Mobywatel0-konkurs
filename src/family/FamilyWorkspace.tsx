import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, Bell, Check, ChevronRight, CircleAlert, ClipboardCheck, Clock3,
  ExternalLink, FileText, History, Link2, Plane, ShieldCheck, UsersRound,
} from "lucide-react";
import { CivicNav, WavePattern } from "../CivicChrome";
import type { Tab } from "../domain";
import { familyMembers, passportOffices, requestScope, travelPurposes } from "./fixtures";
import type { FamilyCase, FamilyInvites, FamilyRole, FamilyView, PassportForm } from "./model";
import { familyInvite, useFamilySession } from "./session";
import "./family.css";

type Screen = "family" | "travel" | "member" | "case" | "form" | "consent" | "history" | "sessions";
type Member = FamilyView["members"][number];
const titles: Record<Screen, string> = {
  family: "Moja rodzina",
  travel: "Rodzinny wyjazd",
  member: "Członek rodziny",
  case: "Paszport Zosi",
  form: "Przygotuj wniosek",
  consent: "Prośba o zgodę",
  history: "Historia współpracy",
  sessions: "Zaproszenia dla bliskich",
};
const statusLabels = {
  draft: "Wniosek do sprawdzenia",
  pending: "Czeka na zgodę Tomasza",
  ready: "Wniosek przygotowany",
  declined: "Tomasz odmówił zgody",
};
const eventLabels = {
  saved: "Zapisano dane wniosku",
  requested: "Poprosiła Tomasza o zgodę",
  approved: "Wyraził zgodę",
  declined: "Odmówił zgody",
};
const eventTime = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
});

export function FamilyEntry({ onOpen, status }: { onOpen: () => void; status?: FamilyCase["status"] }) {
  return (
    <button className="family-entry" onClick={onOpen}>
      <span className="family-icon"><UsersRound size={21} /></span>
      <span><strong>{status ? "Paszport Zosi" : "Moja rodzina"}</strong><small>{status ? statusLabels[status] : "Dokumenty i sprawy, które załatwiacie razem"}</small></span>
      <ChevronRight size={19} />
    </button>
  );
}

function PassportStatus({ member }: { member: Member }) {
  if (!member.passport) return null;
  return member.passport.attention
    ? <span className="family-passport attention"><CircleAlert size={14} /> Wymaga uwagi</span>
    : <span className="family-passport valid"><Check size={14} /> Aktualny</span>;
}

function MemberRows({ members, onMember }: { members: Member[]; onMember: (member: Member) => void }) {
  return (
    <ul className="family-members">
      {members.map((member) => (
        <li key={member.id}>
          <button className="family-row" onClick={() => onMember(member)}>
            <span className={"family-avatar " + member.id}>
              {member.id === "aleksandra"
                ? <img src="/portraits/aleksandra.png" alt="" />
                : member.name.charAt(0)}
            </span>
            <span className="family-row-text">
              <strong>{member.name}</strong><small>{member.relation}</small>
            </span>
            <PassportStatus member={member} />
            <ChevronRight size={16} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function CaseStatus({ status }: { status: FamilyCase["status"] }) {
  const Icon = status === "ready" ? Check : status === "declined" ? CircleAlert :
    status === "draft" ? FileText : Clock3;
  return (
    <p role="status" className={"family-case-status " + status}>
      <Icon size={19} /><strong>{statusLabels[status]}</strong>
    </p>
  );
}

function ApplicationDetails({ form }: { form: PassportForm }) {
  return (
    <dl className="family-facts">
      <div><dt>Wniosek dotyczy</dt><dd>Zosia, 10 lat</dd></div>
      <div><dt>Dokument</dt><dd>Paszport</dd></div>
      <div><dt>Cel podróży</dt><dd>{form.purpose}</dd></div>
      <div><dt>Punkt paszportowy</dt><dd>{form.office}</dd></div>
    </dl>
  );
}

function PassportEditor({ form, onChange, onSubmit }: {
  form: PassportForm;
  onChange: (form: PassportForm) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form id="family-passport-form" className="family-editor" onSubmit={onSubmit}>
      <section className="family-paper">
        <h2>Dane do sprawdzenia</h2>
        <dl className="family-facts">
          <div><dt>Dziecko</dt><dd>Zosia, 10 lat</dd></div>
          <div><dt>Dokument</dt><dd>Paszport</dd></div>
        </dl>
      </section>
      <label>
        <span>Cel podróży</span>
        <select required value={form.purpose} onChange={(e) => onChange({ ...form, purpose: e.target.value })}>
          <option value="">Wybierz cel</option>
          {travelPurposes.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
      <label>
        <span>Punkt paszportowy</span>
        <select required value={form.office} onChange={(e) => onChange({ ...form, office: e.target.value })}>
          <option value="">Wybierz punkt</option>
          {passportOffices.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
    </form>
  );
}

function SessionLinks({ invites }: { invites?: FamilyInvites }) {
  const [copied, setCopied] = useState("");
  if (!invites) return null;
  return (
    <>
      <p className="family-lead">Otwórz link w nowej karcie lub skopiuj go na drugie urządzenie. Każdy link otwiera jeden profil w tym pokazie.</p>
      {(["tomasz", "zosia"] as const).map((role) => {
        const name = familyMembers[role].name;
        const link = familyInvite(invites[role]);
        return (
          <section className="family-paper family-link-card" key={role}>
            <h2>{name}</h2>
            <p>{role === "tomasz" ? "Drugi opiekun · decyzja w sprawie zgody" : "Dziecko · status własnego dokumentu"}</p>
            <a className="family-secondary" href={link} target="_blank" rel="noopener noreferrer">Otwórz profil <ExternalLink size={15} /></a>
            <button className="family-secondary" onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied("Skopiowano link do profilu: " + name);
              } catch {
                setCopied("Użyj opcji „Kopiuj adres linku” przy przycisku „Otwórz profil”.");
              }
            }}>Kopiuj link <Link2 size={15} /></button>
          </section>
        );
      })}
      {copied && <p className="family-note" role="status">{copied}</p>}
    </>
  );
}

export function FamilyWorkspace({ onClose, onGo, activeTab, onAssistant, session, decision, onInbox, unread = 0 }: {
  onClose: () => void;
  onGo: (tab: Tab) => void;
  activeTab: Tab;
  onAssistant: () => void;
  session: ReturnType<typeof useFamilySession>;
  decision?: boolean;
  onInbox: () => void;
  unread?: number;
}) {
  const { data, busy, connected, error, hasSession, start, act } = session;
  const [trail, setTrail] = useState<Screen[]>(["family"]);
  const openedDecision = useRef(false);
  const requestedSession = useRef(hasSession);
  const [memberId, setMemberId] = useState<FamilyRole>("zosia");
  const [editor, setEditor] = useState({ form: { purpose: "", office: "" }, revision: 0 });
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const view = data?.view;
  const screen = view ? trail.at(-1)! : "family";
  const canGoBack = !!view && trail.length > 1;
  const current = view?.case;
  const request = current?.request;
  const owner = view?.role === "aleksandra";
  const member = view?.members.find(({ id }) => id === memberId);
  const locked = busy || !connected;
  const open = (next: Screen) => setTrail((previous) => [...previous, next]);
  const home = () => setTrail(["family"]);
  const back = () => canGoBack ? setTrail(trail.slice(0, -1)) : onClose();

  useEffect(() => {
    if (hasSession || requestedSession.current) return;
    requestedSession.current = true;
    void start();
  }, [hasSession, start]);

  useLayoutEffect(() => {
    if (!decision || !view?.case || openedDecision.current) return;
    openedDecision.current = true;
    const destination = view.role === "aleksandra" ? "case" : view.case.status === "pending" ? "consent" : "history";
    setTrail(["family", destination]);
  }, [decision, view]);

  useLayoutEffect(() => {
    content.current?.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [screen]);

  function edit() {
    setEditor({
      form: current?.form ?? { purpose: "Wyjazd wakacyjny", office: "" },
      revision: current?.revision ?? 0,
    });
    open("form");
  }

  function openMember(selected: Member) {
    setMemberId(selected.id);
    open("member");
  }

  let body: ReactNode;
  let actions: ReactNode;
  if (!view) {
    body = (
      <div className="family-hero">
        <WavePattern />
        <span className="family-icon"><UsersRound size={23} /></span>
        <h2>Sprawy rodziny</h2>
        {error && !hasSession
          ? <button className="family-primary" disabled={busy} onClick={() => { home(); void start(); }}>Spróbuj ponownie <ArrowRight size={17} /></button>
          : <p role="status">Wczytujemy sprawy rodziny…</p>}
      </div>
    );
  } else if (screen === "family") {
    body = (
      <>
        {owner && !current && (
          <section className="family-hero">
            <WavePattern />
            <span className="family-icon"><Plane size={23} /></span>
            <h2>Rodzinny wyjazd</h2>
            <p>Sprawdź paszporty domowników i przygotuj potrzebne dokumenty.</p>
            <button className="family-primary" onClick={() => open("travel")}>
              Przygotuj rodzinę do wyjazdu <ArrowRight size={17} />
            </button>
          </section>
        )}
        {view.role !== "zosia" && (
          <section className="family-section">
            <h2>Wspólna sprawa</h2>
            {current ? (
              <button className="family-row family-paper family-current" aria-describedby="family-card-status" onClick={() => open(owner ? "case" : "consent")}>
                <span className="family-icon"><FileText size={19} /></span>
                <span className="family-row-text">
                  <strong>{owner ? "Paszport Zosi" : "Prośba o zgodę"}</strong>
                  <small role="status" id="family-card-status">{!owner && current.status === "pending" ? "Od Aleksandry · paszport Zosi" : statusLabels[current.status]}</small>
                </span>
                <ChevronRight size={17} />
              </button>
            ) : (
              <p className="family-note">{owner ? "Paszport Zosi wymaga uwagi." : "Tutaj pojawi się prośba Aleksandry."}</p>
            )}
          </section>
        )}
        <section className="family-section">
          <h2>Domownicy</h2>
          <MemberRows members={view.members} onMember={openMember} />
        </section>
        {owner && current && <button className="family-text-button" onClick={() => open("travel")}><Plane size={17} /> Przygotuj rodzinę do wyjazdu <ChevronRight size={16} /></button>}
        {current && <button className="family-text-button" onClick={() => open("history")}><History size={17} /> Historia współpracy <ChevronRight size={16} /></button>}
        {owner && <button className="family-text-button" onClick={() => open("sessions")}><Link2 size={17} /> Udostępnij link dla Tomasza <ChevronRight size={16} /></button>}
      </>
    );
  } else if (screen === "travel" && owner) {
    body = (
      <>
        <MemberRows members={view.members} onMember={openMember} />
        <section className="family-paper family-attention">
          <CircleAlert size={21} />
          <div><h2>Sprawdź paszport Zosi</h2><p>Kończy się jego ważność. Przygotujcie wniosek o nowy dokument.</p></div>
        </section>
      </>
    );
    actions = <button className="family-primary" onClick={() => open("case")}>Otwórz sprawę paszportu <ArrowRight size={17} /></button>;
  } else if (screen === "member" && member) {
    body = (
      <section className="family-paper">
        <h2>{member.relation}</h2>
        {member.passport ? (
          <dl className="family-facts"><div><dt>{member.passport.label}</dt><dd><PassportStatus member={member} /></dd></div></dl>
        ) : (
          <p className="family-note">Status tego dokumentu jest dostępny dla jego właściciela i opiekunów w pokazie.</p>
        )}
        {owner && member.id === "zosia" && (
          <>
            <p>Jako opiekunka możesz przygotować wniosek. Tomasz podejmuje decyzję po otrzymaniu prośby.</p>
            <button className="family-text-button" onClick={() => open("case")}>Przejdź do sprawy paszportu <ChevronRight size={16} /></button>
          </>
        )}
      </section>
    );
  } else if (screen === "case" && owner) {
    body = (
      <>
        {current ? <CaseStatus status={current.status} /> : <p className="family-lead">Przygotuj wniosek o paszport dla Zosi i poproś Tomasza o zgodę.</p>}
        {current && (
          <section className="family-paper">
            <h2>Dane wniosku</h2><ApplicationDetails form={current.form} />
            {(current.status === "draft" || current.status === "declined") && (
              <button className="family-text-button" onClick={edit}>Edytuj dane wniosku <ChevronRight size={16} /></button>
            )}
          </section>
        )}
        {current?.status === "ready" && <p className="family-note">Oboje opiekunowie zakończyli przygotowanie. Wniosek pozostaje w aplikacji.</p>}
        {current?.status === "declined" && <p className="family-note">Możesz sprawdzić dane i ponowić prośbę.</p>}
        {current?.status === "pending" && <button className="family-text-button" onClick={() => open("sessions")}><Link2 size={17} /> Udostępnij link dla Tomasza <ChevronRight size={16} /></button>}
        {current && <button className="family-text-button" onClick={() => open("history")}><History size={17} /> Zobacz historię współpracy <ChevronRight size={16} /></button>}
      </>
    );
    if (!current || current.status === "declined")
      actions = <button className="family-primary" onClick={edit}>{current ? "Przygotuj ponownie" : "Uzupełnij wniosek"} <ArrowRight size={17} /></button>;
    else if (current.status !== "ready")
      actions = <button className="family-primary" onClick={() => open("consent")}>
        {current.status === "draft" ? "Sprawdź zakres prośby" : "Sprawdź prośbę o zgodę"} <ArrowRight size={17} />
      </button>;
    else
      actions = <button className="family-primary" onClick={home}>Wróć do rodziny <ArrowRight size={17} /></button>;
  } else if (screen === "form" && owner) {
    body = <PassportEditor
      form={editor.form}
      onChange={(form) => setEditor({ ...editor, form })}
      onSubmit={async (event) => {
        event.preventDefault();
        if (await act({ type: "save", form: editor.form }, editor.revision)) back();
      }}
    />;
    actions = <button type="submit" form="family-passport-form" className="family-primary" disabled={locked}>Zapisz i sprawdź <ArrowRight size={17} /></button>;
  } else if (screen === "consent" && current && (owner || request)) {
    const reviewing = owner && current.status === "draft";
    const deciding = !owner && request?.status === "pending";
    body = (
      <>
        {reviewing
          ? <p className="family-lead">Tomasz otrzyma poniższe informacje, by zdecydować w sprawie przygotowania paszportu Zosi.</p>
          : <CaseStatus status={current.status} />}
        <section className="family-paper">
          <h2>Paszport Zosi</h2>
          <dl className="family-facts">
            <div><dt>Nadawca</dt><dd>Aleksandra</dd></div>
            <div><dt>Odbiorca</dt><dd>Tomasz</dd></div>
          </dl>
          <ApplicationDetails form={reviewing ? current.form : request?.form ?? current.form} />
        </section>
        <section className="family-paper family-scope">
          <h2><ShieldCheck size={18} /> Zakres udostępnienia</h2>
          <ul>{requestScope.map((item) => <li key={item}>{item}</li>)}</ul>
          <p>Tomasz zobaczy dane potrzebne do wyrażenia zgody na paszport Zosi.</p>
        </section>
      </>
    );
    if (reviewing)
      actions = <button className="family-primary" disabled={locked} onClick={async () => {
        if (await act({ type: "request" })) back();
      }}>Poproś Tomasza o zgodę <ArrowRight size={17} /></button>;
    else if (deciding)
      actions = <div className="family-decision">
        <button className="family-secondary" disabled={locked} onClick={() => void act({ type: "decline" })}>Odmów</button>
        <button className="family-primary" disabled={locked} onClick={() => void act({ type: "approve" })}><Check size={17} /> Wyraź zgodę</button>
      </div>;
    else
      actions = <button className="family-primary" onClick={home}>Wróć do rodziny <ArrowRight size={17} /></button>;
  } else if (screen === "history" && current) {
    body = (
      <>
        <p className="family-lead">Paszport Zosi · przebieg współpracy</p>
        <ol className="family-timeline">
          {[...current.history].reverse().map((event) => (
            <li key={event.revision}>
              <span className="family-icon">{event.type === "approved" ? <Check size={17} /> : <ClipboardCheck size={17} />}</span>
              <div>
                <time dateTime={event.at}>{eventTime.format(new Date(event.at))}</time>
                <strong>{eventLabels[event.type]}</strong>
                <p>{familyMembers[event.actor].name}{event.requestId && " · prośba " + event.requestId}</p>
                {event.sharedForm && (
                  <small>Do Tomasza · Zosia, 10 lat · Paszport<br />
                    {event.sharedForm.purpose} · {event.sharedForm.office}
                  </small>
                )}
              </div>
            </li>
          ))}
        </ol>
      </>
    );
  } else if (screen === "sessions" && owner) {
    body = <>{current && <CaseStatus status={current.status} />}<SessionLinks invites={data?.invites} /></>;
  }

  return (
    <div className="family-shell">
      <header className="family-top">
        <button aria-label={canGoBack ? "Wstecz" : activeTab === "services" ? "Wróć do usług" : "Wróć do spraw"} onClick={back}><ArrowLeft size={21} /></button>
        <span>mObywatel Rodzina</span>
        <small>{view ? familyMembers[view.role].name : "Demo"}</small>
        {view && <button className="civic-icon-button" onClick={onInbox} aria-label="Powiadomienia"><Bell size={18} />{unread > 0 && <b className="notification-count">{unread}</b>}</button>}
      </header>
      <div className="family-scroll" ref={content}>
        <div className="family-screen" key={screen}>
          <h1 ref={heading} tabIndex={-1}>{screen === "member" ? member?.name : titles[screen]}</h1>
          {body}
        </div>
      </div>
      {((hasSession && !connected) || error || actions) && (
        <footer className="family-footer">
          {hasSession && !connected && <p role="status" className="family-note">Oczekiwanie na połączenie ze wspólną sprawą.</p>}
          {error && <p className="family-error" role="alert">{error}</p>}
          {actions}
        </footer>
      )}
      <CivicNav tab={activeTab} onGo={onGo} onAssistant={onAssistant} />
    </div>
  );
}
