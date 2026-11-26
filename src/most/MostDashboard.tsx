import {
  ArrowLeft, ArrowRight, CalendarDays, CarFront, ChevronDown, ClipboardCheck, FileText,
  FolderOpen, History, House, PencilLine, ShieldCheck, UserRound, UsersRound, WalletCards,
} from "lucide-react";
import { CivicBrand, CivicLinkRow } from "../CivicChrome";
import type { Profile } from "../domain";
import type { ControlCase, ControlView, Deadline } from "./control-model";
import { formatMostDeadline } from "./model";

export type DashboardProfile = {
  profile: Profile;
  onFullApp: () => void;
  onSwitchProfile?: () => void;
};

export const caseStages: Record<ControlCase["stage"], string> = {
  new: "Do zrobienia", draft: "Szkic zapisany", review: "Do zatwierdzenia", approved: "Gotowe do wysłania",
  correction: "Do poprawy", done: "Zakończona",
};

export function MostDashboardHeader({ onFullApp }: { onFullApp: () => void }) {
  return <header className="most-dashboard-header">
    <span className="civic-brand"><CivicBrand /></span>
    <button onClick={onFullApp}><ArrowLeft size={16} aria-hidden="true" /> Pełna aplikacja</button>
  </header>;
}

export function MostDashboardProfile({ dashboard }: { dashboard: DashboardProfile }) {
  if (!dashboard.onSwitchProfile) return null;
  return <button className="most-profile-change" onClick={dashboard.onSwitchProfile} aria-label="Zmień profil" title="Zmień profil w pokazie">
    <UserRound size={17} aria-hidden="true" /> Zmień profil
  </button>;
}

function caseIcon(item: ControlCase) {
  if (item.id === "fine") return CarFront;
  if (item.kind === "payment") return WalletCards;
  if (item.id === "registration") return House;
  return item.kind === "letter" ? FileText : FolderOpen;
}

function compareCases(a: ControlCase, b: ControlCase, deadlines: Map<string, Deadline>, owner: boolean, isEwa: boolean) {
  const rank = (item: ControlCase) => item.stage === "done" ? 3
    : owner && item.stage === "review" || item.stage === "correction" ? 0
      : item.stage === "review" && !owner ? 2 : 1;
  const date = (item: ControlCase) => deadlines.get(item.id)?.date ?? "9999-12-31";
  const demoPriority = isEwa && a.stage !== "done" && b.stage !== "done"
    ? Number(b.id === "registration") - Number(a.id === "registration") : 0;
  return rank(a) - rank(b) || demoPriority || date(a).localeCompare(date(b)) ||
    Number(b.kind === "letter") - Number(a.kind === "letter");
}

function daysLeft(days: number) {
  if (days < 0) return "Termin minął";
  if (days === 0) return "Termin mija dziś";
  if (days === 1) return "Został 1 dzień";
  return "Zostało " + days + " dni";
}

export function DashboardDeadline({ deadline, isLetter }: { deadline?: Deadline; isLetter: boolean }) {
  if (!deadline) return null;
  return <div className="most-dashboard-deadline">
    <CalendarDays size={22} aria-hidden="true" />
    <div>
      <strong>{isLetter ? "Termin odpowiedzi" : "Termin sprawy"} <time dateTime={deadline.date}>{formatMostDeadline(Date.parse(deadline.date + "T12:00:00Z"))}</time></strong>
      {!deadline.done && <small>{daysLeft(deadline.days)}</small>}
    </div>
  </div>;
}

export function MostDashboardCases({ view, busy, open, share, showAccess, showDates, showHistory, showInbox, showCaseInfo, showcaseEntry }: {
  view: ControlView;
  busy: boolean;
  open: (item: ControlCase) => void;
  share: (item: ControlCase) => void;
  showAccess: () => void;
  showDates: () => void;
  showHistory: () => void;
  showInbox: () => void;
  showCaseInfo: (item: ControlCase) => void;
  showcaseEntry?: ReactNode;
}) {
  const owner = view.role === "owner";
  const isEwa = view.owner === "Ewa Wiśniewska";
  const deadlines = new Map(view.deadlines.map((deadline) => [deadline.id, deadline]));
  const [first, ...otherCases] = [...view.cases].sort((a, b) => compareCases(a, b, deadlines, owner, isEwa));
  const unread = view.notifications.filter(({ read }) => !read).length;
  const people = [...new Set([
    ...view.cases.flatMap(({ people }) => people ?? []),
    ...view.deadlines.flatMap(({ helper }) => helper ? [helper] : []),
  ])];
  const firstGrant = view.grants.find(({ id }) => id === first?.grantId);
  const prepare = firstGrant?.actions.includes("prepare") ?? false;
  const canEdit = prepare && first && ["new", "draft", "correction"].includes(first.stage);
  const canShare = first && view.resources.some(({ id }) => id === first.id);
  const needsHelp = owner && canShare && !first.people?.length && !["review", "approved", "done"].includes(first.stage);
  const action = needsHelp ? { label: "Poproś o pomoc", Icon: UsersRound, run: share }
    : owner && first?.stage === "review" ? { label: "Sprawdź szkic", Icon: ClipboardCheck, run: open }
      : !owner && canEdit && first.id === "registration"
        ? { label: first.stage === "new" ? "Przygotuj zgłoszenie" : "Wróć do zgłoszenia", Icon: PencilLine, run: open }
      : !owner && canEdit && first.kind === "letter"
        ? { label: first.stage === "new" ? "Przygotuj odpowiedź" : "Wróć do szkicu", Icon: PencilLine, run: open }
        : { label: "Otwórz sprawę", Icon: ArrowRight, run: open };
  const helperMessage = first?.stage === "review" ? (isEwa ? "Szkic przekazany Ewie" : "Szkic przekazany do zatwierdzenia")
    : first?.stage === "done" ? "Sprawa zakończona" : isEwa ? "Ewa prosi Cię o pomoc" : "Pomagasz w sprawie";
  const cardDetail = owner && first?.people?.length && first.stage !== "done" ? "Pomaga " + first.people.join(", ")
    : first?.stage !== "new" ? caseStages[first?.stage ?? "new"] : first?.paymentAmount;
  const caseRows = (items: ControlCase[]) => <ul className="most-dashboard-list">
    {items.map((item) => <li key={item.id}>
      <CivicLinkRow icon={caseIcon(item)} title={item.title}
        detail={[caseStages[item.stage], item.paymentAmount].filter(Boolean).join(" · ")}
        disabled={!owner && busy} onClick={() => owner ? showCaseInfo(item) : open(item)} />
    </li>)}
  </ul>;

  return <>
    <section className="most-dashboard-cases" aria-label={owner ? "Moje sprawy w MOST" : "Sprawy udostępnione w MOST"}>
      {first ? <>
        <article key={first.id} className="most-priority" data-role={view.role}>
          {!owner && <p className="most-priority-request"><UsersRound size={22} aria-hidden="true" /> {helperMessage}</p>}
          <div className="most-priority-body">
            <div className="most-priority-type">
              {first.id === "registration" ? <House size={23} aria-hidden="true" /> : <FileText size={23} aria-hidden="true" />}
              <span>{first.kind === "letter" ? "Pismo z urzędu" : first.kind === "payment" ? "Płatność" : "Sprawa urzędowa"}</span>
            </div>
            <h2>{first.title}</h2>
            {cardDetail && <p className="most-priority-detail">{cardDetail}</p>}
            {!owner && !isEwa && <p className="most-priority-detail">{view.owner}</p>}
            <DashboardDeadline deadline={deadlines.get(first.id)} isLetter={first.kind === "letter"} />
            <button className="most-dashboard-primary" disabled={busy && (!owner || needsHelp)} onClick={() => action.run(first)}>
              <action.Icon size={22} aria-hidden="true" /> {action.label}
            </button>
          </div>
        </article>
        {showcaseEntry}
        {otherCases.length > 0 && <div className="most-dashboard-others">
          <h2>{owner ? "Pozostałe sprawy" : isEwa ? "Inne sprawy od Ewy" : "Inne udostępnione sprawy"}</h2>
          {caseRows(owner ? otherCases.slice(0, 2) : otherCases)}
          {owner && otherCases.length > 2 && <details className="most-dashboard-more">
            <summary>Pokaż kolejne sprawy <ChevronDown size={18} aria-hidden="true" /></summary>
            {caseRows(otherCases.slice(2))}
          </details>}
        </div>}
      </> : <div className="most-dashboard-state">
        <h2>{owner ? "Brak spraw w MOST" : "Brak udostępnionych spraw"}</h2>
        <p>{owner ? "Gdy pojawi się sprawa, zobaczysz tu jej termin i następny krok."
          : "Zobaczysz tu sprawy, do których bliska osoba przyzna Ci dostęp."}</p>
      </div>}
    </section>
    <section className="most-dashboard-tools" aria-label="Dostęp, terminy i historia">
      {owner && <CivicLinkRow icon={ShieldCheck} title="Kto ma dostęp"
        detail={people.length ? people.join(", ") : "Nie udostępniasz żadnych spraw"} onClick={showAccess} />}
      <div className="most-dashboard-shortcuts">
        <button onClick={showDates}><CalendarDays size={19} aria-hidden="true" /> Terminy</button>
        {owner && <button onClick={showHistory}><History size={19} aria-hidden="true" /> Historia</button>}
        {!owner && <button onClick={showAccess}><ShieldCheck size={19} aria-hidden="true" /> Mój dostęp</button>}
        {unread > 0 && <button onClick={showInbox}>Powiadomienia ({unread})</button>}
      </div>
    </section>
  </>;
}
import type { ReactNode } from "react";
