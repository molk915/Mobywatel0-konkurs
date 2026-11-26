import { useId, useState, type ReactNode } from "react";
import { ArrowRight, FileText, LockKeyhole, MessageSquare, Send, Sparkles } from "lucide-react";
import { MostComments, MostConnection, MostDeadline, MostLayout, MostLetter, MostNotice, MostProgress, MostRow, Portrait, ScopeSummary } from "./components";
import { mostSummary, mostTitle, statusLabels } from "./model";
import { MostInbox, MostTasks, PackageSummary, unread } from "./MostWork";
import { useMostSession, type MostContext } from "./session";
import { ControlCenter, type PersonalCases } from "./ControlCenter";
import { controlRequest } from "./control-session";
import type { DashboardProfile } from "./MostDashboard";

export function MostHelper({ context }: { context: MostContext }) {
  const session = useMostSession("helper", context);
  return <MostHelperWorkspace session={session} />;
}

export function MostHelperWorkspace({ session, close, nav, onInbox, notifications, controlTab, personal, requestedCaseHref, dashboard }: {
  session: ReturnType<typeof useMostSession>; close?: () => void; nav?: ReactNode; onInbox?: () => void; notifications?: number;
  controlTab?: "access" | "inbox";
  personal?: PersonalCases;
  requestedCaseHref?: string;
  dashboard?: DashboardProfile;
}) {
  const { view, connected, attempted, busy, error, ended, hasSession, retry, act, clearError } = session;
  const [pane, setPane] = useState<"work" | "document" | "comments" | "inbox">("work");
  const [submission, setSubmission] = useState<{ challenge: string; reviewId: number }>();
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const helperFormId = useId();
  const locked = busy || !connected;
  const scope = view?.invitation?.scope;
  const editable = view && ["preparing", "document", "correction"].includes(view.status);
  const canWork = scope && (scope.form || scope.response || scope.attachments || scope.requestDocument);
  function open(next: typeof pane) {
    clearError();
    setPane(next);
  }

  if (dashboard || view?.delegation?.kind === "trusted" || personal && ended)
    return <ControlCenter key={dashboard ? "dashboard" : "control"} session={session} role="helper"
      onBack={close} nav={nav} initialTab={controlTab} personal={personal} requestedCaseHref={requestedCaseHref} dashboard={dashboard} />;
  if (view?.delegation && !ended)
    return <MostLayout role="helper" screen="access-ended" title="Sprawa wycofana z pokazu" onBack={close} nav={nav}>
      <p className="most-lead">Aktualne upoważnienia znajdziesz w zakładce Pomagam.</p>
    </MostLayout>;

  if (ended || !hasSession) {
    const title = ended === "revoked" ? "Dostęp do sprawy został zakończony"
      : ended === "expired" ? "Czas dostępu upłynął" : "Zaproszenie jest niedostępne";
    return (
      <MostLayout role="helper" screen="access-ended" title={title} eyebrow={mostTitle} onBack={close} nav={nav}>
        <div className="most-waiting">
          <span className="most-icon"><LockKeyhole size={25} /></span>
          <p>Jeśli Ewa nadal potrzebuje Twojej pomocy, może utworzyć nowe zaproszenie.</p>
        </div>
        {close && <button className="most-inline" onClick={close}>Wróć do spraw <ArrowRight size={16} /></button>}
      </MostLayout>
    );
  }

  let body: ReactNode;
  let action: ReactNode;
  if (!view) {
    body = <p className="most-lead" role="status">Sprawdzamy zaproszenie od Ewy…</p>;
  } else if (pane === "inbox") {
    body = <MostInbox items={view.notifications} markRead={(id) => act({ type: "read", id })} onOpen={() => open("work")} />;
  } else if (pane === "document" && view.document) {
    body = <><MostLetter document={view.document} /><MostDeadline at={view.deadlineAt} />
      {view.invitation?.managed && session.token && <LetterAssistant token={session.token} />}</>;
  } else if (pane === "comments" && scope?.comments) {
    body = <MostComments comments={view.comments} disabled={locked} onSend={(text) => act({ type: "comment", text })} />;
  } else {
    const resources = <div className="most-rows">
      {view.document && <MostRow icon={<FileText size={18} />} title="Udostępnione pismo" detail={view.document.office} onClick={async () => {
        if (!view.invitation?.managed || await act({ type: "openDocument" })) open("document");
      }} />}
      {scope?.comments && <MostRow icon={<MessageSquare size={18} />} title="Komentarze" detail={view.comments.length ? view.comments.length + " w tej współpracy" : undefined} onClick={() => open("comments")} />}
    </div>;
    body = (
      <>
        <div className="most-author">
          <Portrait person="ewa" />
          <span><strong>Pomagasz Ewie</strong><small>Właścicielka sprawy</small></span>
          {connected && <span className="most-presence online" role="status"><i /> Połączono</span>}
        </div>
        <MostProgress status={view.status} />
        <MostNotice live tone={view.status === "finished" ? "success" : "info"}>{statusLabels[view.status]}</MostNotice>
        {view.sentAt && <MostNotice tone="success" live>Wysłano odpowiedź w pokazie.</MostNotice>}
        {view.receipt && <p>Potwierdzenie demonstracyjne {view.receipt.number}</p>}
        <p className="most-lead most-helper-lead">{view.document ? mostSummary : "Ewa udostępniła Ci wybrane czynności w tej sprawie."}</p>
        <MostDeadline at={view.deadlineAt} />
        {editable && canWork ? <MostTasks session={session} beforeForms={resources}
          helperFormId={scope && (scope.form || scope.response || scope.attachments) ? helperFormId : undefined}
          onDraftReady={setDraftReady} onDraftSaved={setDraftSaved} /> : resources}
        {view.status === "review" && !view.invitation?.maySubmit && <MostNotice tone="success">Przekazano Ewie do zatwierdzenia.</MostNotice>}
        {view.status === "review" && view.invitation?.maySubmit && <PackageSummary view={view} />}
        {scope && <ScopeSummary scope={scope} />}
      </>
    );
    if (editable && scope && (scope.form || scope.response || scope.attachments))
      action = <>
        {draftSaved && <MostNotice tone="success" live>Szkic zapisany.</MostNotice>}
        <button type="submit" value="save-draft" form={helperFormId} className="most-button most-secondary" disabled={locked || !draftReady && !view.canReview}>Zapisz szkic</button>
        <button type="submit" form={helperFormId} className="most-button most-primary" disabled={locked || !draftReady && !view.canReview}>
          <Send size={17} /> {view.invitation?.maySubmit ? "Sprawdź odpowiedź" : "Przekaż do zatwierdzenia"}
        </button>
      </>;
    if (view.status === "review" && view.invitation?.maySubmit) {
      const reviewId = view.work.reviewId;
      const confirmFirst = view.invitation.confirmationMode === "confirm" && submission?.reviewId !== reviewId;
      action = <button className="most-button most-primary" disabled={locked}
        onClick={async () => {
          if (confirmFirst && reviewId !== undefined) {
            const result = await session.commandResult({ type: "authorizeSend", reviewId });
            if (result && result.challenge) setSubmission({ reviewId, challenge: result.challenge });
          } else {
            await act({ type: "send", reviewId, challenge: submission?.challenge });
            setSubmission(undefined);
          }
        }}><Send size={17} /> {confirmFirst ? "Rozpocznij osobne potwierdzenie" : "Zatwierdź i wyślij (demo)"}</button>;
    }
  }

  const showConnection = (attempted && !connected) || !!error;
  return (
    <MostLayout
      role="helper"
      notifications={notifications ?? unread(view)}
      onInbox={onInbox ?? (() => open("inbox"))}
      nav={nav}
      title={pane === "inbox" ? "Powiadomienia" : pane === "document" ? "Udostępnione pismo" : pane === "comments" ? "Komentarze" : mostTitle}
      eyebrow={pane === "work" ? "Pomoc w sprawie" : undefined}
      screen={view ? (pane === "work" && !editable ? "result" : pane) : "loading"}
      onBack={pane === "work" ? close : () => open("work")}
      footer={(action || showConnection) && <>
        {showConnection && <MostConnection connected={connected} error={error} retry={retry} />}
        {action}
      </>}
    >{body}</MostLayout>
  );
}

function LetterAssistant({ token }: { token: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  return <details className="most-draft">
    <summary><Sparkles size={17} /> Zapytaj o pismo</summary>
    <form className="most-editor" onSubmit={async (event) => {
      event.preventDefault();
      setBusy(true);
      setAnswer("");
      try {
        const result = await controlRequest(token, { type: "assistant", text: question });
        setAnswer(result.answer?.text ?? "Brak odpowiedzi dla tej sprawy.");
      } catch (cause) {
        setAnswer(cause instanceof Error ? cause.message : "Asystent jest niedostępny.");
      } finally { setBusy(false); }
    }}>
      <label>Pytanie o udostępnione pismo<textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} maxLength={1000} /></label>
      <button className="most-button most-secondary" disabled={busy || !question.trim()}>Wyjaśnij pismo</button>
    </form>
    {answer && <p role="status">{answer}</p>}
  </details>;
}
