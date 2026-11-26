import { useState, type ReactNode } from "react";
import { ArrowRight, Building2, Check, ChevronDown, ChevronRight, Fingerprint, HeartPulse, History, Landmark, LockKeyhole, ScanLine, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, UsersRound } from "lucide-react";
import { CivicLinkRow } from "./CivicChrome";
import { accessStatus, trackerDate } from "./data-tracker";
import type { Access, CitizenState, Profile } from "./domain";
import type { SharedAccess } from "./most/control-model";
import { TrackerSheet } from "./TrackerSheet";

export type TrackerPermission = {
  id: string;
  title: string;
  recipient: string;
  personId: string;
  expires: number;
  lastUsed?: string;
  scope: string[];
  status: SharedAccess["status"] | "waiting";
  edit?: () => void;
  revoke?: () => Promise<boolean>;
};

const permissionStatus: Record<TrackerPermission["status"], string> = {
  active: "Aktywny", waiting: "Czeka na przyjęcie", revoked: "Cofnięty", expired: "Wygasł", completed: "Zakończony",
};
const filters = { all: "Wszystkie rodzaje", registry: "Rejestry publiczne", bank: "Weryfikacja przez bank", pesel: "Zastrzeżenie PESEL", share: "Udostępnienia", most: "Dostęp w MOST" } as const;
type Filter = keyof typeof filters;
const filterOptions = Object.entries(filters);
const dayInPoland = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" });
const dayLabel = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeZone: "Europe/Warsaw" });
const clock = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });
const plurals = new Intl.PluralRules("pl");
const restrictions = { filter: "all" as Filter, actor: "", date: "" };
const operationIcons = { registry: Building2, bank: Landmark, pesel: Fingerprint, share: ScanLine, most: UsersRound, shop: ShoppingBag, health: HeartPulse };
const shorter: Record<string, string> = {
  "tracker-demo-residence": "Sprawdzono adres zameldowania",
  "tracker-demo-identity": "Zweryfikowano dane",
  "tracker-demo-bank": "Sprawdzono status zastrzeżenia PESEL",
  "tracker-demo-bank-identity": "Potwierdzono tożsamość",
  "tracker-demo-most": "Otwarto udostępnione pismo",
};
const countText = (count: number, forms: Record<string, string>) => count + " " + (forms[plurals.select(count)] ?? forms.other);
const operationCount = (count: number) => countText(count, { one: "operacja", few: "operacje", other: "operacji" });
const actorName = (who: string) => who.replace(/ · (przykład|demo)$/, "");

function eventRow(entry: Access, open: (entry: Access) => void, includeDate = false) {
  const kind = entry.who.startsWith("Żabka") ? "shop" : entry.who.startsWith("Przychodnia") ? "health" : entry.source ?? "share";
  const Icon = operationIcons[kind];
  return <li key={entry.id}><button className="tracker-event" onClick={() => open(entry)}>
    <span className="tracker-icon" data-kind={kind}><Icon size={21} aria-hidden="true" /></span>
    <span className="tracker-event-copy">
      <strong>{actorName(entry.who)}</strong>
      <span>{shorter[entry.id] ?? entry.purpose}</span>
      {entry.revocable && <span>{accessStatus(entry)}</span>}
      {includeDate && <span>{dayLabel.format(new Date(entry.at))}</span>}
    </span>
    <time dateTime={entry.at}>{clock.format(new Date(entry.at))}</time>
    <ChevronRight size={15} aria-hidden="true" />
  </button></li>;
}

export function PrivacyHub({ p, c, events, tab, onTab, onShare, onAccess, onProtect, onTrusted, permissions, onRevokePerson, loading, error, collaboration }: {
  p: Profile;
  c: CitizenState;
  events: Access[];
  tab: "history" | "most";
  onTab: (tab: "history" | "most") => void;
  onShare: (scope: "adult" | "identity") => void;
  onAccess: (entry: Access) => void;
  onProtect: () => void;
  onTrusted: () => void;
  permissions: TrackerPermission[];
  onRevokePerson: (personId: string) => Promise<boolean>;
  loading: boolean;
  error?: string;
  collaboration?: ReactNode;
}) {
  const [{ filter, actor, date }, setFilters] = useState(restrictions);
  const [draft, setDraft] = useState<typeof restrictions>();
  const [invalidDate, setInvalidDate] = useState(false);
  const [scope, setScope] = useState<"adult" | "identity">("adult");
  const [pending, setPending] = useState<string>();
  const [result, setResult] = useState<{ text: string; error?: boolean }>();
  const [confirmation, setConfirmation] = useState<{ id: string; title: string; action: () => Promise<boolean>; person?: boolean }>();
  const institutions = [...new Set(events.map(({ who }) => actorName(who)))].sort((a, b) => a.localeCompare(b, "pl"));
  const sortedEvents = [...events].sort((first, second) => Date.parse(second.at) - Date.parse(first.at));
  const history = sortedEvents.filter((entry) =>
    (filter === "all" || (entry.source ?? (entry.expiresAt ? "share" : undefined)) === filter) &&
    (!actor || actorName(entry.who) === actor) && (!date || dayInPoland.format(new Date(entry.at)).split("-").reverse().join(".") === date));
  const days = new Map<string, Access[]>();
  for (const entry of history) {
    const day = dayInPoland.format(new Date(entry.at));
    const entries = days.get(day) ?? [];
    entries.push(entry);
    days.set(day, entries);
  }
  const now = Date.now();
  const recent = sortedEvents.filter(({ at }) => Date.parse(at) <= now && Date.parse(at) >= now - 30 * 86_400_000);
  const recentPeople = new Set(recent.map(({ who }) => actorName(who))).size;
  const filterCount = Number(filter !== "all") + Number(!!actor) + Number(!!date);
  const active = permissions.filter(({ status }) => status === "active" || status === "waiting");
  const inactive = permissions.filter(({ status }) => status !== "active" && status !== "waiting");
  const people = Array.from(new Map(active.map(({ personId, recipient }) => [personId, recipient])));

  async function revoke(id: string, action: () => Promise<boolean>, success: string) {
    if (pending) return;
    setResult(undefined);
    setPending(id);
    const failure = "Nie udało się potwierdzić cofnięcia dostępu. Sprawdź bieżący stan i spróbuj ponownie.";
    try {
      if (await action()) {
        setConfirmation(undefined);
        setResult({ text: success });
      } else {
        setResult({ text: failure, error: true });
      }
    } catch {
      setResult({ text: failure, error: true });
    } finally {
      setPending(undefined);
    }
  }

  function permissionCard(permission: TrackerPermission) {
    return <article className="tracker-permission" key={permission.id}>
      <div className="tracker-permission-heading">
        <div><h4>{permission.title}</h4></div>
        <span className="tracker-tag" data-status={permission.status}>{permissionStatus[permission.status]}</span>
      </div>
      <ul aria-label="Zakres dostępu">{permission.scope.map((operation) => <li key={operation}>{operation}</li>)}</ul>
      <p className="tracker-expiry"><time dateTime={new Date(permission.expires).toISOString()}>
        {permission.revoke ? "Dostęp najpóźniej do " : "Pierwotny termin "}{trackerDate.format(permission.expires)}
      </time></p>
      <p className="tracker-expiry">Ostatnie użycie {permission.lastUsed ? <time dateTime={permission.lastUsed}>{trackerDate.format(new Date(permission.lastUsed))}</time> : "· brak zapisu"}</p>
      <div className="tracker-permission-actions">
      {permission.edit && <button className="secondary" disabled={!!pending} onClick={permission.edit}>Zmień zakres i termin</button>}
      {permission.revoke && <button className="tracker-revoke" disabled={!!pending}
        onClick={() => permission.revoke && setConfirmation({ id: permission.id, title: permission.title, action: permission.revoke })}
        aria-label={"Cofnij dostęp do " + permission.title + " · " + permission.recipient}>
        <LockKeyhole size={17} aria-hidden="true" /> {pending === permission.id ? "Cofamy dostęp…" : "Cofnij dostęp"}
      </button>}
      </div>
    </article>;
  }

  return <section className="privacy-workspace data-tracker" aria-label="Moje dane">
    <header className="tracker-heading">
      <span className="tracker-icon"><ShieldCheck size={25} aria-hidden="true" /></span>
      <h1>Moje dane</h1>
      <p>Sprawdź, kto korzystał z Twoich danych.</p>
    </header>
    <div className="tracker-segments" role="group" aria-label="Widok Moich danych">
      <button aria-pressed={tab === "history"} onClick={() => onTab("history")}><History size={19} aria-hidden="true" /> Historia dostępu</button>
      <button aria-pressed={tab === "most"} onClick={() => onTab("most")}><UsersRound size={19} aria-hidden="true" /> MOST</button>
    </div>
    {tab === "history" ? <div className="tracker-view" key="history">
      <section className="tracker-recent" aria-label="Ostatnie 30 dni">
        <div><History size={17} aria-hidden="true" /><h2>Ostatnie 30 dni</h2></div>
        <p><strong>{recent.length}</strong><span>Zapisane operacje</span></p>
        <p><strong>{recentPeople}</strong><span>Podmioty i osoby</span></p>
      </section>
      <section aria-label="Historia operacji">
        <div className="tracker-section-heading">
          <h2>Historia operacji</h2>
          <button className="tracker-filter-trigger" aria-haspopup="dialog" onClick={() => { setDraft({ filter, actor, date }); setInvalidDate(false); }}>
            <SlidersHorizontal size={17} aria-hidden="true" /> Filtruj{filterCount > 0 && <span>{filterCount}</span>}
          </button>
        </div>
        <p className="tracker-history-note">Dane demonstracyjne i działania w prototypie</p>
        {filterCount > 0 && <div className="tracker-filter-summary"><span>{operationCount(history.length)} po filtrowaniu</span>
          <button onClick={() => setFilters(restrictions)}>Wyczyść filtry</button>
        </div>}
        {draft && <TrackerSheet title="Filtruj historię" close={() => setDraft(undefined)}>
          <form className="tracker-filters" onSubmit={(event) => {
            event.preventDefault();
            const value = draft.date.trim();
            const iso = value.split(".").reverse().join("-");
            const time = new Date(iso + "T12:00:00Z");
            if (value && (!/^\d{2}\.\d{2}\.\d{4}$/.test(value) || !Number.isFinite(time.getTime()) || dayInPoland.format(time) !== iso)) {
              setInvalidDate(true);
              return;
            }
            setFilters({ ...draft, date: value });
            setDraft(undefined);
          }}>
          <label>Rodzaj operacji<select value={draft.filter} onChange={(event) => setDraft({ ...draft, filter: event.target.value as Filter })}>
            {filterOptions.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select></label>
          <label>Podmiot<select value={draft.actor} onChange={(event) => setDraft({ ...draft, actor: event.target.value })}>
            <option value="">Wszystkie</option>
            {institutions.map((name) => <option key={name}>{name}</option>)}
          </select></label>
          <label>Data operacji<input placeholder="dd.mm.rrrr" maxLength={10} value={draft.date} aria-invalid={invalidDate}
            inputMode="numeric" onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
              setDraft({ ...draft, date: [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join(".") });
              setInvalidDate(false);
            }} /></label>
          {invalidDate && <p className="tracker-state tracker-error" role="alert">Podaj poprawną datę, na przykład 24.11.2026.</p>}
          <button className="primary" type="submit">Pokaż wyniki</button>
          {(draft.filter !== "all" || draft.actor || draft.date) && <button className="secondary" type="button"
            onClick={() => { setDraft(restrictions); setInvalidDate(false); }}>Wyczyść filtry</button>}
          </form>
        </TrackerSheet>}
        <div className="access-timeline">{Array.from(days, ([day, entries]) => <div className="tracker-day" key={day}>
          <h3><time dateTime={day}>{dayLabel.format(new Date(day + "T12:00:00Z"))}</time></h3>
          <ul className="tracker-timeline">{entries.map((entry) => eventRow(entry, onAccess))}</ul>
        </div>)}</div>
        {!history.length && <p role="status" className="tracker-state">Brak operacji pasujących do filtrów.</p>}
      </section>

      <section className="privacy-scope-card">
        <header><h2>Udostępnij minimum</h2><small>mDowód · demo</small></header>
        <div className="privacy-choice" aria-label="Zakres danych">
          <button aria-pressed={scope === "adult"} onClick={() => setScope("adult")}>Pełnoletność</button>
          <button aria-pressed={scope === "identity"} onClick={() => setScope("identity")}>Imię i nazwisko</button>
        </div>
        <div className="privacy-preview">
          <ShieldCheck size={25} aria-hidden="true" />
          <span><small>Zakres dla odbiorcy</small><strong>{scope === "adult" ? "Tak, mam ukończone 18 lat" : p.name}</strong></span>
        </div>
        <button className="primary" onClick={() => onShare(scope)}>Udostępnij wybrane dane <ArrowRight size={17} aria-hidden="true" /></button>
      </section>
      {collaboration}
      <CivicLinkRow icon={LockKeyhole} title="Ochrona PESEL" detail={c.protected ? "Włączona w symulacji" : "Sprawdź możliwości ochrony"} onClick={onProtect} />
      <details className="privacy-ai-note">
        <summary><Sparkles size={18} aria-hidden="true" /> Z jakich danych korzysta asystent?</summary>
        <p>Imię z profilu demo, status ochrony, bieżący ekran i etap otwartej sprawy. Domyślny tryb przetwarza rozmowę na urządzeniu.</p>
      </details>
    </div> : <div className="tracker-view" key="most">
      <section aria-label="Kto ma dostęp w MOST">
        <div className="tracker-section-heading"><h2>Kto ma dostęp w MOST</h2></div>
        <p className="tracker-help">Cofnięcie dostępu działa od razu. Wcześniejsze działania zostają w historii.</p>
        {result && <p className={"tracker-state " + (result.error ? "tracker-error" : "tracker-success")} role={result.error ? "alert" : "status"}>
          {!result.error && <Check size={18} aria-hidden="true" />} {result.text}
        </p>}
        {error && <p className="tracker-state tracker-error" role="alert">{error}</p>}
        {loading && !error && <p className="tracker-state" role="status">Wczytujemy uprawnienia MOST…</p>}
        {!loading && !error && !active.length && <p className="tracker-state" role="status">Brak aktywnego dostępu w MOST.</p>}
        {people.map(([id, name]) => {
          const grants = active.filter((permission) => permission.personId === id);
          const portrait = id === "kacper" || id === "ewa" || id === "aleksandra";
          const activity = sortedEvents.filter((entry) => entry.source === "most" && entry.who === name && !entry.id.startsWith("tracker-demo-"));
          return <section className="tracker-person" key={id} aria-label={"Dostęp osoby " + name}>
            <details>
              <summary className="tracker-profile">
                <span className="tracker-avatar">{portrait ? <img src={"/portraits/" + id + ".png"} alt="" /> : name.split(" ").slice(0, 2).map((word) => word[0]).join("")}</span>
                <span><strong>{name}</strong><small>{countText(grants.length, { one: "przyznany dostęp", few: "przyznane dostępy", other: "przyznanych dostępów" })}</small></span>
                <ChevronDown size={19} aria-hidden="true" />
              </summary>
              <div className="tracker-person-body">
                <div className="tracker-permissions">{grants.map(permissionCard)}</div>
                <details className="tracker-person-history">
                  <summary>Ostatnia aktywność</summary>
                  {activity.length ? <ul className="tracker-timeline">{activity.slice(0, 5).map((entry) => eventRow(entry, onAccess, true))}</ul>
                    : <p className="tracker-help">Brak zapisanych działań tej osoby.</p>}
                </details>
                <button className="tracker-revoke" disabled={!!pending} onClick={() =>
                  setConfirmation({ id, title: name, action: () => onRevokePerson(id), person: true })}>Cofnij cały dostęp tej osoby</button>
              </div>
            </details>
          </section>;
        })}
        {confirmation && <TrackerSheet title={confirmation.person ? "Cofnij cały dostęp" : "Cofnij dostęp"} busy={!!pending} close={() => setConfirmation(undefined)}>
          <div className="tracker-confirm-body">
            <strong>{confirmation.title}</strong>
            <p>{confirmation.person ? "Ta osoba utraci wszystkie przyznane jej uprawnienia w MOST." : "Osoba zaufana utraci dostęp do tej pozycji."} Wcześniejsze działania zostaną w historii.</p>
            {result?.error && <p className="tracker-state tracker-error" role="alert">{result.text}</p>}
            <button className="primary" disabled={!!pending} onClick={() => void revoke(confirmation.id, confirmation.action,
              confirmation.person ? "Cofnięto wszystkie uprawnienia osoby „" + confirmation.title + "”." : "Cofnięto dostęp do „" + confirmation.title + "”.")}>
              {pending ? "Cofamy dostęp…" : confirmation.person ? "Potwierdź cofnięcie wszystkich" : "Potwierdź cofnięcie dostępu"}
            </button>
            <button className="secondary" disabled={!!pending} onClick={() => setConfirmation(undefined)}>Anuluj</button>
          </div>
        </TrackerSheet>}
        {inactive.length > 0 && <details className="tracker-past-permissions">
          <summary>Zakończone dostępy ({inactive.length})</summary>
          <div className="tracker-permissions">{inactive.map(permissionCard)}</div>
        </details>}
      </section>
      <CivicLinkRow icon={UsersRound} title="Osoba zaufana" detail="Udziel dostępu lub zmień jego zakres i termin" onClick={onTrusted} />
    </div>}
  </section>;
}
