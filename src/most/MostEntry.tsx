import { ArrowRight, CalendarDays, FileText, UsersRound } from "lucide-react";
import { WavePattern } from "../CivicChrome";
import { formatMostDeadline, mostSummary, statusLabels, type MostView } from "./model";

export function MostEntry({ isEwa, view, onOpen }: { isEwa: boolean; view?: MostView | null; onOpen: () => void }) {
  if (isEwa) return <EwaEntry view={view} onOpen={onOpen} />;
  return (
    <button className="most-entry most-entry-switch" onClick={onOpen}>
      <span className="most-icon"><UsersRound size={20} /></span>
      <span><strong>Wybierz profil Ewy</strong><small>W profilu demonstracyjnym Ewy możesz rozpocząć współpracę w MOST.</small></span>
      <ArrowRight size={19} />
    </button>
  );
}

function EwaEntry({ onOpen, view }: { onOpen: () => void; view?: MostView | null }) {
  const status = statusLabels[view?.status ?? "new"];
  return (
    <button className="most-entry most-entry-feature civic-pattern-card" onClick={onOpen}>
      <WavePattern />
      <span className="most-entry-meta"><FileText size={16} /> mObywatel MOST</span>
      <strong>Pismo z urzędu — {view?.status === "new" || !view ? "wymaga Twojej uwagi" : status}</strong>
      <small>{mostSummary}</small>
      <span className="most-entry-footer">
        <span className="most-entry-meta"><CalendarDays size={15} /> {formatMostDeadline(view?.deadlineAt)}</span>
        <ArrowRight size={19} />
      </span>
    </button>
  );
}
