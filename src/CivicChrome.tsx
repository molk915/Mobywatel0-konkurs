import { ArrowLeft, Bell, ChevronRight, FileText, FolderOpen, Grid2X2, House, Menu, ShieldCheck, UsersRound, WalletCards, type LucideIcon } from "lucide-react";
import type { Profile, Tab } from "./domain";

export function CivicBrand({ most = true }: { most?: boolean }) {
  return <><img src="/icon.svg" alt="" /><span>mObywatel{most && <> <b>MOST</b></>}</span></>;
}

export function CivicHeader({ profile, onHome, onBack, onNotifications, onProfile, unreadCount = 0, mostBrand = true }: {
  profile: Profile;
  onHome?: () => void;
  onBack?: () => void;
  onNotifications: () => void;
  onProfile: () => void;
  unreadCount?: number;
  mostBrand?: boolean;
}) {
  return (
    <header className="civic-header">
      {onBack && <button className="civic-icon-button" onClick={onBack} aria-label="Wstecz"><ArrowLeft size={20} /></button>}
      {onHome ? (
        <button className="civic-brand" onClick={onHome} aria-label="Ekran główny"><CivicBrand most={mostBrand} /></button>
      ) : <span className="civic-brand"><CivicBrand most={mostBrand} /></span>}
      <div className="civic-header-actions">
        <button className="civic-icon-button" onClick={onNotifications} aria-label="Powiadomienia">
          <Bell size={20} />{unreadCount > 0 && <b className="notification-count" aria-label={unreadCount + " nieprzeczytanych"}>{unreadCount}</b>}
        </button>
        <button className="civic-icon-button civic-avatar" onClick={onProfile} aria-label="Profil i ustawienia" title={profile.name}>
          <img src={"/portraits/" + profile.id + ".png"} alt="" />
        </button>
      </div>
    </header>
  );
}

const navigation = [
  { name: "Dokumenty", tab: "home", Icon: WalletCards },
  { name: "Sprawy", tab: "cases", Icon: FolderOpen },
  { name: "Usługi", tab: "services", Icon: Grid2X2 },
  { name: "Dane", tab: "privacy", Icon: ShieldCheck },
] as const;

const appNavigation = [
  { name: "Start", tab: "home", Icon: House },
  { name: "Dokumenty", tab: "documents", Icon: FileText },
  { name: "MOST", tab: "most", Icon: UsersRound },
  { name: "Sprawy", tab: "cases", Icon: FolderOpen },
  { name: "Więcej", tab: "services", Icon: Menu },
] as const;

export function CivicNav({ tab, onGo, onMost, full = false }: {
  tab: Tab | "assistant" | "most";
  onGo: (tab: Tab) => void;
  onAssistant: () => void;
  onMost?: () => void;
  full?: boolean;
}) {
  return (
    <nav className={"bottom-nav approved-nav" + (onMost ? " with-most" : "") + (full ? " civic-app-nav" : "")} aria-label="Nawigacja główna">
      {(full ? appNavigation : navigation).map(({ name, tab: target, Icon }) => {
        const selected = target === tab || (!full && target === "home" && tab === "documents") ||
          (target === "services" && (tab === "assistant" || full && tab === "privacy"));
        return (
          <button
            key={target}
            className={[selected ? "selected" : "", target === "most" ? "civic-most-tab" : ""].join(" ").trim()}
            aria-current={selected ? "page" : undefined}
            onClick={target === "most" ? onMost : () => onGo(target)}
          >
            <span className="civic-nav-icon"><Icon size={20} strokeWidth={selected ? 2.25 : 1.75} aria-hidden="true" /></span><span>{name}</span>
          </button>
        );
      })}
      {!full && onMost && <button onClick={onMost} className={tab === "most" ? "selected" : undefined} aria-current={tab === "most" ? "page" : undefined}>
        <span className="civic-nav-icon"><UsersRound size={20} strokeWidth={tab === "most" ? 2.25 : 1.75} aria-hidden="true" /></span><span>MOST</span>
      </button>}
    </nav>
  );
}

export function CivicLinkRow({ icon: Icon, title, detail, onClick, disabled, label }: {
  icon: LucideIcon;
  title: string;
  detail?: string;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return <button className="civic-link-row" onClick={onClick} disabled={disabled} aria-label={label}>
    <span className="civic-link-icon"><Icon size={23} strokeWidth={1.8} aria-hidden="true" /></span>
    <span className="civic-link-copy"><strong>{title}</strong>{detail && <small>{detail}</small>}</span>
    <ChevronRight size={18} aria-hidden="true" />
  </button>;
}

export function WavePattern() {
  return (
    <svg className="approved-waves" viewBox="0 0 400 230" preserveAspectRatio="none" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth=".56">
        {Array.from({ length: 34 }, (_, i) => (
          <path key={i} d={`M -30 ${-16 + i * 3.8} C ${120 - i * 2.3} ${-54 + i * 1.6}, ${192 + i * 3.5} ${193 - i * 1.5}, 425 ${98 + i * 4.3}`} />
        ))}
        {Array.from({ length: 19 }, (_, i) => (
          <path key={i} d={`M -30 ${239 - i * 2.6} C ${150 + i * 2.6} ${327 - i * 4.7}, ${235 - i * 2} ${151 + i * 1.3}, 424 ${154 + i * 4.3}`} />
        ))}
      </g>
    </svg>
  );
}
