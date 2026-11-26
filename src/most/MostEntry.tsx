import { ArrowRight, CalendarDays, FileText, UsersRound } from "lucide-react";
import { WavePattern } from "../CivicChrome";
import { formatMostDeadline, mostSummary, statusLabels, type MostView } from "./model";

export function MostEntry({ isEwa, view, onOpen, compact = false }: { isEwa: boolean; view?: MostView | null; onOpen: () => void; compact?: boolean }) {
  if (isEwa) return <EwaEntry view={view} onOpen={onOpen} compact={compact} />;
  return (
    <button className="most-entry most-entry-switch" onClick={onOpen}>
      <span className="most-icon"><UsersRound size={20} /></span>
      <span><strong>Wybierz profil Ewy</strong><small>W profilu demonstracyjnym Ewy możesz poprosić bliską osobę o pomoc.</small></span>
      <ArrowRight size={19} />
    </button>
  );
}

function EwaEntry({ onOpen, view, compact }: { onOpen: () => void; view?: MostView | null; compact: boolean }) {
  const status = view?.sentAt ? "Wysłano w pokazie" : view?.status === "finished"
    ? "Czeka na wysłanie" : statusLabels[view?.status ?? "new"];
  if (compact) return (
    <button className="most-entry most-entry-switch most-wallet-entry" onClick={onOpen}>
      <span className="most-icon"><FileText size={20} aria-hidden="true" /></span>
      <span>
        <strong>Pismo z urzędu</strong>
        <small>{!view || view.status === "new" ? "Możesz poprosić bliską osobę o pomoc" : status}</small>
      </span>
      <ArrowRight size={19} aria-hidden="true" />
    </button>
  );
  return (
    <button className="most-entry most-entry-feature civic-pattern-card" onClick={onOpen}>
      <WavePattern />
      <span className="most-entry-meta"><FileText size={16} /> Wspólna sprawa</span>
      <strong>Pismo z urzędu — {view?.status === "new" || !view ? "wymaga Twojej uwagi" : status}</strong>
      <small>{mostSummary}</small>
      <span className="most-entry-footer">
        <span className="most-entry-meta"><CalendarDays size={15} /> {formatMostDeadline(view?.deadlineAt)}</span>
        <ArrowRight size={19} />
      </span>
    </button>
  );
}
