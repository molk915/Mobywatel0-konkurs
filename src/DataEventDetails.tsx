import { useState } from "react";
import { CircleAlert, MessageCircle, UsersRound } from "lucide-react";
import { accessStatus, trackerDate, trackerExactDate, trackerSource } from "./data-tracker";
import type { Access, DataFollowup } from "./domain";

const actionTitles = { explain: "Poproś o wyjaśnienie", report: "Zgłoś podejrzenie nieprawidłowości" };

export function DataEventDetails({ entry, followups, onFollowup, onHelp, onRevoke }: {
  entry: Access;
  followups: DataFollowup[];
  onFollowup: (kind: DataFollowup["kind"], note: string) => void;
  onHelp: () => void;
  onRevoke: () => void;
}) {
  const [action, setAction] = useState<DataFollowup["kind"]>();
  const [note, setNote] = useState("");
  return <div className="tracker-details">
    <span className="tracker-demo">Dane demonstracyjne</span>
    <h3>{entry.who}</h3>
    <p className="tracker-details-status">{accessStatus(entry)}</p>
    <dl className="data-list">
      <div><dt>Kiedy</dt><dd><time dateTime={entry.at}>{trackerExactDate.format(new Date(entry.at))}</time> (czas polski)</dd></div>
      <div><dt>Cel operacji</dt><dd>{entry.purpose}</dd></div>
      <div><dt>Zakres danych</dt><dd>{entry.scope}</dd></div>
      <div><dt>Źródło informacji</dt><dd>{trackerSource(entry)}</dd></div>
      {entry.basis && <div><dt>Podstawa dostępu</dt><dd>{entry.basis}</dd></div>}
      {entry.expiresAt && <div><dt>Ważność kodu</dt><dd>{trackerDate.format(new Date(entry.expiresAt))}</dd></div>}
    </dl>
    {(entry.source === "registry" || entry.source === "bank" || entry.source === "pesel") &&
      <p className="tracker-help">Tutaj zarządzasz dostępem osób zaufanych. W sprawie dostępu instytucji możesz zapisać prośbę o wyjaśnienie.</p>}
    {entry.active && entry.revocable && <button className="tracker-revoke" onClick={onRevoke}>Wycofaj zgodę</button>}
    <section className="tracker-detail-actions" aria-label="Co możesz zrobić">
      <h4>Co możesz zrobić</h4>
      {followups.map((item) => <p className="tracker-state" role="status" key={item.kind}>
        {item.kind === "explain" ? "Prośba o wyjaśnienie zapisana w pokazie." : "Zgłoszenie zapisane w pokazie."}
      </p>)}
      {(["explain", "report"] as const).filter((kind) => !followups.some((item) => item.kind === kind)).map((kind) =>
        <button className="secondary" key={kind} onClick={() => { setAction(kind); setNote(""); }}>
          {kind === "explain" ? <MessageCircle size={18} aria-hidden="true" /> : <CircleAlert size={18} aria-hidden="true" />}
          {actionTitles[kind]}
        </button>)}
      {action && <form className="tracker-followup" onSubmit={(event) => {
        event.preventDefault();
        onFollowup(action, note.trim());
        setAction(undefined);
      }}>
        <h4>{actionTitles[action]}</h4>
        <p>Formularz zapisze sprawę lokalnie w pokazie.</p>
        <label>Co chcesz wyjaśnić? <span>Opcjonalnie</span>
          <textarea value={note} maxLength={500} rows={3} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div><button className="secondary" type="button" onClick={() => setAction(undefined)}>Anuluj</button>
          <button className="primary" type="submit">{action === "explain" ? "Zapisz prośbę" : "Zapisz zgłoszenie"}</button></div>
      </form>}
      <button className="secondary" onClick={onHelp}><UsersRound size={18} aria-hidden="true" /> Poproś o pomoc</button>
    </section>
  </div>;
}
