import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronRight, ClipboardList, FileText, FlaskConical, HeartPulse, History, Pill, ShieldCheck, Sparkles } from "lucide-react";
import { Inbox } from "../Inbox";
import { MostLayout, MostNotice, MostRow } from "../most/components";
import { checklistItems, healthCaption, healthDate, type HealthCase, type HealthRecord, type HealthSection, type HealthTarget, type HealthView, type HealthVisit, type VisitPlan } from "./model";
import { healthInbox, wellnessLink, type WellnessSession } from "./session";

const catalog = [
  ["timeline", "Historia leczenia", History],
  ["prescriptions", "Recepty", Pill],
  ["referrals", "Skierowania", ClipboardList],
  ["results", "Wyniki badań", FlaskConical],
  ["visits", "Wizyty", CalendarDays],
  ["access", "Upoważnienia", ShieldCheck],
] as const;
const heading: Partial<Record<HealthSection, string>> = {
  home: "Twoje zdrowie", assistant: "Przygotowanie do wizyty", invite: "Poproś o pomoc", share: "Udostępnij dokument",
  plan: "Zorganizuj wizytę", review: "Sprawdź przygotowaną wizytę", inbox: "Powiadomienia",
};
const kindLabels = { visit: "Wizyta", consultation: "Konsultacja", hospital: "Hospitalizacja", test: "Badanie", procedure: "Zabieg", prescription: "Recepta" };
const prescriptionState = { active: "Aktywna", filled: "Zrealizowana", archived: "Archiwalna" };
const active = (status: string) => status === "active" || status === "waiting";
const hrefForDocument = (record: HealthRecord) => "data:text/plain;charset=utf-8," +
  encodeURIComponent([record.title, healthDate(record.date), record.place, record.document].join("\n"));
const empty = (message: string) => <p className="most-lead">{message}</p>;
const row = (title: string, detail: string, onClick: () => void) =>
  <MostRow icon={<FileText size={17} />} title={title} detail={detail} onClick={onClick} />;

export default function HealthWorkspace({ session, target, navigate, close, helper = false, identity, nav, onInbox, unreadCount }: {
  session: WellnessSession; target: HealthTarget; navigate: (target: HealthTarget) => void; close: () => void; helper?: boolean;
  identity?: { id: string; first: string }; nav?: ReactNode; onInbox?: () => void; unreadCount?: number;
}) {
  const { view, busy, online, error, ended } = session;
  const { section, id } = target;
  const owner = view?.role === "owner";
  const item = view?.cases.find(({ referral }) => referral.id === id);
  const grant = view?.grants.find((access) => access.referralId === id && active(access.status));
  const open = (next: HealthSection, id?: string) => navigate({ section: next, id });
  const title = view?.sharedRecord ? "Udostępniony wynik" : view?.sharedVisit ? "Udostępniona wizyta" : heading[section] ?? catalog.find(([key]) => section === key)?.[1] ?? "Zdrowie";
  const locked = !online || busy;
  const inbox = healthInbox(session, navigate);
  const [footerHost, setFooterHost] = useState<HTMLDivElement | null>(null);
  const showPlan = section === "plan" && !!item && (owner ? !grant?.prepare && !["review", "confirmed"].includes(item.status)
    : grant?.prepare && ["preparing", "correction"].includes(item.status));
  const showReview = section === "review" && owner && item?.status === "review" && item.plan && item.reviewId !== undefined;
  const back = section === "share" && target.origin ? () => open(target.origin!, id)
    : section === "home" || (helper && ["referrals", "results", "visits"].includes(section)) ? close
    : section === "inbox" ? () => open(owner ? "home" : "referrals")
    : ["plan", "review", "invite", "assistant"].includes(section) ? () => open(id ? "referrals" : "home", id)
    : id && owner ? () => open(section) : owner ? () => open("home") : undefined;
  let content;
  if (!view) {
    content = <div className="health-panel">
      <p role="status">{ended || error || (!session.hasToken && !busy ? "Otwórz link zaproszenia, aby zobaczyć udostępnione dane." : "Wczytujemy dane…")}</p>
      {(ended || error) && !helper && <button className="most-button most-secondary" disabled={busy} onClick={() => void session.start()}>Rozpocznij nową sesję</button>}
      {session.hasToken && !ended && !online && <p className="most-muted">Ponawiamy połączenie z serwerem.</p>}
    </div>;
  } else if (section === "inbox") {
    content = <Inbox items={inbox} busy={busy} />;
  } else if (helper && view.sharedRecord) {
    content = <RecordDetail item={view.sharedRecord} />;
  } else if (helper && view.sharedVisit) {
    content = <VisitDetail visit={view.sharedVisit} />;
  } else if (section === "home" && owner) {
    const next = view.upcoming?.filter((visit) => Date.parse(visit.time) >= Date.now()).sort((a, b) => a.time.localeCompare(b.time))[0];
    const priority = view.cases.find(({ status }) => status === "review") ?? view.cases.find(({ status }) => status === "new");
    const latest = (kind: "test" | "prescription") => view.records?.filter((record) =>
      record.kind === kind && (kind !== "prescription" || record.state === "active")).sort((a, b) => b.date.localeCompare(a.date))[0];
    const result = latest("test");
    const prescription = latest("prescription");
    const highlighted = new Set([priority?.referral.id, result?.id, prescription?.id].filter(Boolean));
    const recent = inbox.filter((entry) => {
      const source = view.notifications.find(({ id }) => entry.key === "health-" + id);
      return !highlighted.has(source?.target.id);
    });
    content = <>
      <article className="health-panel health-feature">
        <HeartPulse size={24} />
        <h2>{priority ? healthCaption[priority.status] : next ? "Najbliższa wizyta" : "Twoje dokumenty i wizyty"}</h2>
        {priority ? row(priority.referral.title, priority.status === "review" ? "Sprawdź plan wizyty" : "Otwórz skierowanie",
          () => open(priority.status === "review" ? "review" : "referrals", priority.referral.id))
          : next ? row(next.title, healthDate(next.time, true), () => open("visits", next.id))
          : <p>Przeglądaj historię leczenia, dokumenty i nadchodzące wizyty.</p>}
      </article>
      <section className="health-directory" aria-labelledby="health-directory-heading">
        <h2 id="health-directory-heading">Dokumentacja i wizyty</h2>
        <div className="health-grid" aria-label="Usługi zdrowotne">
          {catalog.map(([key, label, Icon]) => <button key={key} onClick={() => open(key)}><Icon size={22} /><span>{label}</span><ChevronRight size={15} /></button>)}
        </div>
      </section>
      {priority && next && <section className="health-panel"><h2>Najbliższa wizyta</h2>
        {row(next.title, healthDate(next.time, true), () => open("visits", next.id))}
      </section>}
      {(result || prescription) && <section className="health-panel">
        <h2>Dokumenty do sprawdzenia</h2>
        {result && row(result.title, "Ostatni wynik · " + healthDate(result.date), () => open("results", result.id))}
        {prescription && row(prescription.title, "Aktywna recepta · " + healthDate(prescription.date), () => open("prescriptions", prescription.id))}
      </section>}
      {recent.length > 0 && <section className="health-panel">
        <h2>Ostatnie zdarzenia</h2>
        {recent.slice(0, 2).map((entry) => <div key={entry.key}>{row(entry.title, healthDate(entry.at), () => void entry.open())}</div>)}
      </section>}
      <button className="most-button most-secondary" onClick={() => open("assistant")}><Sparkles size={17} /> Przygotuj się do wizyty</button>
    </>;
  } else if (section === "referrals" || (!owner && section === "home")) {
    const current = item ?? (!owner ? view.cases[0] : undefined);
    if (current) {
      const referral = current.referral;
      const access = view.grants.find((grant) => grant.referralId === referral.id && active(grant.status));
      const canPlan = owner ? !access?.prepare && !["review", "confirmed"].includes(current.status)
        : !!access?.prepare && ["preparing", "correction"].includes(current.status);
      content = <>
        <article className="health-panel">
          <h2>{referral.title}</h2>
          <MostNotice live>{!owner && current.status === "review" ? "Czeka na decyzję Ewy"
            : !owner && current.status === "preparing" ? "Przygotuj plan wizyty" : healthCaption[current.status]}</MostNotice>
          <dl className="most-package">
            <dt>Data wystawienia</dt><dd>{healthDate(referral.date)}</dd>
            <dt>Termin zadania</dt><dd>{healthDate(referral.deadline)}</dd>
            {referral.place && <><dt>Placówka kierująca</dt><dd>{referral.place}</dd></>}
          </dl>
          {referral.detail && <p>{referral.detail}</p>}
          {current.feedback && <p><strong>Uwaga Ewy</strong> {current.feedback}</p>}
          {owner && canPlan && !access && view.profile === "ewa" && <p>Możesz zorganizować wizytę samodzielnie lub poprosić bliską osobę o pomoc.</p>}
        </article>
        {access && <article className="health-panel">
          <h2>{owner ? "Kacper ma dostęp do tego skierowania" : "Pomagasz Ewie"}</h2>
          <p>Dostęp do {healthDate(access.expires, true)}. {access.prepare ? "Obejmuje przygotowanie planu wizyty." : "Obejmuje odczyt danych skierowania."}</p>
          {owner && <button className="most-button most-secondary" onClick={() => open("access")}>Sprawdź upoważnienia i link</button>}
        </article>}
        {owner && current.status === "review" && <button className="most-button most-primary" onClick={() => open("review", referral.id)}>Sprawdź przygotowaną wizytę</button>}
        {canPlan && <button className="most-button most-primary" onClick={() => open("plan", referral.id)}>{owner ? "Zorganizuj wizytę" : "Przygotuj wizytę"}</button>}
        {owner && view.profile === "ewa" && !access && !["review", "confirmed"].includes(current.status) &&
          <button className="most-button most-secondary" onClick={() => open("invite", referral.id)}>Poproś o pomoc</button>}
        {owner && current.status === "confirmed" && <button className="most-button most-primary" onClick={() => open("visits", "visit-" + referral.id)}>Otwórz wizytę w terminarzu</button>}
        {!owner && current.appointment && <article className="health-panel">
          <h2>Zatwierdzony termin</h2><p>{current.appointment.place} · {healthDate(current.appointment.time, true)}</p>
          <h3>Lista przygotowań</h3><Checklist items={current.plan?.checklist ?? []} />
        </article>}
        {owner && current.status !== "confirmed" && <div className="health-panel">
          {current.reminderAt && <p role="status">Przypomnienie ustawione na {healthDate(current.reminderAt, true)}.</p>}
          <button className="most-button most-secondary" disabled={locked} onClick={() => void session.act({ type: "remind", id: referral.id, enabled: !current.reminderAt })}>
            {current.reminderAt ? "Wyłącz przypomnienie" : "Przypomnij jutro"}
          </button>
        </div>}
        {owner && <button className="most-button most-secondary" onClick={() => open("assistant", referral.id)}><Sparkles size={17} /> Pomoc w przygotowaniu do wizyty</button>}
      </>;
    } else if (id) content = empty("To skierowanie jest już niedostępne w tej sesji.");
    else content = <ReferralList cases={view.cases} open={(id) => open("referrals", id)} />;
  } else if (section === "invite" && owner && item) {
    content = <Invite key={item.referral.id} locked={locked} onSubmit={async (minutes, details, prepare) => {
      if (await session.act({ type: "invite", id: item.referral.id, minutes, details, prepare })) open("access");
    }} />;
  } else if (section === "share" && owner && target.origin && id) {
    const resource = { section: target.origin, id };
    const existing = view.grants.find((access) => access.resource?.section === resource.section && access.resource.id === id && active(access.status));
    const document = resource.section === "results" ? view.records?.find((record) => record.kind === "test" && record.id === id) : view.upcoming?.find((visit) => visit.id === id);
    content = existing ? row("Zarządzaj dostępem", "Ten dokument jest już udostępniony", () => open("access"))
      : document ? <ShareForm title={document.title} locked={locked} onSubmit={async (minutes) => {
        if (await session.act({ type: "share", resource, minutes })) open("access");
      }} /> : empty("Dokument jest niedostępny.");
  } else if (showPlan && item) {
    content = <PlanEditor key={item.referral.id} item={item} view={view} locked={locked} footer={footerHost} onSave={async (plan, final) => {
      const type = owner ? "book" : final ? "submit" : "save";
      if (await session.act({ type, id: item.referral.id, plan }) && (owner || final))
        open(owner ? "visits" : "referrals", owner ? "visit-" + item.referral.id : item.referral.id);
    }} />;
  } else if (section === "plan" && item) {
    content = row("Otwórz aktualną sprawę", healthCaption[item.status], () => open("referrals", item.referral.id));
  } else if (section === "review" && owner && item) {
    content = item.status === "review" && item.plan && item.reviewId !== undefined
      ? <Review key={item.reviewId} item={item} slot={view.slots.find(({ id }) => id === item.plan?.slot)} locked={locked} canCorrect={!!grant} footer={footerHost} onDecision={async (type, feedback) => {
        if (await session.act({ type, id: item.referral.id, reviewId: item.reviewId!, feedback }))
          open(type === "approve" ? "visits" : "referrals", type === "approve" ? "visit-" + item.referral.id : item.referral.id);
      }} /> : <>{empty("Ten plan nie czeka już na decyzję.")}{row("Otwórz aktualną sprawę", healthCaption[item.status], () => open("referrals", item.referral.id))}</>;
  } else if (section === "access" && owner) {
    content = <>
      {view.grants.length === 0 && empty("Brak upoważnień. Wybierz skierowanie, wynik lub zaplanowaną wizytę.")}
      {[...view.grants].reverse().map((access) => <article className="health-panel" key={access.id}>
        <h2>Kacper Zieliński</h2>
        <p>{access.title ?? view.cases.find(({ referral }) => referral.id === access.referralId)?.referral.title}</p>
        <p>{access.resource ? "Odczyt jednego dokumentu" : access.details ? "Szczegóły skierowania" : "Podstawowe dane skierowania"}{access.prepare && " · przygotowanie wizyty"}</p>
        <p>{access.status === "revoked" ? "Dostęp cofnięty" : access.status === "expired" ? "Dostęp wygasł" : access.status === "waiting" ? "Czeka na otwarcie linku" : "Dostęp aktywny"} · do {healthDate(access.expires, true)}</p>
        {access.token && <>
          <a className="most-inline" href={wellnessLink(access.token)} target="_blank" rel="noreferrer">{access.resource ? "Otwórz link dla Kacpra" : "Otwórz zadanie Kacpra"}</a>
          <CopyInvite link={wellnessLink(access.token)} />
          <button className="most-button most-secondary" disabled={locked} onClick={() => void session.act({ type: "revoke", grant: access.id })}>Cofnij dostęp</button>
        </>}
      </article>)}
      {view.history.length > 0 && <section className="health-panel"><h2>Historia działań</h2><ol className="health-history">
        {[...view.history].reverse().map((entry) => <li key={entry.id}><strong>{entry.label}</strong><small>{entry.actor} · {healthDate(entry.at, true)}</small>{entry.detail && <p>{entry.detail}</p>}</li>)}
      </ol></section>}
    </>;
  } else if (section === "assistant" && owner) {
    content = <>
      <article className="health-panel"><h2>Co przygotować</h2><p>{item ? "Przygotowania do sprawy „" + item.referral.title + "”." : "Uporządkuj dokumenty i pytania przed wizytą."}</p>
        <ol><li>Sprawdź termin i adres placówki w terminarzu.</li><li>Przygotuj dane skierowania i dokument tożsamości.</li><li>Zapisz, jakie dokumenty zabrać i co chcesz omówić z lekarzem.</li></ol>
      </article>
      <Questions key={item?.referral.id ?? "general"} profile={view.profile!} context={item?.referral.id ?? "general"} />
      {row("Dokumenty i wyniki", "Otwórz wyniki badań", () => open("results"))}
      {row("Terminarz wizyt", "Sprawdź datę i listę przygotowań", () => open("visits"))}
      {item && view.profile === "ewa" && !grant && !["review", "confirmed"].includes(item.status) &&
        row("Poproś o pomoc", "Wybierz osobę i zakres dostępu", () => open("invite", item.referral.id))}
    </>;
  } else if (section === "visits" && owner) {
    content = <Visits key={id ?? "visits"} view={view} id={id} open={(id) => open("visits", id)}
      share={id ? () => navigate({ section: "share", origin: "visits", id }) : undefined} />;
  } else if (owner && ["timeline", "prescriptions", "results"].includes(section)) {
    content = <RecordList key={section} section={section} records={view.records ?? []} id={id} open={(id) => open(section, id)}
      share={section === "results" && id ? () => navigate({ section: "share", origin: "results", id }) : undefined} />;
  } else content = empty("Sprawdź dostępny zakres albo wróć do skierowania.");

  return <MostLayout role={helper ? "helper" : "owner"} identity={identity} nav={nav} contextTitle={helper ? "Pomoc dla Ewy" : "Zdrowie"} screen={section + (id ?? "")}
    title={title} onBack={back} notifications={unreadCount ?? inbox.filter(({ read }) => !read).length} onInbox={view ? onInbox ?? (() => open("inbox")) : undefined}
    footer={(showPlan || showReview) && <div ref={setFooterHost} className="health-footer-slot" />}>
    <div className="health-content">
      {view && !online && <p role="status">Brak połączenia. Wyświetlamy ostatni odczyt.</p>}
      {view && error && <p role="alert">{error}</p>}
      {content}
    </div>
  </MostLayout>;
}

function ReferralList({ cases, open }: { cases: HealthCase[]; open: (id: string) => void }) {
  const [filter, setFilter] = useState("");
  const list = cases.filter(({ status }) => !filter || (status === "confirmed" ? "used" : status === "new" ? "new" : status === "declined" ? "declined" : "ongoing") === filter);
  return <>
    <div className="health-filters"><label>Status skierowania <select value={filter} onChange={(e) => setFilter(e.target.value)}>
      <option value="">Wszystkie</option><option value="new">Nowe</option><option value="ongoing">W trakcie</option><option value="used">Wykorzystane</option><option value="declined">Odrzucony plan</option>
    </select></label></div>
    {list.length ? <div className="health-list">{[...list].reverse().map(({ referral, status }) =>
      <div key={referral.id}>{row(referral.title, healthCaption[status] + " · " + healthDate(referral.date), () => open(referral.id))}</div>)}</div> : empty("Brak skierowań w tym widoku.")}
  </>;
}

function CopyInvite({ link }: { link: string }) {
  const [message, setMessage] = useState("");
  return <div><button className="most-inline" onClick={async () => {
    try { await navigator.clipboard.writeText(link); setMessage("Skopiowano link zaproszenia."); }
    catch { setMessage("Wybierz link powyżej lub skopiuj jego adres z menu przeglądarki."); }
  }}>Skopiuj link zaproszenia</button>{message && <p role="status">{message}</p>}</div>;
}

function Invite({ locked, onSubmit }: { locked: boolean; onSubmit: (minutes: number, details: boolean, prepare: boolean) => void }) {
  const [minutes, setMinutes] = useState(15);
  const [details, setDetails] = useState(true);
  const [prepare, setPrepare] = useState(true);
  return <form className="health-panel health-form" onSubmit={(e) => { e.preventDefault(); onSubmit(minutes, details, prepare); }}>
    <h2>Zaufana osoba</h2>
    <label>Wybierz pomocnika <select name="helper"><option value="kacper">Kacper Zieliński</option></select></label>
    <fieldset><legend>Zakres dostępu</legend>
      <p>Tytuł, data i termin tego skierowania.</p>
      <label className="health-check"><input type="checkbox" checked={details} onChange={(e) => setDetails(e.target.checked)} /> Szczegóły i placówka kierująca</label>
      <label className="health-check"><input type="checkbox" checked={prepare} onChange={(e) => setPrepare(e.target.checked)} /> Przygotowanie wizyty</label>
    </fieldset>
    <label>Czas dostępu <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}><option value={5}>5 minut</option><option value={15}>15 minut</option><option value={60}>1 godzina</option></select></label>
    <button className="most-button most-primary" disabled={locked}>Utwórz upoważnienie</button>
  </form>;
}

function ShareForm({ title, locked, onSubmit }: { title: string; locked: boolean; onSubmit: (minutes: number) => void }) {
  const [minutes, setMinutes] = useState(15);
  return <form className="health-panel health-form" onSubmit={(event) => { event.preventDefault(); onSubmit(minutes); }}>
    <h2>{title}</h2>
    <label>Odbiorca <select><option>Kacper Zieliński</option></select></label>
    <p>Odbiorca zobaczy wyłącznie ten dokument. Dostęp możesz cofnąć w Upoważnieniach.</p>
    <label>Czas dostępu <select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>
      <option value={5}>5 minut</option><option value={15}>15 minut</option><option value={60}>1 godzina</option>
    </select></label>
    <button className="most-button most-primary" disabled={locked}>Utwórz link dostępu</button>
  </form>;
}

function Checklist({ items }: { items: string[] }) {
  return items.length ? <ul>{checklistItems.filter(([id]) => items.includes(id)).map(([id, label]) => <li key={id}>{label}</li>)}</ul> : <p>Lista przygotowań jest pusta.</p>;
}
function PlanEditor({ item, view, locked, footer, onSave }: { item: HealthCase; view: HealthView; locked: boolean; footer: HTMLDivElement | null; onSave: (plan: VisitPlan, final: boolean) => void }) {
  const [plan, setPlan] = useState<VisitPlan>(item.plan ?? { slot: "", contact: "aplikacja-demo", checklist: ["referral", "documents"] });
  const owner = view.role === "owner";
  const slot = view.slots.find(({ id }) => id === plan.slot);
  return <form id="health-demo-plan" className="health-panel health-form" onSubmit={(event) => { event.preventDefault(); onSave(plan, true); }}>
    <h2>{item.referral.title}</h2>
    <p>Wybierz placówkę, termin i sposób przypomnienia. Po zatwierdzeniu termin pojawi się w terminarzu aplikacji.</p>
    {item.feedback && <p><strong>Uwaga Ewy</strong> {item.feedback}</p>}
    <label>Placówka i termin <select value={plan.slot} required onChange={(e) => setPlan({ ...plan, slot: e.target.value })}>
      <option value="">Wybierz dostępny termin</option>
      {view.slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.place} · {healthDate(slot.time, true)}</option>)}
    </select></label>
    {slot && <p className="most-muted">{slot.place}<br />{healthDate(slot.time, true)}</p>}
    {!view.slots.length && empty("Brak wolnych terminów w przykładowym kalendarzu.")}
    <label>Przypomnienie <select value={plan.contact} onChange={(e) => setPlan({ ...plan, contact: e.target.value as VisitPlan["contact"] })}>
      <option value="aplikacja-demo">W aplikacji</option><option value="telefon-demo">Telefonicznie (symulacja)</option>
    </select></label>
    <fieldset><legend>Lista przygotowań</legend>{checklistItems.map(([id, label]) => <label className="health-check" key={id}>
      <input type="checkbox" checked={plan.checklist.includes(id)} onChange={(e) => setPlan({ ...plan, checklist: e.target.checked ? [...plan.checklist, id] : plan.checklist.filter((key) => id !== key) })} /> {label}
    </label>)}</fieldset>
    {!owner && <button type="button" className="most-button most-secondary" disabled={locked || !slot} onClick={() => onSave(plan, false)}>Zapisz szkic wizyty</button>}
    {!owner && item.plan && <p role="status">Plan jest zapisany w sprawie.</p>}
    {footer && createPortal(<button form="health-demo-plan" type="submit" className="most-button most-primary" disabled={locked || !slot}>
      {owner ? "Zapisz wizytę w terminarzu" : "Przekaż do zatwierdzenia"}
    </button>, footer)}
  </form>;
}

function Review({ item, slot, locked, canCorrect, onDecision, footer }: {
  item: HealthCase; slot?: HealthView["slots"][number]; locked: boolean; canCorrect: boolean;
  footer: HTMLDivElement | null;
  onDecision: (type: "approve" | "correct" | "reject", feedback?: string) => void;
}) {
  const [feedback, setFeedback] = useState("");
  return <div className="health-panel health-form">
    <h2>{item.referral.title}</h2>
    <dl className="most-package"><dt>Przygotował</dt><dd>Kacper</dd><dt>Placówka i termin</dt>
      <dd>{slot ? slot.place + " · " + healthDate(slot.time, true) : "Termin nie jest już dostępny"}</dd>
      <dt>Przypomnienie</dt><dd>{item.plan?.contact === "telefon-demo" ? "Telefoniczne (symulacja)" : "W aplikacji"}</dd>
    </dl>
    <h3>Lista przygotowań</h3><Checklist items={item.plan?.checklist ?? []} />
    <p className="most-muted">Termin zostanie zapisany w aplikacji. Placówka nie otrzyma rezerwacji.</p>
    {footer && createPortal(<button className="most-button most-primary" disabled={locked || !slot} onClick={() => onDecision("approve")}>Zatwierdź wizytę</button>, footer)}
    <label>Uwaga do planu <textarea value={feedback} maxLength={240} onChange={(e) => setFeedback(e.target.value)} placeholder="Wpisz wyłącznie fikcyjną uwagę" /></label>
    {canCorrect && <button className="most-button most-secondary" disabled={locked || !feedback.trim()} onClick={() => onDecision("correct", feedback)}>Poproś o poprawki</button>}
    <button className="most-button most-secondary" disabled={locked || !feedback.trim()} onClick={() => onDecision("reject", feedback)}>Odrzuć z uwagą</button>
  </div>;
}

function RecordDetail({ item, share }: { item: HealthRecord; share?: () => void }) {
  return <article className="health-panel"><h2>{item.title}</h2><p>{healthDate(item.date)} · {item.place}</p>
    {item.specialty && <p>{item.specialty}</p>}
    <p>{item.detail}</p>
    {item.code && <dl className="most-package"><dt>Status</dt><dd>{prescriptionState[item.state ?? "archived"]}</dd>
      <dt>Dawkowanie na przykładowej recepcie</dt><dd>{item.directions ?? "Brak zapisu w tym dokumencie"}</dd>
      <dt>Kod przykładowy</dt><dd><code>{item.code}</code></dd></dl>}
    {item.document && <><pre>{item.document}</pre><a className="most-inline" href={hrefForDocument(item)} download={item.id + "-demo.txt"}><FileText size={17} /> Pobierz dokument</a></>}
    {share && <button className="most-button most-secondary" onClick={share}>Udostępnij wynik</button>}
  </article>;
}

function RecordList({ section, records, id, open, share }: { section: string; records: HealthRecord[]; id?: string; open: (id: string) => void; share?: () => void }) {
  const [year, setYear] = useState("");
  const [kind, setKind] = useState("");
  const [query, setQuery] = useState("");
  const item = records.find((record) => record.id === id);
  if (item) return <RecordDetail item={item} share={share} />;
  if (id) return empty("Dokument jest niedostępny w tym profilu.");
  const timeline = section === "timeline";
  const prescriptions = section === "prescriptions";
  const list = records.filter((record) => timeline ? record.kind !== "prescription" : record.kind === (prescriptions ? "prescription" : "test"));
  const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ł/g, "l");
  const search = normalize(query.trim());
  const visible = list.filter((record) => (!year || record.date.startsWith(year)) && (!kind || (prescriptions ? record.state : record.kind) === kind) &&
    (!search || normalize([record.title, record.place, record.specialty, kindLabels[record.kind]].join(" ")).includes(search)))
    .sort((a, b) => b.date.localeCompare(a.date));
  return <>
    {timeline && <label className="health-search">Szukaj w historii <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nazwa, placówka lub specjalizacja" /></label>}
    {(timeline || prescriptions) && <div className="health-filters">
      {timeline && <label>Rok <select value={year} onChange={(e) => setYear(e.target.value)}><option value="">Wszystkie lata</option>
        {[...new Set(list.map(({ date }) => date.slice(0, 4)))].sort().reverse().map((value) => <option key={value}>{value}</option>)}</select></label>}
      <label>{timeline ? "Rodzaj zdarzenia" : "Status recepty"} <select value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="">Wszystkie</option>
        {timeline ? Object.entries(kindLabels).filter(([key]) => key !== "prescription").map(([key, name]) => <option key={key} value={key}>{name}</option>)
          : <><option value="active">Aktywne</option><option value="filled">Zrealizowane</option><option value="archived">Archiwalne</option></>}
      </select></label>
    </div>}
    {visible.length ? <ol className={timeline ? "health-timeline" : "health-cards"}>{visible.map((record) => <li key={record.id}>
      {row(record.title, healthDate(record.date) + " · " + (prescriptions ? prescriptionState[record.state ?? "archived"] : kindLabels[record.kind] + " · " + record.place), () => open(record.id))}
    </li>)}</ol> : empty("Brak danych dla wybranego widoku.")}
  </>;
}

function VisitDetail({ visit, share }: { visit: HealthVisit; share?: () => void }) {
  return <article className="health-panel">
    <MostNotice tone="success">Zapisano w terminarzu</MostNotice><h2>{visit.title}</h2>
    <p>{visit.place} · {healthDate(visit.time, true)}</p>
    <h3>Co przygotować</h3><Checklist items={visit.checklist} />
    <p>Termin zapisano lokalnie. Placówka nie otrzymuje rezerwacji.</p>
    {share && <button className="most-button most-secondary" onClick={share}>Udostępnij informacje o wizycie</button>}
  </article>;
}

function Visits({ view, id, open, share }: { view: HealthView; id?: string; open: (id: string) => void; share?: () => void }) {
  const [past, setPast] = useState(false);
  const confirmed = view.upcoming?.find((visit) => visit.id === id);
  const pastVisit = view.records?.find((record) => record.id === id && ["visit", "consultation"].includes(record.kind));
  if (confirmed) return <VisitDetail visit={confirmed} share={share} />;
  if (pastVisit) return <article className="health-panel"><h2>{pastVisit.title}</h2><p>{healthDate(pastVisit.date)} · {pastVisit.place}</p><p>{pastVisit.detail}</p></article>;
  if (id) return empty("Wizyta jest niedostępna w tym profilu.");
  const future = (view.upcoming ?? []).filter((visit) => Date.parse(visit.time) >= Date.now());
  const archive = [...(view.upcoming ?? []).filter((visit) => Date.parse(visit.time) < Date.now()).map((visit) => ({ ...visit, date: visit.time })),
    ...(view.records ?? []).filter((record) => ["visit", "consultation"].includes(record.kind))].sort((a, b) => b.date.localeCompare(a.date));
  const list = past ? archive : [...future].sort((a, b) => a.time.localeCompare(b.time)).map((visit) => ({ ...visit, date: visit.time }));
  return <><div className="case-collections" role="group" aria-label="Termin wizyt">
    <button aria-pressed={!past} onClick={() => setPast(false)}>Nadchodzące</button><button aria-pressed={past} onClick={() => setPast(true)}>Przeszłe</button>
  </div>{list.length ? list.map((visit) => <div key={visit.id}>{row(visit.title, visit.place + " · " + healthDate(visit.date, !past), () => open(visit.id))}</div>)
    : empty(past ? "Brak przeszłych wizyt." : "Brak nadchodzących wizyt. Plan możesz rozpocząć ze skierowania.")}</>;
}

const prompts = ["Jakie dokumenty zabrać na kolejną wizytę?", "Gdzie znajdę opis badania?", "Kiedy i w jaki sposób otrzymam wynik?", "Jak przygotować się organizacyjnie do następnego spotkania?"];
function Questions({ profile, context }: { profile: string; context: string }) {
  const key = "wellness:questions:" + profile + ":" + context;
  const [selected, setSelected] = useState<string[]>(() => {
    try { const saved = JSON.parse(sessionStorage.getItem(key) ?? "[]"); return prompts.filter((prompt) => Array.isArray(saved) && saved.includes(prompt)); }
    catch { return []; }
  });
  return <fieldset className="health-panel"><legend>Pytania do lekarza</legend>
    <p>Wybierz pytania. Twoja lista zapisuje się w tej sesji.</p>
    {prompts.map((prompt) => <label className="health-check" key={prompt}>
      <input type="checkbox" checked={selected.includes(prompt)} onChange={(e) => {
        const next = e.target.checked ? [...selected, prompt] : selected.filter((question) => question !== prompt);
        setSelected(next);
        try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* List remains available in this view. */ }
      }} /> {prompt}
    </label>)}
    <p role="status">Na liście {selected.length} z {prompts.length} pytań.</p>
  </fieldset>;
}
