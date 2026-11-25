import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Check, ClipboardCheck, FileText, History, KeyRound, Link2, MessageSquare, RotateCcw, ShieldCheck, Sparkles, UserRoundPlus } from "lucide-react";
import { CivicNav, WavePattern } from "../CivicChrome";
import type { Tab } from "../domain";
import {
  MostComments, MostConnection, MostDeadline, MostInvite, MostLayout, MostLetter, MostNotice, MostProgress, MostRow, Portrait, ScopeSummary,
} from "./components";
import {
  eventLabels, initialScope, formatMostDeadline, mostSummary, mostTitle, scopeLabels, statusLabels,
  type MostEvent, type MostInvitation, type MostScope,
} from "./model";
import { MostInbox, MostTasks, PackageSummary, unread, type MostSession } from "./MostWork";
import { useMostSession, type MostContext } from "./session";

const panes = ["work", "access", "invite", "review", "history", "comments", "document", "draft", "end", "reset", "inbox", "tasks", "explain", "needed"] as const;
type Pane = (typeof panes)[number];
const paneTitles: Partial<Record<Pane, string>> = {
  access: "Zakres dostępu",
  invite: "Zaproś Kacpra",
  review: "Sprawdź przygotowaną sprawę",
  history: "Historia współpracy",
  comments: "Komentarze",
  document: "Podgląd pisma",
  draft: "Pakiet uzupełnienia",
  end: "Zakończ współpracę",
  reset: "Zresetuj sprawę",
  inbox: "Powiadomienia", tasks: "Przygotuj sprawę", explain: "Wyjaśnienie pisma", needed: "Wymagany dokument",
};
const timelineDate = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short" });

function MostHistory({ entries }: { entries: MostEvent[] }) {
  if (!entries.length) return <MostNotice>Historia zacznie się od utworzenia zaproszenia.</MostNotice>;
  return <ol className="most-timeline">
    {[...entries].reverse().map((entry) => (
      <li key={entry.id}>
        <span className="most-icon">{entry.type === "accept" ? <Check size={17} /> : <History size={17} />}</span>
        <div>
          <time dateTime={entry.at}>{timelineDate.format(new Date(entry.at))}</time>
          <strong>{entry.type === "comment" && entry.role === "owner" ? "Dodała komentarz" : eventLabels[entry.type]}</strong>
          <p>{entry.role === "owner" ? "Ewa" : "Kacper"}</p>
          {entry.scope && <p>Zakres · {Object.entries(scopeLabels).filter(([key]) => entry.scope?.[key as keyof MostScope]).map(([, label]) => label).join(", ") || "podstawowy opis i termin"}</p>}
          {entry.detail && <p>{entry.detail}</p>}
        </div>
      </li>
    ))}
  </ol>;
}

function AccessEditor({ scope, onChange }: { scope: MostScope; onChange: (scope: MostScope) => void }) {
  return (
    <>
      <div className="most-author">
        <Portrait person="kacper" />
        <span><strong>Kacper</strong><small>{mostTitle} · dostęp na 10 minut</small></span>
      </div>
      <p className="most-lead">Wybierz, co pomocnik może zobaczyć i zrobić. Dostęp możesz cofnąć w każdej chwili.</p>
      <fieldset className="most-checks">
        <legend>Dane i uprawnienia</legend>
        {(Object.keys(scopeLabels) as (keyof MostScope)[]).map((key) => <label key={key}>
          <input
            type="checkbox"
            checked={scope[key]}
            disabled={key === "reference" && !scope.document}
            onChange={(event) => onChange({ ...scope, [key]: event.target.checked, ...(key === "document" && !event.target.checked ? { reference: false } : {}) })}
          />
          <span>{scopeLabels[key]}</span>
        </label>)}
      </fieldset>
      <MostNotice>PESEL, pozostałe dokumenty i sprawy zostają u Ciebie.</MostNotice>
    </>
  );
}

function Participant({ invitation }: { invitation: MostInvitation }) {
  const status = invitation.status === "waiting" ? "Czeka na dołączenie"
    : invitation.status === "revoked" ? "Dostęp zakończony"
      : invitation.status === "expired" ? "Dostęp wygasł"
        : invitation.online ? "Połączony" : "Offline · dostęp nadal aktywny";
  return (
    <div className="most-participant">
      <Portrait person="kacper" />
      <div><strong>Kacper</strong><small>Zaufana osoba</small></div>
      <span className={"most-presence " + (invitation.online ? "online" : "")} role="status"><i />{status}</span>
    </div>
  );
}

type OwnerProps = {
  context?: MostContext;
  onClose?: () => void;
  onGo?: (tab: Tab) => void;
  activeTab?: Tab;
  onAssistant?: () => void;
  trustedToken?: string | null;
  onInbox?: () => void;
  notifications?: number;
  session?: MostSession;
  initialPane?: "work" | "review" | "end" | "access" | "tasks";
};
export function MostOwner(props: OwnerProps) {
  return props.session ? <OwnerPanel {...props} session={props.session} /> : <StandaloneOwner {...props} />;
}
function StandaloneOwner(props: OwnerProps) {
  const session = useMostSession("owner", props.context ?? "app", true);
  return <OwnerPanel {...props} session={session} />;
}
function OwnerPanel({ context = "app", onClose, onGo, activeTab = "cases", onAssistant, onInbox, notifications, session, initialPane, trustedToken }: OwnerProps & { session: MostSession }) {
  const inApp = !!onClose;
  const [pane, setPane] = useState<Pane>(() => initialPane ?? (inApp && panes.includes(history.state?.mostPane) ? history.state.mostPane : "work"));
  const [historyReturn, setHistoryReturn] = useState<"review" | "work">(() =>
    inApp && history.state?.mostHistoryReturn === "review" ? "review" : "work");
  const [scope, setScope] = useState<MostScope>(initialScope);
  const { view, connected, attempted, busy, error, retry, ended, hasSession, act } = session;
  const invitation = view?.invitation;
  const inviteToken = invitation?.token;
  const active = invitation?.status === "active";
  const hasAccess = !!inviteToken;
  const [feedback, setFeedback] = useState("");
  const [reviewAction, setReviewAction] = useState<"correct" | "reject" | null>(null);
  useEffect(() => {
    if (pane === "review" && reviewAction === "correct") document.getElementById("most-feedback")?.focus();
    if (pane !== "review") setReviewAction(null);
  }, [pane, reviewAction]);
  const ready = view?.status === "review";
  const locked = !connected || busy;

  function go(next: Pane, replace = false) {
    const mostHistoryReturn = pane === "review" ? "review" : "work";
    if (next === "history") setHistoryReturn(mostHistoryReturn);
    if (inApp && next !== pane) {
      const route = { ...history.state, mostPane: next, mostHistoryReturn };
      if (replace) history.replaceState(route, "");
      else history.pushState(route, "");
    }
    session.clearError();
    setPane(next);
  }

  useEffect(() => {
    if (!inApp) return;
    const restore = (e: PopStateEvent) => {
      setPane(panes.includes(e.state?.mostPane) ? e.state.mostPane : "work");
      setHistoryReturn(e.state?.mostHistoryReturn === "review" ? "review" : "work");
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [inApp]);

  useEffect(() => {
    if (context === "stage" && inviteToken)
      window.parent.postMessage({ type: "most-invite", token: inviteToken }, location.origin);
  }, [context, inviteToken]);

  useEffect(() => {
    if (context !== "stage" || window.parent === window) return;
    const reset = async (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== location.origin || event.data?.type !== "most-reset") return;
      const done = await act({ type: "reset" });
      if (done) {
        go("work");
        setScope(initialScope);
      }
      window.parent.postMessage({ type: "most-reset-result", done }, location.origin);
    };
    window.addEventListener("message", reset);
    return () => window.removeEventListener("message", reset);
  });

  let body: ReactNode;
  let action: ReactNode;
  if (!view) {
    body = ended
      ? <MostNotice tone="warning">Dostęp do zapisanej sprawy wygasł. Możesz otworzyć nową sprawę.</MostNotice>
      : <p className="most-lead" role="status">Wczytujemy sprawę…</p>;
    if (ended || (!busy && !hasSession)) action = <button className="most-button most-primary" onClick={() => void session.start()}>Otwórz sprawę <ArrowRight size={17} /></button>;
  } else if (pane === "access") {
    body = <AccessEditor scope={scope} onChange={setScope} />;
    action = <><button className="most-button most-primary" disabled={locked || hasAccess} onClick={async () => {
      if (await act({ type: "invite", scope })) go(context === "stage" ? "work" : "invite", true);
    }}>Utwórz zaproszenie <ArrowRight size={17} /></button>
      {trustedToken && <button className="most-button most-secondary" disabled={locked || hasAccess ||
        !scope.document || !scope.form || !scope.response || !scope.attachments} onClick={async () => {
        if (await act({ type: "invite", scope, trustedOwnerToken: trustedToken, maySubmit: true })) go("work", true);
      }}>Upoważnij osobę zaufaną do wysłania</button>}
      {trustedToken && <p className="most-muted">Prawo wysłania pozwala osobie zaufanej samodzielnie zatwierdzić i wysłać odpowiedź w systemie demo.</p>}
    </>;
  } else if (pane === "invite") {
    body = invitation ? <><Participant invitation={invitation} /><MostInvite key={inviteToken} invitation={invitation} /></> : <MostNotice>Utwórz nowe zaproszenie, aby udostępnić sprawę.</MostNotice>;
    action = <button className="most-button most-primary" onClick={() => go("work", true)}>Przejdź do współpracy <ArrowRight size={17} /></button>;
  } else if (pane === "inbox") {
    body = <MostInbox items={view.notifications} markRead={(id) => act({ type: "read", id })}
      onOpen={(item) => go(item.type === "review" && ready ? "review" : "work")} />;
  } else if (pane === "review" && ready && view.work.reviewId !== undefined) {
    const reviewId = view.work.reviewId;
    body = <>
      <PackageSummary view={view} compare />
      <div className="most-review-links">
        <button className="most-inline" onClick={() => go("history")}>Sprawdź wykonane czynności</button>
        {!reviewAction && <button className="most-inline most-danger" onClick={() => setReviewAction("reject")}>Odrzuć pakiet</button>}
      </div>
      {reviewAction === "reject" && <MostNotice tone="warning">Odrzucenie kończy przegląd tego pakietu. Historia sprawy pozostanie dostępna.</MostNotice>}
      {reviewAction === "correct" && <form id="most-correction" className="most-editor" onSubmit={async (e) => {
        e.preventDefault();
        if (await act({ type: "correction", reviewId, text: feedback })) { setFeedback(""); setReviewAction(null); go("work", true); }
      }}>
        <label>Co trzeba poprawić?<textarea id="most-feedback" rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={500} /></label>
      </form>}
    </>;
    action = <><p className="most-decision-effect">{view.complete ? "Po zatwierdzeniu przejdziesz do wysyłki."
      : "Kacper przekazał szkic. Uzupełnij pakiet albo prześlij uwagi."}</p><div className="most-actions">
      {reviewAction ? <button className="most-button most-secondary" onClick={() => setReviewAction(null)}>Anuluj</button>
        : <button className="most-button most-secondary" onClick={() => setReviewAction("correct")}>{hasAccess ? "Poproś o poprawki" : "Wróć do poprawek"}</button>}
      {reviewAction === "correct" ? <button form="most-correction" type="submit" className="most-button most-primary" disabled={locked || feedback.trim().length < 5}>Przekaż uwagi</button>
        : <button className="most-button most-primary" disabled={locked} onClick={async () => {
          if (!view.complete && !reviewAction) {
            if (await act({ type: "resumeDraft", reviewId })) go("tasks", true);
            return;
          }
          if (await act({ type: reviewAction === "reject" ? "reject" : "accept", reviewId })) { setReviewAction(null); go("work", true); }
        }}><Check size={17} /> {reviewAction === "reject" ? "Potwierdź odrzucenie" : view.complete ? "Zatwierdź pakiet" : "Uzupełnij pakiet"}</button>}
    </div></>;
  } else if (pane === "tasks" && !ready && !["finished", "rejected"].includes(view.status)) {
    body = <MostTasks key={view.work.reviewId ?? 0} session={session} />;
    action = <button className="most-button most-primary" disabled={locked || !view.canReview} onClick={async () => {
      if (await act({ type: "review" })) go("review", true);
    }}>Przekaż do zatwierdzenia</button>;
  } else if (pane === "explain") {
    body = <>
      <MostNotice>Wyjaśnienie demonstracyjne</MostNotice>
      <p className="most-lead">{mostSummary} Możesz użyć kopii umowy najmu, potwierdzić adres lokalu i krótko uzasadnić uzupełnienie.</p>
      <MostDeadline at={view.deadlineAt} />
      <button className="most-inline" onClick={() => go("work")}>Przejdź do sprawy</button>
      {!hasAccess && !ready && view.status !== "finished" && <button className="most-button most-primary" onClick={() => go("access")}>Poproś o pomoc</button>}
      <button className="most-inline" onClick={() => go("needed")}>Zobacz potrzebne dokumenty</button>
    </>;
  } else if (pane === "needed") {
    body = <p className="most-lead">Potrzebujesz kopii umowy najmu potwierdzającej prawo do lokalu. W zadaniach możesz dołączyć przykładową kopię. Termin to {formatMostDeadline(view?.deadlineAt)}.</p>;
  } else if (pane === "history") {
    body = <><MostHistory entries={view.history} />
      {inApp && new URLSearchParams(location.search).get("narzedzia") === "1" &&
        <button className="most-inline" onClick={() => go("reset")}><RotateCcw size={17} /> Przywróć początek sprawy</button>}
    </>;
  } else if (pane === "comments" && invitation?.scope.comments) {
    body = <MostComments comments={view.comments} disabled={locked || !active} onSend={(text) => act({ type: "comment", text })} />;
  } else if (pane === "document" && view.document) {
    body = <><MostLetter document={view.document} /><MostDeadline at={view.deadlineAt} /></>;
  } else if (pane === "draft") {
    body = <PackageSummary view={view} />;
  } else if (pane === "end") {
    body = <><p className="most-lead">Kacper od razu straci dostęp do sprawy. Zachowasz projekt odpowiedzi i historię współpracy.</p><MostNotice>Nowy dostęp będzie wymagał nowego zaproszenia.</MostNotice></>;
    action = <button className="most-button most-primary" disabled={locked || !hasAccess} onClick={async () => {
      if (await act({ type: "revoke" })) go("work", true);
    }}><KeyRound size={18} /> Cofnij dostęp</button>;
  } else if (pane === "reset") {
    body = <p className="most-lead">Reset przywróci początkowy szkic, usunie historię tego pokazu i zakończy dostęp Kacpra.</p>;
    action = <button className="most-button most-primary" disabled={locked} onClick={async () => {
      if (await act({ type: "reset" })) {
        setScope(initialScope);
        go("work", true);
      }
    }}><RotateCcw size={17} /> Zacznij od nowa</button>;
  } else {
    body = (
      <>
        {invitation ? (
          <section className="most-brief civic-pattern-card">
            <WavePattern />
            <Participant invitation={invitation} />
            <MostProgress status={view.status} waiting={invitation.status === "waiting"} />
          </section>
        ) : <>
          <p className="most-lead">Urząd prosi o potwierdzenie, że masz prawo do lokalu. Możesz dołączyć kopię umowy najmu.</p>
          <MostDeadline at={view.deadlineAt} />
          {view.status === "new" && <section className="most-next-step" aria-labelledby="most-next-step-title">
            <UserRoundPlus size={19} aria-hidden="true" />
            <div>
              <h2 id="most-next-step-title">Bliska osoba może pomóc</h2>
              <p>Kacper może uzupełnić adres i uzasadnienie oraz dołączyć kopię umowy. Ty sprawdzisz i zatwierdzisz gotowy pakiet.</p>
              <button className="most-inline" onClick={() => go("tasks")}>Przygotuj odpowiedź samodzielnie <ArrowRight size={16} /></button>
            </div>
          </section>}
        </>}
        <MostNotice live tone={view.status === "finished" ? "success" : "info"}>{statusLabels[view.status]}</MostNotice>
        {view.status === "finished" && (view.sentAt
          ? <section className="most-proposal">
            <MostNotice live tone="success">Zapisano potwierdzenie wysyłki.</MostNotice>
            <p>Potwierdzenie dotyczy prototypu. Odpowiedź nie trafiła do urzędu.</p>
            {view.receipt && <>
              <p>Numer potwierdzenia <strong>{view.receipt.number}</strong></p>
              <p>{timelineDate.format(new Date(view.receipt.at))} · Urząd Miasta Lublin (demo)</p>
              <a className="most-inline" download={view.receipt.number + ".txt"}
                href={"data:text/plain;charset=utf-8," + encodeURIComponent("Potwierdzenie demonstracyjne\n" + view.receipt.number +
                  "\n" + view.receipt.at + "\nUrząd Miasta Lublin (demo)\nZałącznik: " +
                  (view.work.upload?.name ?? (view.work.attachment && view.files[view.work.attachment]?.name) ?? "—"))}>
                Pobierz potwierdzenie
              </a>
            </>}
            {!invitation && <button className="most-inline" onClick={() => go("history")}>Historia wysyłki</button>}
          </section>
          : <section className="most-proposal">
            <p><strong>Odbiorca:</strong> {view.document?.office ?? "Urząd Miasta Lublin"}</p>
            <p>W prototypie zapiszesz potwierdzenie. Odpowiedź nie trafi do urzędu.</p>
            <button className="most-button most-primary" disabled={locked} onClick={() => void act({ type: "send", reviewId: view.work.reviewId })}>Wyślij odpowiedź <ArrowRight size={17} /></button>
          </section>)}
        {ready && (
          <section className="most-proposal" aria-label="Sprawa gotowa">
            <p role="status"><Sparkles size={18} /> {view.complete ? "Teraz Twoja kolej. Pakiet jest kompletny." : "Kacper przekazał Ci szkic do sprawdzenia."}</p>
            <button className="most-button most-primary" onClick={() => go("review")}>Sprawdź przygotowaną sprawę <ArrowRight size={17} /></button>
          </section>
        )}
        {active && view.work.documentRequest === "pending" && (
          <section className="most-proposal" aria-label="Prośba Kacpra">
            <p>Kacper potrzebuje kopii umowy najmu, żeby dokończyć pakiet.</p>
            <button className="most-button most-primary" disabled={locked} onClick={() => void act({ type: "share" })}>Udostępnij kopię umowy Kacprowi</button>
          </section>
        )}
        {!invitation && view.document && <MostLetter document={view.document} />}
        {invitation && <div className="most-rows">
          {hasAccess && <MostRow icon={<Link2 size={18} />} title="Link i kod QR" detail={active ? "Sprawdź ważność zaproszenia" : "Otwórz zaproszenie dla Kacpra"} onClick={() => go("invite")} />}
          <MostRow icon={<FileText size={18} />} title="Pismo z urzędu" detail={view.document?.office} onClick={() => go("document")} />
          <MostRow icon={<ClipboardCheck size={18} />} title="Pakiet uzupełnienia" detail={statusLabels[view.status]} onClick={() => go("draft")} />
          {invitation.scope.comments && <MostRow icon={<MessageSquare size={18} />} title="Komentarze" detail={view.comments.length ? view.comments.length + " w tej współpracy" : "Porozmawiajcie o piśmie"} onClick={() => go("comments")} />}
          <MostRow icon={<History size={18} />} title="Historia współpracy" onClick={() => go("history")} />
        </div>}
        <button className="most-inline" onClick={() => go("explain")}>Wyjaśnij pismo <ArrowRight size={16} /></button>
        {onAssistant && <button className="most-inline" onClick={onAssistant}><Sparkles size={16} /> Zapytaj asystenta o pismo</button>}
        {!ready && (invitation || view.status !== "new") && !["finished", "rejected"].includes(view.status) && <button className="most-inline" onClick={() => go("tasks")}>Przygotuj odpowiedź samodzielnie <ArrowRight size={16} /></button>}
        {!invitation && view.status === "finished" && <PackageSummary view={view} />}
        {hasAccess && invitation && <ScopeSummary scope={invitation.scope} />}
      </>
    );
    if (!hasAccess && !ready && view.status !== "finished") action = <button className="most-button most-primary" disabled={locked} onClick={() => go("access")}><UserRoundPlus size={19} /> {invitation ? "Poproś ponownie o pomoc" : "Poproś o pomoc"}</button>;
    else if (hasAccess) action = <button className="most-button most-secondary" onClick={() => go("end")}><ShieldCheck size={17} /> Zakończ współpracę</button>;
  }

  const screen = view ? pane : "loading";
  const showConnection = !ended && ((attempted && !connected) || !!error);
  return (
    <MostLayout
      role="owner" notifications={notifications ?? unread(view)} onInbox={onInbox ?? (() => go("inbox"))}
      title={view ? paneTitles[pane] ?? mostTitle : mostTitle}
      contextTitle={invitation ? "Wspólna sprawa" : "Twoja sprawa"}
      screen={screen}
      busy={!view && busy}
      onBack={pane !== "work" ? () => go(pane === "history" && ready ? historyReturn : "work", true) : onClose}
      footer={(action || showConnection || error) && <>
        {showConnection ? <MostConnection connected={connected} retry={retry} error={error} /> : error && <p className="most-error" role="alert">{error}</p>}
        {action}
      </>}
      nav={onGo && onAssistant && <CivicNav tab={activeTab} onGo={onGo} onAssistant={onAssistant} />}
    >{body}</MostLayout>
  );
}
