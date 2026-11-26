import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, Bell, Check, ChevronRight, CircleAlert, Clock3, FileText, Link2, LockKeyhole, MessageSquare, Radio, ShieldCheck } from "lucide-react";
import { CivicBrand, WavePattern } from "../CivicChrome";
import { formatMostDeadline, mostTitle, scopeLabels, type MostComment, type MostDocument, type MostInvitation, type MostRole, type MostScope, type MostStatus } from "./model";
import { routeForMost } from "./session";

export const MostToolbarContext = createContext<ReactNode>(null);

export function Portrait({ person }: { person: "ewa" | "kacper" }) {
  return <img className="most-avatar" src={"/portraits/" + person + ".png"} alt="" />;
}

export function MostLayout({ role, identity, roleLabel, title, eyebrow, screen, children, footer, onBack, nav, contextTitle, notifications = 0, onInbox, busy = false, header, headingAvatar }: {
  role: MostRole;
  identity?: { id: string; first: string };
  roleLabel?: string;
  title: string;
  eyebrow?: string;
  screen: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  nav?: ReactNode;
  contextTitle?: string;
  notifications?: number;
  onInbox?: () => void;
  busy?: boolean;
  header?: ReactNode;
  headingAvatar?: string;
}) {
  const toolbar = useContext(MostToolbarContext);
  const content = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    content.current?.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, [screen]);
  return (
    <div className="most-phone-ui">
      {header ?? <header className="most-top">
        {onBack && <button className="civic-icon-button most-back" onClick={onBack} aria-label="Wstecz"><ArrowLeft size={20} /></button>}
        {contextTitle ? <span className="most-context-title">{contextTitle}</span>
          : <span className="civic-brand most-wordmark"><CivicBrand /></span>}
        <span className="most-identity">{roleLabel ?? (identity
          ? <><img className="most-avatar" src={"/portraits/" + identity.id + ".png"} alt="" />{identity.first}</>
          : <><Portrait person={role === "owner" ? "ewa" : "kacper"} />{role === "owner" ? "Ewa" : "Kacper"}</>)}</span>
        {onInbox && <button className="civic-icon-button most-bell" onClick={onInbox} aria-label="Powiadomienia"><Bell size={18} />{notifications > 0 && <b className="notification-count">{notifications}</b>}</button>}
      </header>}
      <section className="most-scroll" ref={content} aria-busy={busy}>
        <div className="most-screen" data-screen={screen} key={screen}>
          <header className={"most-heading" + (headingAvatar ? " most-dashboard-heading" : "")}>
            {headingAvatar && <span className="most-dashboard-avatar" data-role={role} aria-hidden="true">{headingAvatar}</span>}
            {eyebrow && <p className="most-eyebrow">{eyebrow}</p>}
            <h1 ref={heading} tabIndex={-1}>{title}</h1>
          </header>
          {toolbar}
          {children}
        </div>
      </section>
      {footer && <footer className="most-footer">{footer}</footer>}
      {nav}
    </div>
  );
}

export function MostRow({ icon, title, detail, onClick }: { icon: ReactNode; title: string; detail?: string; onClick: () => void }) {
  return (
    <button className="most-row" onClick={onClick}>
      <span className="most-icon">{icon}</span>
      <span><strong>{title}</strong>{detail && <small>{detail}</small>}</span>
      <ChevronRight size={18} />
    </button>
  );
}

export function MostProgress({ status, waiting }: { status: MostStatus; waiting?: boolean }) {
  const decisionMade = status === "finished" || status === "rejected";
  const current = decisionMade || status === "review" ? 2 : waiting ? 0 : 1;
  return <ol className="most-stages" aria-label="Etap współpracy">
    {["Zaproszenie", "Przygotowanie", "Decyzja"].map((label, index) => (
      <li key={label} aria-current={index === current && !decisionMade ? "step" : undefined} data-done={index < current || decisionMade}>
        <span aria-hidden="true">{index < current || decisionMade ? <Check size={13} /> : index + 1}</span>
        {label}
      </li>
    ))}
  </ol>;
}

export function MostNotice({ children, tone = "info", live = false }: { children: ReactNode; tone?: "info" | "success" | "warning"; live?: boolean }) {
  const Icon = tone === "success" ? Check : tone === "warning" ? CircleAlert : ShieldCheck;
  return <div className={"most-notice " + tone} role={live ? "status" : undefined}><Icon size={18} /><span>{children}</span></div>;
}

export function MostConnection({ connected, retry, error }: { connected: boolean; retry: () => void; error: string }) {
  return (
    <>
      {!connected && <p className="most-disconnected" role="status"><Radio size={17} /><span>Brak połączenia. Trwa ponawianie.</span><button onClick={retry}>Ponów</button></p>}
      {error && <p className="most-error" role="alert">{error}</p>}
    </>
  );
}

export function MostLetter({ document }: { document: MostDocument }) {
  return (
    <article className="most-letter">
      <WavePattern />
      <p className="most-letter-label"><FileText size={16} /> {document.office} <span>DEMO</span></p>
      <h2>{document.title}</h2>
      <p>{document.body}</p>
      {(document.reference || document.pesel) && <dl>
        {document.reference && <div><dt>Numer pisma</dt><dd>{document.reference}</dd></div>}
        {document.pesel && <div><dt>PESEL demonstracyjny</dt><dd>{document.pesel}</dd></div>}
      </dl>}
    </article>
  );
}

export function MostDeadline({ at }: { at: number }) {
  return <div className="most-deadline"><Clock3 size={18} /><span>Termin odpowiedzi</span><strong>{formatMostDeadline(at)}</strong></div>;
}

export function ScopeSummary({ scope }: { scope: MostScope }) {
  const allowed = Object.entries(scopeLabels).filter(([key]) => scope[key as keyof MostScope]);
  return (
    <div className="most-scope-summary">
      <h2><LockKeyhole size={17} /> Zakres dostępu</h2>
      {allowed.length > 0
        ? <ul>{allowed.map(([key, label]) => <li key={key}>{label}</li>)}</ul>
        : <p>Podstawowy opis sprawy i termin.</p>}
      <p>Ostateczna decyzja należy do Ewy.</p>
    </div>
  );
}

export function MostInvite({ invitation, generic = false, onShowcase }: {
  invitation: MostInvitation; generic?: boolean; onShowcase?: () => void;
}) {
  const link = invitation.token ? routeForMost("helper", "app", invitation.token) : "";
  const [qr, setQr] = useState("");
  const [qrError, setQrError] = useState(false);
  const [copy, setCopy] = useState<"copied" | "manual" | null>(null);
  const [now, setNow] = useState(Date.now);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (copy === "manual") input.current?.focus();
  }, [copy]);
  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    import("qrcode").then((module) => module.toDataURL(link, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#350d1b", light: "#ffffff" },
    })).then((result) => {
      if (!cancelled) setQr(result);
    }).catch(() => {
      if (!cancelled) setQrError(true);
    });
    return () => { cancelled = true; };
  }, [link]);
  const remaining = Math.max(0, Math.ceil((invitation.expiresAt - now) / 1000));
  const clock = Math.floor(remaining / 60) + ":" + String(remaining % 60).padStart(2, "0");
  if (!link) return <MostNotice tone="warning">To zaproszenie straciło ważność.</MostNotice>;
  return (
    <>
      <p className="most-lead">{generic ? "Pokaż kod QR wybranej osobie albo przekaż jej link." : "Wyślij link lub pokaż Kacprowi kod QR. Na jednym komputerze otwórz jego zadanie w drugiej karcie."}</p>
      <div className="most-invite-paper">
        {qr ? <img src={qr} alt={generic ? "Kod QR zaproszenia dla bliskiej osoby" : "Kod QR zaproszenia dla Kacpra"} width={164} height={164} />
          : <p className="most-muted">{qrError ? "Kod QR jest niedostępny. Użyj linku." : "Tworzenie kodu QR…"}</p>}
        <p><Clock3 size={16} /> Ważność <strong>{clock}</strong></p>
      </div>
      <div className={"most-actions most-invite-actions" + (onShowcase ? " most-invite-with-showcase" : "")}>
        <button className="most-button most-secondary" onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopy("copied");
          } catch {
            setCopy("manual");
            input.current?.focus();
          }
        }}><Link2 size={16} /> Kopiuj link</button>
        {onShowcase
          ? <button className="most-button most-primary" disabled={remaining === 0} onClick={onShowcase}>
            Pokaż na dwóch telefonach <ChevronRight size={18} aria-hidden="true" />
          </button>
          : <a className="most-button most-secondary" href={link} target="_blank" rel="noopener noreferrer">{generic ? "Otwórz zaproszenie w nowej karcie" : "Otwórz zadanie Kacpra"} <ArrowUpRight size={17} aria-hidden="true" /></a>}
      </div>
      {copy === "manual" && <label className="most-link-field">Link zaproszenia<input ref={input} value={link} readOnly onFocus={(e) => e.currentTarget.select()} /></label>}
      {copy && <p className="most-muted" role="status">{copy === "copied" ? "Link został skopiowany." : "Skopiuj zaznaczony link."}</p>}
    </>
  );
}

export function MostComments({ comments, disabled, onSend }: { comments: MostComment[]; disabled: boolean; onSend: (text: string) => Promise<boolean> }) {
  const [text, setText] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await onSend(text)) setText("");
  }
  return (
    <>
      {comments.length ? <ul className="most-comments">
        {comments.map((comment) => <li key={comment.id}>
          <Portrait person={comment.role === "owner" ? "ewa" : "kacper"} />
          <div><strong>{comment.role === "owner" ? "Ewa" : "Kacper"}</strong><p>{comment.text}</p></div>
        </li>)}
      </ul> : <MostNotice>Tu pojawią się komentarze dotyczące pisma.</MostNotice>}
      <form className="most-editor" onSubmit={submit}>
        <label>Dodaj komentarz<textarea rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} /></label>
        <button className="most-button most-primary" disabled={disabled || !text.trim()}><MessageSquare size={17} /> Dodaj komentarz</button>
      </form>
    </>
  );
}

export function WaitingForEwa() {
  return <MostLayout role="helper" title="Czekasz na zaproszenie" screen="waiting" eyebrow={mostTitle}>
    <div className="most-waiting"><span className="most-icon"><Link2 size={25} /></span><p>Kiedy Ewa udostępni sprawę, pojawi się tutaj. Będziesz mógł pomóc w granicach przyznanego Ci dostępu.</p></div>
  </MostLayout>;
}
