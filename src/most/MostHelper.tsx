import { useState, type ReactNode } from "react";
import { ArrowRight, FileText, LockKeyhole, MessageSquare, Send } from "lucide-react";
import { MostComments, MostConnection, MostDeadline, MostLayout, MostLetter, MostNotice, MostRow, Portrait, ScopeSummary } from "./components";
import { mostSummary, mostTitle, statusLabels } from "./model";
import { MostInbox, MostTasks, unread } from "./MostWork";
import { useMostSession, type MostContext } from "./session";

export function MostHelper({ context }: { context: MostContext }) {
  const session = useMostSession("helper", context);
  return <MostHelperWorkspace session={session} />;
}

export function MostHelperWorkspace({ session, close, nav, onInbox, notifications }: {
  session: ReturnType<typeof useMostSession>; close?: () => void; nav?: ReactNode; onInbox?: () => void; notifications?: number;
}) {
  const { view, connected, attempted, busy, error, ended, hasSession, retry, act, clearError } = session;
  const [pane, setPane] = useState<"work" | "document" | "comments" | "inbox">("work");
  const locked = busy || !connected;
  const scope = view?.invitation?.scope;
  const editable = view && ["preparing", "document", "correction"].includes(view.status);
  const canWork = scope && (scope.form || scope.response || scope.attachments || scope.requestDocument);
  function open(next: typeof pane) {
    clearError();
    setPane(next);
  }

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
    body = <><MostLetter document={view.document} /><MostDeadline at={view.deadlineAt} /></>;
  } else if (pane === "comments" && scope?.comments) {
    body = <MostComments comments={view.comments} disabled={locked} onSend={(text) => act({ type: "comment", text })} />;
  } else {
    body = (
      <>
        <div className="most-author">
          <Portrait person="ewa" />
          <span><strong>Pomagasz Ewie</strong><small>Właścicielka sprawy</small></span>
          {connected && <span className="most-presence online" role="status"><i /> Połączono</span>}
        </div>
        <MostNotice live tone={view.status === "finished" ? "success" : "info"}>{statusLabels[view.status]}</MostNotice>
        <p className="most-lead most-helper-lead">{view.document ? mostSummary : "Ewa udostępniła Ci wybrane czynności w tej sprawie."}</p>
        <div className="most-rows">
          {view.document && <MostRow icon={<FileText size={18} />} title="Udostępnione pismo" detail={view.document.office} onClick={() => open("document")} />}
          {scope?.comments && <MostRow icon={<MessageSquare size={18} />} title="Komentarze" detail={view.comments.length ? view.comments.length + " w tej współpracy" : undefined} onClick={() => open("comments")} />}
        </div>
        <MostDeadline at={view.deadlineAt} />
        {editable && canWork && <MostTasks session={session} />}
        {scope && <ScopeSummary scope={scope} />}
      </>
    );
    if (editable && scope && (scope.form || scope.response || scope.attachments))
      action = <button className="most-button most-primary" disabled={locked || !view.canReview} onClick={() => void act({ type: "review" })}><Send size={17} /> Przekaż do zatwierdzenia</button>;
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
