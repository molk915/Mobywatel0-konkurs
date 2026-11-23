import { useEffect, useRef, useState } from "react";
import { Bell, ChevronRight } from "lucide-react";

export type InboxItem = {
  key: string; title: string; at: string; read: boolean; context?: string;
  markRead?: () => boolean | Promise<boolean>;
  open: () => void;
};
const notificationDate = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short" });

export function Inbox({ items, busy, filter = false, onOpen }: {
  items: InboxItem[];
  busy?: boolean;
  filter?: boolean;
  onOpen?: () => void;
}) {
  const [onlyNew, setOnlyNew] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const mounted = useRef(true);
  const requesting = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const unread = items.filter((item) => !item.read);
  const visible = (onlyNew ? unread : [...items]).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  async function open(item: InboxItem) {
    if (requesting.current) return;
    requesting.current = true;
    setOpening(item.key);
    setError(false);
    try {
      const read = item.read || !item.markRead || await item.markRead();
      if (!mounted.current) return;
      if (!read) {
        setError(true);
        return;
      }
      onOpen?.();
      item.open();
    } catch {
      if (mounted.current) setError(true);
    } finally {
      requesting.current = false;
      if (mounted.current) setOpening(null);
    }
  }
  return <>
    {filter && items.length > 0 && <div className="inbox-filters" role="group" aria-label="Filtr powiadomień">
      <button type="button" aria-pressed={!onlyNew} onClick={() => { setOnlyNew(false); setError(false); }}>Wszystkie</button>
      <button type="button" aria-pressed={onlyNew} onClick={() => { setOnlyNew(true); setError(false); }}>Nowe <span>{unread.length}</span></button>
    </div>}
    {error && <p className="most-notice warning" role="alert">Sprawdź połączenie i spróbuj ponownie otworzyć powiadomienie.</p>}
    {!visible.length ? <div className="inbox-empty"><Bell size={24} aria-hidden="true" />
      <p>{onlyNew ? "Nie masz nowych powiadomień." : "Brak powiadomień."}</p>
      </div>
      : <ul className="most-inbox">{visible.map((item) => (
        <li key={item.key} data-unread={!item.read}><button type="button" disabled={!!opening || (busy && !item.read)} onClick={() => void open(item)}>
          <span className="most-icon"><Bell size={17} aria-hidden="true" /></span>
          <span><strong>{item.title}</strong>
            <small>{item.context && item.context + " · "}<time dateTime={item.at}>{notificationDate.format(new Date(item.at))}</time> · {item.read ? "Przeczytane" : "Nowe"}</small>
          </span><ChevronRight size={16} aria-hidden="true" />
        </button></li>
      ))}</ul>}
  </>;
}
