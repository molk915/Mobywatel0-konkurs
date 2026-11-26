import { lazy, Suspense, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Bell, CalendarClock, ChevronRight, FileCheck2, FolderOpen, History, KeyRound, Link2, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { MostConnection, MostInvite, MostLayout, MostNotice } from "./components";
import {
  durationLabels, modeLabels, operations, type ControlCase, type ControlView, type Deadline, type Duration, type Grant, type Mode, type Operation, type Selection,
} from "./control-model";
import { canUsePasskey, controlRequest, createPasskey, getPasskey, useControl, type ControlData } from "./control-session";
import { delegationScope, formatMostDeadline } from "./model";
import { rememberDemoHelper, routeForMost, type useMostSession } from "./session";
import { WorkflowCard } from "../workflows/Workspace";
import { workflowDetails, type WorkflowCase } from "../workflows/model";
import { caseStages, DashboardDeadline, MostDashboardCases, MostDashboardHeader, MostDashboardProfile, type DashboardProfile } from "./MostDashboard";
import { InlineShowcaseContext, ShowcaseEntry } from "./InlineShowcase";
import { trackerDate, trackerSource } from "../data-tracker";
import type { Access } from "../domain";
import "./control.css";

type Session = ReturnType<typeof useMostSession>;
type Send = ReturnType<typeof useControl>["send"];
type Tab = "overview" | "access" | "dates" | "history" | "inbox" | "personal";
export type PersonalCases = { profile: string; items: WorkflowCase[]; ready: boolean; error?: string };
type Wizard = { resource?: string; change?: Grant; request?: string; prepare?: boolean; pay?: boolean; submit?: boolean; monitor?: boolean; recipientProfile?: string; viewOnly?: boolean };
const ControlCasePanel = lazy(() => import("./ControlCasePanel"));
const stages: Record<ControlCase["stage"], string> = {
  new: "Do zrobienia", draft: "Szkic", review: "Do zatwierdzenia", approved: "Gotowe do wysłania", correction: "Do poprawy", done: "Zakończona",
};
const dateLabel = (date: string) => formatMostDeadline(Date.parse(date + "T12:00:00Z"));
const localTime = (date: string) => new Intl.DateTimeFormat("pl", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Warsaw",
}).format(new Date(date));
const grantStatus = { active: "Aktywne", expired: "Wygasło", revoked: "Cofnięte", completed: "Wykorzystane" };
const signatureStatus = { draft: "Szkic", awaiting: "Oczekuje na podpis demonstracyjny", "signed-demo": "Podpisano w symulacji",
  "pending-demo": "Oczekuje na weryfikację demonstracyjną", "checked-demo": "Sprawdzono w symulacji",
  "rejected-demo": "Odrzucono w symulacji", revoked: "Cofnięto", expired: "Wygasło" };
const labels = { access: "Dostęp", dates: "Terminy", history: "Historia", inbox: "Powiadomienia", personal: "Moje sprawy" };
const icons = { access: UsersRound, dates: CalendarClock, history: History, inbox: Bell, personal: FolderOpen };
const methodLabels: Record<string, string> = { zaufany: "Podpis zaufany", osobisty: "Podpis osobisty", kwalifikowany: "Podpis kwalifikowany" };
const actionGroups: { title: string; members: Operation[] }[] = [
  { title: "Pilnuj terminów", members: ["monitor"] },
  { title: "Pomagaj w sprawie", members: ["view", "download", "prepare", "attach"] },
  { title: "Reprezentuj w pokazie", members: ["submit", "pay"] },
];

function download(title: string, text: string) {
  const href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = href;
  link.download = title + ".txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function ControlCenter({ session, role, profile, workflowKey, letterKey, onBack, nav, onPeerChange, initialTab = "access", personal, requestedCaseHref, sameTabDemo, dashboard, trackerEvent, editAccessId }: {
  session: Session; role: "owner" | "helper"; workflowKey?: string | null; letterKey?: string | null; onBack?: () => void; nav?: ReactNode;
  onPeerChange?: (token?: string) => void;
  initialTab?: Exclude<Tab, "overview">;
  profile?: string;
  personal?: PersonalCases;
  requestedCaseHref?: string;
  sameTabDemo?: boolean;
  dashboard?: DashboardProfile;
  trackerEvent?: Access;
  editAccessId?: string;
}) {
  const owner = role === "owner";
  const invitation = session.view?.invitation;
  const connected = invitation?.status === "active";
  const showcase = useContext(InlineShowcaseContext);
  const { view, send, busy, error } = useControl(session.token, owner || connected, workflowKey, letterKey);
  const [tab, setTab] = useState<Tab>(dashboard ? "overview" : initialTab);
  const [wizard, setWizard] = useState<Wizard>();
  const [pendingEdit, setPendingEdit] = useState(editAccessId);
  const [wizardKey, setWizardKey] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [assistant, setAssistant] = useState(false);
  const [disconnect, setDisconnect] = useState(false);
  const [helperProfile, setHelperProfile] = useState("");
  const [activeCase, setActiveCase] = useState<ControlCase>();
  const [caseInfoId, setCaseInfoId] = useState<string>();
  const [helperCaseId, setHelperCaseId] = useState<string | undefined>(() =>
    dashboard && !owner ? history.state?.mostHubCase : undefined);
  const [pendingCaseHref, setPendingCaseHref] = useState(requestedCaseHref);
  const [personalCase, setPersonalCase] = useState<ControlCase>();
  const [historyFilter, setHistoryFilter] = useState("");
  const inShowcase = window.parent !== window && new URLSearchParams(location.search).has("telefon-most");
  const inviteToken = invitation?.token;
  useEffect(() => {
    if (owner && inShowcase && inviteToken)
      window.parent.postMessage({ type: "most-dashboard-invite", token: inviteToken }, location.origin);
  }, [owner, inShowcase, inviteToken]);
  const openWizard = (next: Wizard) => { setWizardKey((value) => value + 1); setWizard(next); };
  const changeTab = (next: Tab) => { setWizard(undefined); setAssistant(false); setTab(next); setFeedback(""); };
  const unread = view?.notifications.filter(({ read }) => !read).length ?? 0;
  const enabledTabs: Exclude<Tab, "overview">[] = owner ? ["access", "dates", "history", "inbox"]
    : personal ? connected ? ["personal", "access", "dates", "inbox"] : ["personal", "access"]
      : ["access", "dates", "inbox"];
  const locked = busy || session.busy;
  const cases = view?.cases ?? [];
  const caseInfo = cases.find(({ id }) => id === caseInfoId);
  const dashboardHelperCase = cases.find(({ id }) => id === helperCaseId);
  const requestedCase = view && pendingCaseHref && findCase(view, pendingCaseHref);
  useEffect(() => {
    if (!view || !pendingCaseHref) return;
    setPendingCaseHref(undefined);
    if (requestedCase) void openCase(requestedCase);
  }, [view, pendingCaseHref, requestedCase]);
  useEffect(() => {
    if (!dashboard || owner) return;
    const restore = (event: PopStateEvent) => setHelperCaseId(event.state?.mostHubCase);
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [!!dashboard, owner]);
  const visibleHistory = (view?.history ?? []).filter((item) => !historyFilter || item.resource === historyFilter);
  useEffect(() => {
    if (!view || !pendingEdit) return;
    setPendingEdit(undefined);
    const change = view.grants.find(({ id, status }) => id === pendingEdit && status === "active");
    if (change) setWizard({ resource: change.resource, change });
  }, [view, pendingEdit]);
  async function shareTrackerEvent(entry: Access) {
    if (!connected && (!sameTabDemo || invitation?.status === "waiting")) {
      setFeedback(invitation?.status === "waiting"
        ? "Osoba zaufana musi najpierw przyjąć aktywne zaproszenie."
        : "Najpierw połącz się z osobą zaufaną za pomocą zaproszenia poniżej.");
      return;
    }
    if (!connected && !await session.act({ type: "invite", scope: delegationScope, demoHelper: "kacper" })) return;
    const result = await send({ type: "tracker-prepare", eventId: entry.id, title: ("Operacja na danych · " + entry.who).slice(0, 150),
      text: [entry.who, trackerDate.format(new Date(entry.at)), entry.purpose, entry.scope, trackerSource(entry), "Opis demonstracyjny"].join("\n").slice(0, 1500) });
    if (!result?.resource) return;
    const grant = result.view.grants.find((item) => item.resource === result.resource && item.status === "active");
    if (grant) {
      setFeedback("Ta osoba ma już dostęp do opisu. Zakres możesz zmienić poniżej.");
      return;
    }
    openWizard({ resource: result.resource, viewOnly: true, ...(!connected && sameTabDemo && { recipientProfile: "kacper" }) });
  }
  async function shareCase(item: ControlCase) {
    const current = view?.grants.find((grant) => grant.id === item.grantId);
    if (!connected) {
      if (!sameTabDemo) { setCaseInfoId(undefined); changeTab("access"); return; }
      if (!await session.act({ type: "invite", scope: delegationScope, demoHelper: "kacper" })) return;
    }
    openWizard({ resource: item.id, ...(current ? { change: current } : {
      prepare: true, pay: sameTabDemo && item.kind === "payment",
      submit: sameTabDemo && item.id === "registration" && (!connected || view?.helperProfile === "kacper"),
      monitor: !!dashboard && item.kind === "letter",
    }), ...(!connected && sameTabDemo && { recipientProfile: "kacper" }) });
  }
  async function openCase(item: ControlCase) {
    if (!owner && item.grantId && !await send({ type: "case-open", resource: item.id })) return;
    if (dashboard && !owner && view?.cases.some(({ id }) => id === item.id)) {
      history.pushState({ ...history.state, mostHubCase: item.id }, "");
      setHelperCaseId(item.id);
    } else setActiveCase(item);
  }
  function openInboxItem(resource: string | undefined) {
    const item = cases.find(({ id }) => id === resource);
    if (item) { openCase(item); return; }
    changeTab(view?.deadlines.some(({ id }) => id === resource) ? "dates" : "access");
  }

  async function register() {
    setFeedback("");
    const start = await send({ type: "passkey-start" });
    if (!start?.passkey?.options) return;
    try {
      const credential = await createPasskey(start.passkey.options);
      if ((await send({ type: "passkey-finish", credential }))?.passkey?.registered) setFeedback("Dodano klucz dostępu na potrzeby potwierdzania zmian.");
    } catch {
      setFeedback("Przeglądarka nie zarejestrowała klucza dostępu.");
    }
  }

  if (personalCase) return <Suspense fallback={<p className="most-loading" role="status">Otwieramy sprawę…</p>}>
    <ControlCasePanel item={personalCase} role="owner" profile={personal?.profile} back={() => setPersonalCase(undefined)} />
  </Suspense>;
  const openItem = dashboardHelperCase ?? activeCase;
  if (openItem) return <Suspense fallback={<p className="most-loading" role="status">Otwieramy sprawę…</p>}>
    <ControlCasePanel key={openItem.id + (openItem.href ?? "")} item={openItem} role={role} profile={profile} letterKey={letterKey}
      back={() => {
        if (dashboardHelperCase) { history.back(); return; }
        if (!owner) changeTab(dashboard ? "overview" : "access");
        setActiveCase(undefined);
      }} />
  </Suspense>;

  const overview = tab === "overview" && !wizard && !caseInfo && !assistant ? dashboard : undefined;
  const canShowInline = owner && sameTabDemo && showcase && (!connected || view?.helperProfile === "kacper");
  const residenceCase = canShowInline && showcase.active && connected
    ? cases.find(({ id, stage, grantId }) => id === "registration" && stage !== "done" && !grantId) : undefined;
  const showcaseEntry = canShowInline && !showcase.active ?
    <ShowcaseEntry onOpen={() => showcase.open(invitation?.token)}
      ready={connected && view?.grants.some(({ status }) => status === "active")} /> : undefined;
  const awaitingRecipient = wizard?.recipientProfile && view?.helperProfile !== wizard.recipientProfile;
  const connectionError = session.error || (!!dashboard && !owner && session.attempted && !session.connected && !session.ended
    ? "Nie udało się wczytać udostępnionych spraw." : "");
  const dashboardTitle = caseInfo?.title ?? (tab === "access" ? owner ? "Kto ma dostęp" : "Mój dostęp"
    : tab === "overview" ? "Sprawy · " + dashboard?.profile.first : labels[tab]);
  const caseHistory = (id: string) => { setCaseInfoId(undefined); setHistoryFilter(id); changeTab("history"); };
  function backToDashboard() {
    if (wizard) { setWizard(undefined); return; }
    if (assistant) { setAssistant(false); return; }
    if (caseInfo) { setCaseInfoId(undefined); return; }
    changeTab("overview");
  }

  return <MostLayout role={role} roleLabel={owner ? "Moje dane" : "Pomagam"} contextTitle="mObywatel Razem"
    title={assistant ? "Asystent wspólnych spraw" : wizard ? "Udziel dostępu" : trackerEvent ? "Pomoc przy operacji na danych" : dashboard ? dashboardTitle : owner ? "Centrum kontroli"
      : view ? inShowcase ? "Panel pomocy" : "Sprawy · " + view.owner : "Osoba zaufana"}
    screen={assistant ? "control-assistant" : wizard ? "control-wizard" : caseInfo ? "control-case-info" : "control-" + tab} nav={nav}
    header={overview ? <MostDashboardHeader onFullApp={overview.onFullApp} /> : undefined}
    headingAvatar={overview ? overview.profile.first.charAt(0) : undefined}
    onBack={dashboard ? backToDashboard : assistant || wizard ? () => { setAssistant(false); setWizard(undefined); } : onBack} busy={locked}>
    <div className="control-center" data-showcase={inShowcase} data-role={role} onClick={(event) => {
      if (owner || !view || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
          !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      const href = link?.getAttribute("href");
      const item = href && findCase(view, href);
      if (item) { event.preventDefault(); openCase(item); }
    }}>
      {overview && <MostDashboardProfile dashboard={overview} />}
      {session.ended && !owner && tab !== "personal" && <MostNotice tone="warning" live>Dostęp lub zaproszenie wygasły.</MostNotice>}
      {connectionError && <MostConnection connected={session.connected} retry={session.retry} error={connectionError} />}
      {error && <p className="most-error" role="alert">{error}</p>}
      {feedback && <MostNotice live>{feedback}</MostNotice>}
      {trackerEvent && !wizard && tab === "access" && <article className="control-card">
        <h2>{trackerEvent.who}</h2>
        <p>{trackerEvent.purpose}</p>
        <p>Osoba zaufana zobaczy opis tej jednej operacji.</p>
        <button className="most-button most-primary" disabled={!view || locked || !session.connected}
          onClick={() => void shareTrackerEvent(trackerEvent)}>Udostępnij opis operacji</button>
      </article>}
      {!owner && !connected && !session.ended && (tab === "access" || overview && session.view) && <>
        <p className="most-lead">Przyjmij zaproszenie od bliskiej osoby. Zobaczysz przyznane Ci sprawy i terminy.</p>
        {!inShowcase && <label className="control-field">Twój profil w pokazie<select value={helperProfile} onChange={(event) => setHelperProfile(event.target.value)}>
          <option value="">Osoba zaufana w pokazie</option><option value="kacper">Kacper Zieliński</option><option value="ewa">Ewa Wiśniewska</option>
          <option value="aleksandra">Aleksandra Nowak</option>
          </select></label>}
        <button className="most-button most-primary" disabled={locked || !session.connected}
          onClick={() => void session.act({ type: "join", profile: inShowcase ? "kacper" : helperProfile })}>Przyjmij zaproszenie</button>
      </>}
      {owner && (!session.view || session.ended) && (!dashboard || session.error || session.ended) && <>
        <p className="most-lead">Udostępnij wybraną sprawę, dokument lub termin bliskiej osobie. Ty ustalasz zakres i czas dostępu.</p>
        <button className="most-button most-primary" disabled={locked} onClick={() => void session.start()}>Przygotuj zaproszenie</button>
      </>}
      {!dashboard && (view || personal) && !assistant && !wizard && <nav className="control-tabs" aria-label="Centrum kontroli">
        {enabledTabs.map((key) => {
          const Icon = icons[key];
          const label = personal && key === "access" ? "Sprawy Ewy" : labels[key];
          return <button key={key} className={tab === key ? "selected" : ""} aria-current={tab === key ? "page" : undefined} onClick={() => {
            if (key === "history") setHistoryFilter("");
            changeTab(key);
          }}>
            <span className="control-tab-icon"><Icon size={17} aria-hidden="true" />{key === "inbox" && unread > 0 && <b aria-label={unread + " nieprzeczytanych"}>{unread}</b>}</span>
            <span className="control-tab-label">{label}</span>
          </button>;
        })}
      </nav>}
      {personal && tab === "personal" && <section className="control-section" aria-label="Moje sprawy Kacpra">
        <h2>Moje sprawy</h2>
        {personal.items.map((item) => <WorkflowCard key={item.id} item={item} open={() => setPersonalCase({
          id: item.id, title: workflowDetails[item.kind].title, kind: "workflow", stage: "new",
        })} />)}
        {!personal.items.length && <p role="status">{personal.error ?? (personal.ready ? "Brak własnych spraw." : "Wczytujemy Twoje sprawy…")}</p>}
      </section>}
      {assistant && view && <ControlAssistant key={view.role} view={view} busy={busy} send={send} />}
      {overview && view && <MostDashboardCases view={view} busy={locked || !session.connected} open={openCase} share={shareCase}
        showcaseEntry={showcaseEntry}
        showAccess={() => changeTab("access")} showDates={() => changeTab("dates")} showInbox={() => changeTab("inbox")}
        showHistory={() => { setHistoryFilter(""); changeTab("history"); }} showCaseInfo={(item) => setCaseInfoId(item.id)} />}
      {overview && !owner && view?.grants.some(({ resource }) => resource.startsWith("tracker:")) &&
        <button className="most-button most-secondary" onClick={() => changeTab("access")}>Opisy operacji na danych <ChevronRight size={18} /></button>}
      {overview && !view && !session.ended && !connectionError && !(session.view && !connected && !owner) &&
        <p className="most-dashboard-state" role="status">Wczytujemy wspólne sprawy…</p>}
      {caseInfo && !wizard && <section className="most-dashboard-state" aria-label="Szczegóły sprawy">
        <p>{[caseStages[caseInfo.stage], caseInfo.paymentAmount].filter(Boolean).join(" · ")}</p>
        <DashboardDeadline deadline={view?.deadlines.find(({ id }) => id === caseInfo.id)} isLetter={caseInfo.kind === "letter"} />
        <p>{caseInfo.people?.length ? "Dostęp ma " + caseInfo.people.join(", ") : "Sprawa prywatna"}</p>
        <button className="most-dashboard-primary" onClick={() => void openCase(caseInfo)}>
          {caseInfo.stage === "review" ? "Sprawdź szkic" : "Otwórz sprawę"} <ChevronRight size={18} aria-hidden="true" />
        </button>
        {(caseInfo.stage !== "done" || caseInfo.grantId) &&
          <button className="most-button most-secondary" disabled={locked || !session.connected} onClick={() => void shareCase(caseInfo)}>
            {caseInfo.grantId ? "Zmień zakres dostępu" : "Poproś o pomoc"}
          </button>}
        <button className="most-button most-secondary" onClick={() => caseHistory(caseInfo.id)}>Historia sprawy</button>
      </section>}
      {wizard && awaitingRecipient && <p role="status" className="most-dashboard-state">Wczytujemy dane osoby, która otrzyma dostęp…</p>}
      {wizard && view && !awaitingRecipient && <GrantWizard key={wizardKey} view={view} launch={wizard} send={send} busy={locked}
        onClose={(updated, resource) => {
          setWizard(undefined);
          setCaseInfoId(undefined);
          if (sameTabDemo && updated.helperProfile === "kacper" && invitation?.token) try {
            if (showcase && (showcase.active || window.matchMedia("(min-width: 901px)").matches)) {
              changeTab("overview");
              setCaseInfoId(resource);
            }
            showcase?.connect(invitation.token);
            rememberDemoHelper("kacper", invitation.token);
            setFeedback(dashboard ? "Kacper ma dostęp do sprawy."
              : "Zakres zapisany. Zmień profil na Kacpra i otwórz „Pomagam”.");
            return;
          } catch {
            setFeedback("Zakres zapisany. Aby otworzyć go na drugim profilu, użyj zaproszenia QR.");
            return;
          }
          setFeedback("Zakres dostępu zapisany.");
        }} />}
      {tab === "access" && !wizard && !assistant && <>
        {invitation?.status !== "waiting" && showcaseEntry}
        {view && connected && <article className="control-person">
          <div className="control-person-icon"><UsersRound size={23} /></div>
          <div><h2>{owner ? view.helper : view.owner}</h2>
            <p>{owner ? "Osoba zaufana jest połączona" : "Pomagasz w udostępnionym zakresie"}</p>
            {view.connectedAt && !inShowcase && <small>Połączenie od {localTime(view.connectedAt)}</small>}
          </div>
        </article>}
        {!dashboard && !trackerEvent && view && (connected || (owner && sameTabDemo)) && <CaseDashboard view={view} cases={cases} busy={locked || !session.connected} connected spotlightFine={sameTabDemo}
          open={openCase} share={shareCase} showDates={() => changeTab("dates")}
          showHistory={(id) => { setHistoryFilter(id); changeTab("history"); }} />}
        {!owner && view && connected && session.token && <RepresentedOwners key={session.token} view={view} token={session.token} />}
        {owner && view && onPeerChange && <section className="control-section" aria-label="Udzieliłem dostępu">
          {(!connected || (view.connections?.length ?? 0) > 1) && <h2>Udzieliłem dostępu</h2>}
          {(view.connections?.length ?? 0) > 1 && <div className="control-peer-list">
            {view.connections?.map((connection, index) => <button key={connection.token} className="most-button most-secondary"
              disabled={connection.current} onClick={() => onPeerChange(connection.primary ? undefined : connection.token)}>
              <span>{connection.name === "Osoba zaufana" ? "Połączenie " + (index + 1) : connection.name}
                <small>{connection.status === "active" ? "Aktywne" : connection.status === "waiting" ? "Oczekuje" : "Zakończone"}
                  {connection.lastActivity ? " · " + localTime(connection.lastActivity) : ""}</small></span>
              <ChevronRight size={17} />
            </button>)}
          </div>}
          {connected && <button className="most-inline" disabled={locked} onClick={async () => {
            const result = await send({ type: "add-peer" });
            if (result?.peer) onPeerChange(result.peer);
          }}>Zaproś kolejną osobę <ChevronRight size={17} /></button>}
        </section>}
        {owner && session.view && !connected && <>
          {invitation?.status === "waiting" && invitation.token
            ? inShowcase ? <>
              <MostNotice live>Zaproszenie jest gotowe. Odbierz je na telefonie Kacpra.</MostNotice>
              <details className="control-card control-settings"><summary><Link2 size={17} /> Kod QR i link</summary>
                <MostInvite invitation={invitation} generic />
              </details>
            </> : <MostInvite invitation={invitation} generic
              onShowcase={canShowInline ? () => showcase.open(invitation.token) : undefined} />
            : <button className="most-button most-primary" disabled={locked || !session.connected} onClick={() => void session.act({ type: "invite", scope: delegationScope })}>
                {inShowcase ? "Wyślij zaproszenie do Kacpra" : "Utwórz zaproszenie QR"}
              </button>}
        </>}
        {residenceCase && <button className="most-button most-primary" disabled={locked} onClick={() => void shareCase(residenceCase)}>
          Udostępnij zgłoszenie pobytu stałego <ChevronRight size={17} aria-hidden="true" />
        </button>}
        {view && connected && owner && <button className={"most-button " + (residenceCase ? "most-secondary" : "most-primary")} disabled={locked} onClick={() => openWizard({})}>Udziel dostępu <ChevronRight size={17} /></button>}
        {!dashboard && !trackerEvent && view && owner && !connected && !sameTabDemo && <CaseDashboard view={view} cases={cases} busy={locked || !session.connected}
          open={openCase} share={shareCase} showDates={() => changeTab("dates")}
          showHistory={(id) => { setHistoryFilter(id); changeTab("history"); }} />}
        {view && connected && !owner && <button className="most-button most-secondary" disabled={locked || view.requests.some(({ status }) => status === "pending")}
          onClick={async () => { if (await send({ type: "request", resource: "letter" })) setFeedback("Prośba o dostęp została wysłana."); }}>Poproś o dostęp do pisma</button>}
        {view?.requests.filter(({ status }) => status === "pending").map((request) => <article className="control-card" key={request.id}>
          <h2>{request.title}</h2><p>{owner ? "Osoba zaufana prosi o dostęp do jednej sprawy." : "Prośba czeka na decyzję właściciela."}</p>
          {owner && <div className="control-actions">
            <button className="most-button most-primary" onClick={() => openWizard({ request: request.id, resource: request.resource })} disabled={locked || !view.resources.some(({ id }) => id === request.resource)}>Rozpatrz prośbę</button>
            <button className="most-button most-secondary" onClick={() => void send({ type: "reject", id: request.id })} disabled={locked}>Odrzuć prośbę</button>
          </div>}
        </article>)}
        {view && <section className="control-section" aria-label="Zakres upoważnień">
          {view.grants.length > 0 && <h2>{owner ? "Udzielone upoważnienia" : "Upoważnienia aplikacyjne"}</h2>}
          {view.grants.map((grant) => <GrantCard key={grant.id} {...{ grant, view, send }} busy={locked}
            edit={() => openWizard({ change: grant, resource: grant.resource })} />)}
          {view.assignments.map(({ title, href }) => <a key={href} className="most-button most-secondary" href={href}>{title}<ChevronRight size={17} /></a>)}
          {!owner && !view.grants.length && !view.assignments.length && connected && <p className="most-lead">Tutaj pojawią się udostępnione sprawy, dokumenty i terminy.</p>}
          {dashboard && owner && view.grants.length === 0 && <p className="most-lead">Nie udzielono jeszcze dostępu w tym połączeniu.</p>}
        </section>}
        {view && <button className="most-button most-secondary" onClick={() => setAssistant(true)}><Sparkles size={18} /> Zapytaj asystenta</button>}
        {owner && view && <details className="control-card control-settings"><summary><KeyRound size={17} /> Bezpieczeństwo połączenia</summary>
          <p>Klucz dostępu potwierdza zmianę zakresu dostępu. Podpis dokumentu ma osobną ścieżkę.</p>
          {canUsePasskey() ? <button className="most-button most-secondary" disabled={locked || view.passkeyRegistered} onClick={() => void register()}>
            {view.passkeyRegistered ? "Klucz dostępu jest aktywny" : "Dodaj klucz dostępu"}
          </button> : <p>Ta przeglądarka obsługuje tutaj potwierdzenie demonstracyjne.</p>}
          {connected && (disconnect ? <div className="control-actions">
            <button className="most-button most-secondary" disabled={locked} onClick={() => setDisconnect(false)}>Anuluj odłączenie</button>
            <button className="most-button control-danger" disabled={locked} onClick={async () => { if (await session.act({ type: "revoke" })) setDisconnect(false); }}>Odłącz i zakończ dostęp</button>
          </div> : <button className="most-button control-danger" disabled={locked} onClick={() => setDisconnect(true)}>Odłącz osobę zaufaną</button>)}
        </details>}
      </>}
      {!assistant && !wizard && view && tab === "dates" && <Deadlines view={view} send={send} busy={locked} onFeedback={setFeedback} />}
      {!assistant && !wizard && view && tab === "history" && <section aria-label="Historia działań" className="control-timeline">
        <h2>Historia działań</h2>
        <label className="control-field">Filtr historii<select value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value)}>
          <option value="">Wszystkie sprawy i dane</option>
          {view.resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}
        </select></label>
        {visibleHistory.length ? visibleHistory.map((item) => <article key={item.id}>
          <time dateTime={item.at}>{localTime(item.at)}</time><h2>{item.label}</h2>
          <p>{item.actor}{item.result ? " · " + item.result : ""}</p>
          <p>{view.resources.find(({ id }) => id === item.resource)?.title ?? "Zarządzanie dostępem"}</p>
          {item.detail && <p>{item.detail}</p>}
        </article>) : <p className="most-lead">Brak działań w wybranym zakresie.</p>}
      </section>}
      {!assistant && !wizard && view && tab === "inbox" && <section className="control-section" aria-label="Powiadomienia o współpracy">
        {view.notifications.length ? view.notifications.map((item) => <article className="control-card" key={item.id}>
          <small>{localTime(item.at)}</small><h2>{item.title}</h2>
          {!item.read && <button className="most-inline" onClick={() => void send({ type: "read", id: item.id })}>Oznacz jako przeczytane</button>}
          {item.resource && <button className="most-inline" onClick={() => openInboxItem(item.resource)}>Przejdź do szczegółów <ChevronRight size={16} /></button>}
        </article>) : <p className="most-lead">Brak nowych zdarzeń w Centrum kontroli.</p>}
      </section>}
    </div>
  </MostLayout>;
}

function findCase(view: ControlView, href: string): ControlCase | undefined {
  const key = new URL(href, location.origin).hash;
  if (!/^#(?:most|workflow)=[A-Za-z0-9_-]{32}$/.test(key)) return;
  const matches = (item: { href?: string }) => item.href && new URL(item.href, location.origin).hash === key;
  const item = view.cases.find(matches);
  if (item) return item;
  const assignment = view.assignments.find(matches);
  if (assignment) return { id: assignment.href, title: assignment.title, href: assignment.href,
    kind: key.startsWith("#most=") ? "letter" : "workflow", stage: "new" };
}

function CaseDashboard({ view, cases, busy, connected, spotlightFine, open, share, showDates, showHistory }: {
  view: ControlView; cases: ControlCase[]; busy: boolean; connected?: boolean; open: (item: ControlCase) => void;
  spotlightFine?: boolean; share: (item: ControlCase) => void; showDates: () => void; showHistory: (id: string) => void;
}) {
  const owner = view.role === "owner";
  const [filter, setFilter] = useState<"all" | "draft" | "review">("all");
  const drafts = cases.filter(({ stage }) => ["draft", "correction"].includes(stage)).length;
  const reviews = cases.filter(({ stage }) => stage === "review").length;
  const visible = cases.filter(({ stage }) => filter === "all" || (filter === "draft" ? ["draft", "correction"].includes(stage) : stage === "review"));
  const priority = (item: ControlCase) => item.stage === "review" ? 2 : spotlightFine && item.id === "fine" ? 1 : 0;
  return <section className="control-section control-case-board" aria-label={owner ? "Moje sprawy" : "Udostępnione sprawy"}>
    <h2>{owner ? "Moje sprawy" : "Udostępnione sprawy"}</h2>
    <div className="control-board-filters" role="group" aria-label="Filtry spraw">
      <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Wszystkie <strong>{cases.length}</strong></button>
      <button aria-pressed={filter === "draft"} onClick={() => setFilter("draft")}>Szkice <strong>{drafts}</strong></button>
      <button aria-pressed={filter === "review"} onClick={() => setFilter("review")}>Do zatwierdzenia <strong>{reviews}</strong></button>
      <button onClick={showDates}>Pokaż terminy <strong>{view.deadlines.filter(({ done }) => !done).length}</strong></button>
    </div>
    {visible.length ? <ul className="control-board-list">
      {visible.sort((a, b) => priority(b) - priority(a)).map((item) => <li className="control-card" key={item.id}>
        <div className="control-card-head"><strong>{item.title}</strong>
          <span className="control-status" data-urgent={item.stage === "review"} data-active={item.stage === "done"}>{stages[item.stage]}</span>
        </div>
        {item.people?.length ? <small>Ma dostęp: {item.people.join(", ")}</small> : owner && <small>Sprawa prywatna</small>}
        {item.paymentAmount && <small>{item.paymentAmount}</small>}
        {item.updated && <small>Ostatnia zmiana · {localTime(item.updated)}</small>}
        <div className="control-case-actions">
          <button className="most-inline" aria-label={(item.stage === "review" && owner ? "Sprawdź szkic " : "Otwórz sprawę ") + item.title}
            disabled={!owner && Boolean(item.grantId) && busy} onClick={() => open(item)}>{item.stage === "review" && owner ? "Sprawdź szkic" : "Otwórz sprawę"}<ChevronRight size={16} /></button>
          {owner && connected && (item.stage !== "done" || item.grantId) && <button className="most-inline" disabled={busy}
            aria-label={(item.grantId ? "Zakres dostępu " : "Przekaż sprawę ") + item.title} onClick={() => share(item)}>
            {item.grantId ? "Zakres dostępu" : "Przekaż sprawę"}
          </button>}
          {owner && <button className="most-inline" aria-label={"Historia sprawy " + item.title} onClick={() => showHistory(item.id)}>Historia sprawy</button>}
        </div>
      </li>)}
    </ul> : <p className="most-lead">{filter === "all" ? "Sprawy pojawią się po przyznaniu dostępu." : "Brak spraw w tym widoku."}</p>}
  </section>;
}

function RepresentedOwners({ view, token }: { view: ControlView; token: string }) {
  const [others, setOthers] = useState<{ token: string; name: string }[]>([]);
  useEffect(() => {
    const storageKey = "most-trusted-directory:" + view.helper;
    let known: string[];
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
      known = Array.isArray(saved) ? saved.filter((value) => typeof value === "string" && /^[A-Za-z0-9_-]{32}$/.test(value)) : [];
      known = [token, ...known.filter((value) => value !== token)].slice(0, 6);
      sessionStorage.setItem(storageKey, JSON.stringify(known));
    } catch { return; }
    if (known.length < 2) return;
    const scope = new AbortController();
    async function refresh() {
      const records = await Promise.allSettled(known.slice(1).map(async (key) => {
        const { view: access } = await controlRequest(key, undefined, scope.signal);
        return access.role === "helper" && access.helper === view.helper ? [{ token: key, name: access.owner }] : [];
      }));
      if (!scope.signal.aborted) setOthers(records.flatMap((result) => result.status === "fulfilled" ? result.value : []));
    }
    void refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => { scope.abort(); clearInterval(timer); };
  }, [token, view.helper]);
  if (!others.length) return null;
  return <section className="control-section" aria-label="Reprezentuję innych">
    <h2>Reprezentuję innych</h2>
    {others.map((item) => {
      const href = new URL(routeForMost("helper", "app", item.token));
      href.searchParams.set("centrum", new URLSearchParams(location.search).get("centrum") === "1" ? "2" : "1");
      return <a className="most-button most-secondary" href={href.href} key={item.token}>{item.name} <ChevronRight size={17} /></a>;
    })}
  </section>;
}

function GrantWizard({ view, launch, busy, send, onClose }: { view: ControlView; launch: Wizard; busy: boolean; send: Send; onClose: (view: ControlView, resource: string) => void }) {
  const resourceLabel = useId();
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const wizardCard = useRef<HTMLDivElement>(null);
  const previous = launch.change;
  const [step, setStep] = useState(launch.resource ? 1 : 0);
  const [resource, setResource] = useState(launch.resource ?? "");
  const [actions, setActions] = useState<Operation[]>(previous?.actions ?? (launch.submit ? ["view", "prepare", "submit"] : launch.pay ? ["view", "monitor", "prepare", "pay"]
    : launch.monitor ? ["view", "monitor", "prepare"] : launch.prepare ? ["view", "prepare"] : launch.viewOnly || launch.request ? ["view"] : []));
  const [mode, setMode] = useState<Mode>(previous?.mode ?? (launch.pay || launch.submit ? "independent" : "owner"));
  const [duration, setDuration] = useState<Duration>(previous?.duration ?? (launch.monitor ? "case" : "open"));
  const [end, setEnd] = useState(previous?.end ?? "");
  const [formalRequired, setFormalRequired] = useState(Boolean(previous?.formalRequired));
  const [authorization, setAuthorization] = useState<ControlData["authorization"]>();
  const [authError, setAuthError] = useState("");
  const [verifying, setVerifying] = useState(false);
  useLayoutEffect(() => {
    if (step === (launch.resource ? 1 : 0)) return;
    stepHeading.current?.focus();
    stepHeading.current?.scrollIntoView({ block: "start" });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const transition = wizardCard.current?.animate([
      { opacity: .35, transform: "translateY(12px) scale(.985)" },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ], { duration: 330, easing: "cubic-bezier(.16, 1, .3, 1)" });
    return () => transition?.cancel();
  }, [step, launch.resource]);
  const item = view.resources.find(({ id }) => id === resource);
  const canExecute = actions.includes("submit") || actions.includes("pay");
  const isCase = item && ["letter", "workflow", "payment"].includes(item.kind);
  const valid = item && actions.length > 0 && !(actions.includes("download") && !actions.includes("view")) &&
    !(actions.includes("prepare") && !actions.includes("view")) && !(actions.includes("attach") && !actions.includes("prepare")) &&
    !(canExecute && (!actions.includes("prepare") || mode === "owner")) && !(duration === "once" && !canExecute) &&
    !(duration === "case" && !isCase) && !(duration === "period" && !end);
  const selection: Selection = { resource, actions, mode, duration, end, formalRequired: canExecute && formalRequired };
  async function confirm() {
    if (!authorization) return;
    setVerifying(true);
    setAuthError("");
    try {
      const assertion = authorization.options ? await getPasskey(authorization.options) : undefined;
      const granted = await send({ type: "grant", key: authorization.key, assertion, confirmDemo: authorization.method === "demo" });
      if (granted) onClose(granted.view, resource);
    } catch {
      setAuthError("Nie potwierdzono operacji kluczem dostępu. Spróbuj ponownie.");
    } finally {
      setVerifying(false);
    }
  }
  return <div className="control-card control-wizard" ref={wizardCard}>
    <p className="control-kicker"><ShieldCheck size={16} /> Upoważnienie w aplikacji</p>
    <h2 ref={stepHeading} tabIndex={-1}>{["Wybierz zasób", "Wybierz czynności i czas dostępu", "Sprawdź, co udostępniasz", "Potwierdź dostęp"][step]}</h2>
    {step < 2 && <p>Osoba zaufana: <strong>{view.helper}</strong></p>}
    {step === 0 && <label className="control-field" htmlFor={resourceLabel}><span>Zasób</span>
      <select id={resourceLabel} aria-label="Zasób" value={resource} onChange={(event) => { setResource(event.target.value); setActions([]); setDuration("open"); setMode("owner"); }}>
        <option value="">Wybierz…</option>{view.resources.filter((entry) => !view.grants.some((grant) => grant.resource === entry.id && grant.status === "active"))
          .map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
      </select></label>}
    {step === 1 && item && <>
      <p><strong>{item.title}</strong></p>
      {actionGroups.map(({ title, members }) => {
        const choices = item.actions.filter((action) => members.includes(action));
        if (!choices.length) return null;
        return <fieldset className="control-checks" key={title}><legend>{title}</legend>
          {choices.map((action) => <label key={action}><input type="checkbox" checked={actions.includes(action)}
            onChange={(event) => setActions((current) => event.target.checked ? [...current, action] : current.filter((entry) => entry !== action))} />
            {operations[action]}</label>)}
        </fieldset>;
      })}
      {isCase && <label className="control-field">Sposób zatwierdzania<select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
        {Object.entries(modeLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>}
      {canExecute && <fieldset className="control-checks"><legend>Wymagania wykonania</legend>
        <label><input type="checkbox" checked={formalRequired} onChange={(event) => setFormalRequired(event.target.checked)} />
          Wymagaj weryfikacji demonstracyjnego pełnomocnictwa przed wykonaniem</label>
      </fieldset>}
      <label className="control-field">Czas dostępu<select value={duration} onChange={(event) => setDuration(event.target.value as Duration)}>
        {Object.entries(durationLabels).filter(([key]) => key !== "once" || canExecute).filter(([key]) => key !== "case" || isCase)
          .map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      {duration === "period" && <label className="control-field">Ostatni dzień dostępu<input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label>}
      {canExecute && !valid && <p>Do wykonania wybierz otwieranie i przygotowanie sprawy oraz tryb samodzielny albo osobne potwierdzenie.</p>}
    </>}
    {step >= 2 && item && <>
      <dl className="control-grant-summary">
        <div><dt>Kto otrzyma dostęp</dt><dd>{view.helper}</dd></div>
        <div><dt>Co udostępniasz</dt><dd>{item.title}</dd></div>
        <div><dt>Co ta osoba może zrobić</dt><dd><ul>{actions.map((action) => <li key={action}>{operations[action]}</li>)}</ul></dd></div>
        <div><dt>Jak długo</dt><dd>{durationLabels[duration]}{duration === "period" && end ? " · " + dateLabel(end) : ""}</dd></div>
        {isCase && <div><dt>Kto decyduje o wykonaniu</dt><dd>{modeLabels[mode]}</dd></div>}
      </dl>
      {canExecute && formalRequired && <p>Końcowa czynność będzie dostępna po weryfikacji dokumentu w symulacji.</p>}
      <p>Ten zakres obowiązuje w aplikacji demonstracyjnej. Dokument pełnomocnictwa ma osobną ścieżkę.</p>
    </>}
    {step === 3 && authorization && <MostNotice>{authorization.method === "passkey" ? "Potwierdź kluczem dostępu w przeglądarce." : "Potwierdzenie demonstracyjne. Potwierdź jednorazowym kodem sesji."}</MostNotice>}
    {authError && <p role="alert" className="most-error">{authError}</p>}
    <div className="control-actions">
      {step === 0 && <button className="most-button most-primary" disabled={!resource} onClick={() => setStep(1)}>Dalej</button>}
      {step === 1 && <button className="most-button most-primary" disabled={!valid} onClick={() => setStep(2)}>Sprawdź podsumowanie</button>}
      {step === 2 && <button className="most-button most-primary" disabled={busy} onClick={async () => {
        const result = await send({ type: "authorize", selection, changeId: previous?.id, requestId: launch.request });
        if (result?.authorization) { setAuthorization(result.authorization); setStep(3); }
      }}>Przejdź do potwierdzenia</button>}
      {step === 3 && <button className="most-button most-primary" disabled={busy || verifying} onClick={() => void confirm()}>
        {authorization?.method === "passkey" ? "Potwierdź kluczem dostępu" : "Potwierdź dostęp"}
      </button>}
      {step > (launch.resource ? 1 : 0) && <button className="most-button most-secondary" disabled={busy || verifying} onClick={() => setStep(step - 1)}>Poprzedni krok</button>}
    </div>
  </div>;
}

function GrantCard({ grant, view, send, busy, edit }: { grant: Grant; view: ControlView; send: Send; busy: boolean; edit: () => void }) {
  const active = grant.status === "active";
  const owner = view.role === "owner";
  const [revoke, setRevoke] = useState(false);
  const [document, setDocument] = useState<ControlData["document"]>();
  const [formal, setFormal] = useState(false);
  const item = view.resources.find(({ id }) => id === grant.resource);
  const isCase = item && ["letter", "workflow", "payment"].includes(item.kind);
  const canOpenDoc = !grant.href && grant.actions.includes("view");
  return <article className="control-card">
    <div className="control-card-head"><h3>{grant.title}</h3><span className="control-status" data-active={active}>{grantStatus[grant.status]}</span></div>
    <ul>{grant.actions.map((action) => <li key={action}>{operations[action]}</li>)}</ul>
    <p><small>Przyznano {localTime(grant.created)} · do {localTime(new Date(grant.expires).toISOString())}</small></p>
    {grant.actions.includes("prepare") && <p>{modeLabels[grant.mode]}</p>}
    {active && grant.waitingForFormal && <p>Wykonanie czeka na demonstracyjną weryfikację pełnomocnictwa.</p>}
    {owner && grant.formal && <p>{signatureStatus[grant.formal.status]} · dokument demo</p>}
    {!owner && active && grant.href && <a className="most-button most-secondary" href={grant.href}>Otwórz sprawę <ChevronRight size={17} /></a>}
    {!owner && active && canOpenDoc && <div className="control-actions">
      <button className="most-button most-secondary" disabled={busy} onClick={async () => setDocument((await send({ type: "document", id: grant.resource }))?.document)}>
        {grant.resource.startsWith("tracker:") ? "Otwórz opis operacji" : "Otwórz dokument"}
      </button>
      {grant.actions.includes("download") && <button className="most-button most-secondary" disabled={busy} onClick={async () => {
        const result = (await send({ type: "document", id: grant.resource, download: true }))?.document;
        if (result) download(result.title + " · demo", result.text);
      }}>Pobierz dokument</button>}
      {document && <p className="control-preformatted">{document.text}</p>}
    </div>}
    {owner && (active || grant.formal) && <div className="control-actions">
      {active && <button className="most-button most-secondary" disabled={busy} onClick={edit}>Zmień zakres</button>}
      {(active && isCase || grant.formal) && <button className="most-button most-secondary" disabled={busy} onClick={() => setFormal(!formal)}><FileCheck2 size={16} /> Dokument pełnomocnictwa</button>}
      {active && <button className="most-button control-danger" disabled={busy} onClick={async () => {
        if (!revoke) setRevoke(true);
        else if (await send({ type: "revoke", id: grant.id })) setRevoke(false);
      }}>{revoke ? "Potwierdź cofnięcie dostępu" : "Cofnij dostęp"}</button>}
      {active && revoke && <button className="most-inline" onClick={() => setRevoke(false)}>Anuluj</button>}
    </div>}
    {owner && formal && (active || grant.formal) && <FormalDocument {...{ grant, send, busy }} />}
  </article>;
}

function FormalDocument({ grant, send, busy }: { grant: Grant; send: Send; busy: boolean }) {
  const procedure = ["letter", "registration"].includes(grant.resource) ? "administrative" :
    ["tax", "tax-address"].includes(grant.resource) ? "tax" : "civil";
  const [method, setMethod] = useState(procedure === "civil" ? "kwalifikowany" : "zaufany");
  const [preview, setPreview] = useState<{ status: string; version: number; text: string }>();
  const item = grant.formal;
  const act = (type: string, extra = {}) => send({ type, id: grant.id, ...extra });
  const visible = preview?.status === item?.status && preview?.version === item?.version ? preview?.text : "";
  return <section className="control-formal" aria-label="Projekt pełnomocnictwa">
    <h4>Projekt pełnomocnictwa</h4>
    <p>Przygotuj dokument do tej sprawy i przejdź przez próbny podpis. Projekt nie zostanie złożony w urzędzie.</p>
    {grant.status === "active" && (!item || item.status === "rejected-demo") && <>
      <button className="most-button most-secondary" disabled={busy} onClick={() => void act("formal-draft", { procedure })}>Przygotuj projekt pełnomocnictwa</button>
    </>}
    {item && <>
      <p><strong>{signatureStatus[item.status]}</strong> · wersja {item.version}</p>
      {item.filing && <p>{item.filing}</p>}
      {item.basis && <a className="most-inline" href={item.basis.href} target="_blank" rel="noopener noreferrer">{item.basis.label}</a>}
      <div className="control-actions">
        <button className="most-button most-secondary" disabled={busy} onClick={async () => {
          if (visible) { setPreview(undefined); return; }
          const result = (await act("formal-document"))?.document;
          if (result) setPreview({ text: result.text, version: item.version, status: item.status });
        }}>{visible ? "Zamknij podgląd" : "Otwórz dokument pełnomocnictwa"}</button>
        <button className="most-button most-secondary" disabled={busy} onClick={async () => {
          const result = (await act("formal-document", { download: true }))?.document;
          if (result) download(result.title, result.text);
        }}>Pobierz wzór pełnomocnictwa</button>
      </div>
      {visible && <p className="control-preformatted">{visible}</p>}
    </>}
    {grant.status === "active" && item?.status === "draft" && <>
      <label className="control-field">Symulowana metoda podpisu<select value={method} onChange={(event) => setMethod(event.target.value)}>
        {(item.methods ?? [method]).map((option) => <option key={option} value={option}>{methodLabels[option]}</option>)}
      </select></label>
      <button className="most-button most-secondary" disabled={busy} onClick={() => void act("formal-method", { method })}>Zapisz metodę podpisu</button>
    </>}
    {grant.status === "active" && item?.status === "awaiting" && <button className="most-button most-primary" disabled={busy} onClick={() => void act("formal-sign", { confirmDemo: true })}>Potwierdź próbny podpis</button>}
    {grant.status === "active" && item?.status === "signed-demo" && <button className="most-button most-secondary" disabled={busy} onClick={() => void act("formal-review")}>Przekaż do sprawdzenia</button>}
    {grant.status === "active" && item?.status === "pending-demo" && <div className="control-actions">
      <button className="most-button most-secondary" disabled={busy} onClick={() => void act("formal-result", { accept: true })}>Oznacz dokument jako sprawdzony</button>
      <button className="most-button control-danger" disabled={busy} onClick={() => void act("formal-result", { accept: false })}>Oznacz dokument jako odrzucony</button>
    </div>}
  </section>;
}

function Deadlines({ view, send, busy, onFeedback }: { view: ControlView; send: Send; busy: boolean; onFeedback: (value: string) => void }) {
  const [open, setOpen] = useState("");
  const [date, setDate] = useState("");
  return <section className="control-section" aria-label="Monitorowane terminy">
    <h2>Monitorowane terminy</h2>
    {!view.deadlines.length && <p className="most-lead">W tym zakresie nie ma monitorowanych terminów.</p>}
    {view.deadlines.map((item) => <article className="control-card control-deadline" key={item.id}>
      <div className="control-card-head"><span className="control-kicker">{item.category}</span>
        <DeadlineStatus item={item} /></div>
      <h3>{item.title}</h3>
      <p><time dateTime={item.date}>{dateLabel(item.date)}</time> · {item.helper ?? view.owner}</p>
      {open === item.id && <div className="control-details">
        <p>Źródło: {item.source}</p>
        {item.action && <p>{item.action}</p>}
        {item.href && <a className="most-button most-secondary" href={item.href}>Otwórz sprawę</a>}
        {item.editable && <form className="control-actions" onSubmit={async (event) => {
          event.preventDefault();
          if (await send({ type: "deadline", id: item.id, date })) onFeedback("Termin został zaktualizowany.");
        }}>
          <label className="control-field">Data terminu<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <button className="most-button most-secondary" disabled={busy}>Zapisz termin</button>
        </form>}
        {view.role === "helper" && !item.done && <button className="most-button most-secondary" disabled={busy} onClick={async () => {
          if (await send({ type: "nudge", id: item.id })) onFeedback("Przypomnienie jest dostępne w Centrum właściciela.");
        }}>Powiadom właściciela</button>}
      </div>}
      <button className="most-inline" aria-expanded={open === item.id} onClick={() => { setOpen(open === item.id ? "" : item.id); setDate(item.date); }}>
        {open === item.id ? "Zwiń szczegóły" : "Zobacz szczegóły"} <ChevronRight size={16} />
      </button>
    </article>)}
  </section>;
}

function DeadlineStatus({ item }: { item: Deadline }) {
  const label = item.done ? "Załatwiono" : item.days < 0 ? "Po terminie" : item.days === 0 ? "Dzisiaj" : item.days === 1 ? "Jutro" : "Za " + item.days + " dni";
  return <span className="control-status" data-urgent={!item.done && item.days <= 7}>{label}</span>;
}

function ControlAssistant({ view, busy, send }: { view: ControlView; busy: boolean; send: Send }) {
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState<ControlData["answer"]>();
  const scope = JSON.stringify([view.grants.map(({ id, status }) => [id, status]), view.deadlines.map(({ id, date }) => [id, date])]);
  const [answeredScope, setAnsweredScope] = useState("");
  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    const result = await send({ type: "assistant", text });
    if (result?.answer) { setAnswer(result.answer); setAnsweredScope(scope); }
  }
  return <article className="control-card control-assistant">
    <span className="control-kicker"><Sparkles size={17} /> {view.role === "owner" ? "Twoje sprawy i działania" : "Działasz w imieniu: " + view.owner}</span>
    <p>Asystent sprawdza upoważnienia przed udzieleniem odpowiedzi. Operację potwierdzasz w odpowiednim formularzu.</p>
    <form className="control-actions" onSubmit={ask}>
      <label className="control-field">Pytanie do asystenta<textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} rows={3} placeholder="Jakie terminy wymagają uwagi?" /></label>
      <button className="most-button most-primary" disabled={busy || !text.trim()}>Zapytaj</button>
    </form>
    <div aria-live="polite">{answer && scope === answeredScope && <>
      <p className="control-preformatted">{answer.text}</p>
      {answer.provider === "demo" && <small>Odpowiedź demonstracyjna na podstawie dostępnych danych</small>}
      {answer.links.map(({ title, href }) => <a key={href} className="most-button most-secondary" href={href}>{title} <ChevronRight size={16} /></a>)}
    </>}</div>
  </article>;
}
