import { useState } from "react";
import { ArrowRight, FileText, Link2, ShieldCheck, UsersRound } from "lucide-react";
import { caseMeta, type Access } from "../domain";
import { MostConnection, MostInvite, MostLayout, MostNotice, MostRow } from "./components";
import { delegationScope, delegationTitles, type DelegationContext } from "./model";
import { delegationToken, routeForMost, useMostSession } from "./session";
import { ControlCenter } from "./ControlCenter";
import type { DashboardProfile } from "./MostDashboard";

type Session = ReturnType<typeof useMostSession>;

export const caseGuides = {
  vehicle: "Sprawdź termin w dokumencie pojazdu. Wybierz stację, przygotuj dowód rejestracyjny i zapisz plan wizyty.",
  passport: "Sprawdź ważność paszportu. Zbierz informacje o zdjęciu i punkcie paszportowym. Zgodę opiekuna można przygotować w Rodzinie.",
  license: "Sprawdź ważność prawa jazdy i ustal powód wymiany. Przygotuj listę dokumentów oraz pytania do urzędu.",
  library: "Wybierz filię i sprawdź, jakie informacje będą potrzebne przy zapisie. Przygotuj pytania o odbiór karty.",
  school: "Ustal, do czego potrzebne jest zaświadczenie. Zapisz termin i przygotuj treść prośby do sekretariatu.",
  registration: "Zapisz, gdzie złożysz dokumenty. Przygotuj listę dokumentów pojazdu oraz pytania o odbiór dowodu rejestracyjnego.",
  parking: "Sprawdź strefę i wybierz pojazd, którego ma dotyczyć wniosek. Zapisz listę informacji do potwierdzenia u operatora.",
  certificate: "Ustal rodzaj odpisu i sposób odbioru. Zapisz pytania, które chcesz zadać w urzędzie stanu cywilnego.",
} as const;

export function DelegationOwner({ context, storageId, profile, onBack, onApproved, onStarted, workflowKey, letterKey, initialTab, autoStart, sameTabDemo, dashboard, trackerEvent, editAccess }: {
  context: DelegationContext; storageId: string; profile: string; onBack: () => void; onApproved?: () => void; onStarted?: () => void;
  workflowKey?: string | null; letterKey?: string | null; initialTab?: "access" | "inbox";
  autoStart?: boolean; sameTabDemo?: boolean;
  dashboard?: DashboardProfile;
  trackerEvent?: Access;
  editAccess?: { id: string; connection?: string };
}) {
  const session = useMostSession("owner", `delegation-${storageId}`, autoStart, true, context);
  if (context.kind === "trusted") return <TrustedOwner session={session} profile={profile} onBack={onBack} workflowKey={workflowKey} letterKey={letterKey} initialTab={initialTab} sameTabDemo={sameTabDemo} dashboard={dashboard} trackerEvent={trackerEvent} editAccess={editAccess} />;
  return <DelegationPanel session={session} context={context} trustedKey={profile + "-trusted"} onBack={onBack} onApproved={onApproved} onStarted={onStarted} />;
}

function TrustedOwner({ session, editAccess, ...props }: {
  session: Session; profile: string; onBack: () => void; workflowKey?: string | null; letterKey?: string | null; initialTab?: "access" | "inbox"; sameTabDemo?: boolean;
  dashboard?: DashboardProfile;
  trackerEvent?: Access;
  editAccess?: { id: string; connection?: string };
}) {
  const [peer, setPeer] = useState(editAccess?.connection);
  return peer
    ? <PeerCenter key={peer} token={peer} onPeerChange={setPeer} editAccessId={editAccess?.id} {...props} />
    : <ControlCenter session={session} role="owner" onPeerChange={setPeer} editAccessId={editAccess?.id} {...props} />;
}

function PeerCenter({ token, ...props }: {
  token: string; profile: string; onBack: () => void; onPeerChange: (value?: string) => void; workflowKey?: string | null; letterKey?: string | null; initialTab?: "access" | "inbox";
  dashboard?: DashboardProfile;
  trackerEvent?: Access;
  editAccessId?: string;
}) {
  const session = useMostSession("owner", "delegation-peer", false, true, { kind: "trusted" }, token);
  return <ControlCenter session={session} role="owner" {...props} />;
}

export function DelegationPanel({ session, context, trustedKey, onBack, nav, onApproved, onStarted }: {
  session: Session; context: DelegationContext; trustedKey?: string;
  onBack?: () => void; nav?: React.ReactNode;
  onApproved?: () => void;
  onStarted?: () => void;
}) {
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState(false);
  const [correction, setCorrection] = useState(false);
  const [feedback, setFeedback] = useState("");
  const { view, busy, connected, attempted, error, ended, act, start, retry } = session;
  const trusted = context.kind === "trusted";
  const owner = !!trustedKey;
  const invitation = view?.invitation;
  const active = invitation?.status === "active";
  const hasInvite = !!invitation?.token;
  const title = delegationTitles[context.kind];
  const guide = context.kind in caseGuides ? caseGuides[context.kind as keyof typeof caseGuides] : null;
  const steps = context.kind === "move" || context.kind === "wallet" || context.kind === "letter" ? caseMeta[context.kind].steps : undefined;
  const step = context.step === undefined ? undefined : steps?.[context.step];
  const locked = busy || !connected;
  const saved = view?.work.reason;
  const linkedToken = trustedKey && !trusted ? delegationToken(trustedKey) : null;
  const reviewId = view?.work.reviewId;
  const assignments = view?.assignments?.filter((item) => !item.legacy) ?? [];
  const canPrepare = view && !["review", "finished", "rejected"].includes(view.status) && (owner || active);
  const grant = async (viaTrusted: boolean) => {
    if (await act({ type: "invite", scope: delegationScope, step: context.step, ...(viaTrusted && linkedToken ? { trustedOwnerToken: linkedToken } : {}) }))
      onStarted?.();
  };
  return <MostLayout role={owner ? "owner" : "helper"} roleLabel={owner ? "Moje sprawy" : "Pomagam"} contextTitle={trusted ? "Osoba zaufana" : "ePełnomocnictwo · demo"}
    title={title} screen="delegation" onBack={onBack} nav={nav} busy={busy}>
    <div className="delegation-panel">
      {ended && <MostNotice tone="warning">{ended === "revoked" ? "Dostęp został zakończony." : "Zaproszenie lub dostęp wygasły."}</MostNotice>}
      {!ended && (error || attempted && !connected) && <MostConnection connected={connected} error={error} retry={retry} />}
      {step && <p className="most-lead">Następny krok w sprawie: {step}.</p>}
      {guide && <article className="most-draft"><h2>Co przygotować</h2><p>{guide}</p></article>}
      {trusted ? (
        owner ? <>
          <p className="most-lead">Połącz się z bliską osobą przez kod QR. Dostanie tylko te sprawy, które później wybierzesz.</p>
          {active && <MostNotice live tone="success">Osoba zaufana jest połączona. Możesz przekazać jej sprawę.</MostNotice>}
          {hasInvite && !active && invitation && <MostInvite invitation={invitation} generic />}
        </> : active ? <>
          <MostNotice tone="success">Zaproszenie przyjęte. Tutaj pojawią się przekazane Ci sprawy.</MostNotice>
          {assignments.length ? <ul className="delegation-assignment-list">{assignments.map((item) => (
            <li key={item.token}><a className="most-button most-secondary" href={item.workflow ? "/#workflow=" + item.token : routeForMost("helper", "app", item.token)} target="_blank" rel="noopener noreferrer">{item.title}<ArrowRight size={17} /></a></li>
          ))}</ul> : <p className="most-lead">Nie masz jeszcze przekazanych spraw.</p>}
        </> : !ended && <><p className="most-lead">Przyjmij zaproszenie, jeśli znasz osobę, od której pochodzi. Po sparowaniu zobaczysz tylko sprawy, które Ci przekaże.</p>
          <button className="most-button most-primary" disabled={locked} onClick={() => void act({ type: "join" })}>Przyjmij zaproszenie</button>
        </>
      ) : <>
        {owner && !hasInvite && view?.status !== "review" && view?.status !== "finished" && <article className="most-draft">
          <h2>Przekaż do przygotowania</h2>
          <p>Bliska osoba zobaczy nazwę i bieżący krok tej sprawy. Może przygotować propozycję. Decyzja należy do Ciebie.</p>
          <p className="most-muted">Upoważnienie działa w pokazie. Nie ustanawia pełnomocnika przed urzędem.</p>
        </article>}
        {hasInvite && !invitation?.status.match(/revoked|expired/) && (
          <MostNotice live tone={active ? "success" : "info"}>{active ? "Bliska osoba otworzyła sprawę." : "Czekamy, aż bliska osoba otworzy sprawę."}</MostNotice>
        )}
        {owner && hasInvite && invitation && view?.status !== "review" && view?.status !== "finished" && (
          <details className="delegation-link" open={!active && !linkedToken}>
            <summary>Link i kod QR do tej sprawy</summary><MostInvite invitation={invitation} generic />
          </details>
        )}
        {view?.work.feedback && <MostNotice tone="warning" live>Prośba o poprawkę: {view.work.feedback}</MostNotice>}
        {saved && !editing && <article className="most-draft"><h2>{view?.status === "finished" ? "Zatwierdzony plan" : "Przygotowana propozycja"}</h2><p>{saved}</p></article>}
        {owner && view?.previousPackage?.reason && view.previousPackage.reason !== saved &&
          <details className="delegation-link"><summary>Poprzednia wersja propozycji</summary><p>{view.previousPackage.reason}</p></details>}
        {canPrepare && (!owner || guide) && (
          <form className="most-editor" onSubmit={async (event) => {
            event.preventDefault();
            if (await act({ type: "response", reason })) { setEditing(false); if (owner) onStarted?.(); }
          }}>
            <label>{owner ? "Twój plan działania" : "Propozycja dla właściciela"}<textarea rows={4} value={editing ? reason : saved ?? ""}
              onFocus={() => { if (!editing) { setReason(saved ?? ""); setEditing(true); } }}
              onChange={(event) => { setReason(event.target.value); setEditing(true); }} maxLength={1400} /></label>
            <button className="most-button most-secondary" disabled={locked || !editing || reason.trim().length < 15}>Zapisz propozycję</button>
          </form>
        )}
        {canPrepare && view?.canReview && (!owner || guide) && !editing && <button className="most-button most-primary" disabled={locked}
          onClick={() => void act({ type: "review" })}>{owner ? "Sprawdź swój plan" : "Przekaż do zatwierdzenia"}</button>}
        {!owner && view?.status === "review" && <MostNotice live>Propozycja czeka na decyzję właściciela sprawy.</MostNotice>}
        {view?.status === "finished" && <MostNotice tone="success" live>Plan został zatwierdzony w pokazie.</MostNotice>}
        {view?.status === "rejected" && <MostNotice tone="warning" live>Propozycja została odrzucona.</MostNotice>}
        {owner && view?.status === "review" && reviewId !== undefined && <>
          {correction ? <form className="most-editor" onSubmit={async (event) => {
            event.preventDefault();
            if (await act({ type: "correction", reviewId, text: feedback })) { setCorrection(false); setFeedback(""); }
          }}><label>Co trzeba poprawić?<textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} maxLength={500} /></label>
            <button className="most-button most-primary" disabled={locked || feedback.trim().length < 5}>Przekaż uwagi</button></form>
            : <div className="delegation-actions">
              <button className="most-button most-primary" disabled={locked} onClick={async () => {
                if (await act({ type: "accept", reviewId })) onApproved?.();
              }}>Zatwierdź plan</button>
              <button className="most-button most-secondary" onClick={() => setCorrection(true)}>Poproś o poprawki</button>
              <button className="most-button most-secondary" disabled={locked} onClick={() => void act({ type: "reject", reviewId })}>Odrzuć propozycję</button>
            </div>}
        </>}
      </>}
      {owner && (!view || ended) && <button className="most-button most-primary" disabled={busy} onClick={() => void start()}>
        {trusted ? "Przygotuj zaproszenie" : guide ? "Otwórz plan sprawy" : "Przygotuj ePełnomocnictwo"} <ArrowRight size={17} />
      </button>}
      {owner && view && !hasInvite && !["review", "finished"].includes(view.status) && <div className="delegation-actions">
        {linkedToken && <button className="most-button most-primary" disabled={locked} onClick={() => void grant(true)}><UsersRound size={18} /> Przekaż osobie zaufanej</button>}
        <button className={`most-button ${linkedToken ? "most-secondary" : "most-primary"}`} disabled={locked} onClick={() => void grant(false)}><Link2 size={18} /> {trusted ? "Utwórz zaproszenie QR" : "Utwórz link i kod QR sprawy"}</button>
      </div>}
      {owner && hasInvite && <MostRow icon={<ShieldCheck size={18} />} title={trusted ? "Odłącz osobę zaufaną" : "Cofnij dostęp do sprawy"}
        detail={trusted ? "Zakończy też dostęp do spraw przekazanych przez to połączenie" : "Osoba pomagająca straci dostęp do propozycji"} onClick={() => { if (!locked) void act({ type: "revoke" }); }} />}
      {owner && !trusted && onBack && <MostRow icon={<FileText size={18} />} title="Wróć do sprawy" onClick={onBack} />}
    </div>
  </MostLayout>;
}
