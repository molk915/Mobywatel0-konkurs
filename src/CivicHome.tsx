import { ArrowRight, FileText, HeartPulse, ShieldCheck, UsersRound } from "lucide-react";
import { CivicLinkRow, WavePattern } from "./CivicChrome";
import type { Profile } from "./domain";
import { productTagline } from "./branding";

export function CivicHome({ profile, onMost, onDocuments, onHealth, onFamily, onPrivacy }: {
  profile: Profile;
  onMost: () => void;
  onDocuments: () => void;
  onHealth: () => void;
  onFamily: () => void;
  onPrivacy: () => void;
}) {
  return <div className="civic-home">
    <h1 tabIndex={-1}>Dzień dobry, {profile.greeting}</h1>
    <section className="civic-home-hero" aria-labelledby="home-most-title">
      <WavePattern />
      <div className="civic-home-mark"><UsersRound aria-hidden="true" /> <span>Wspólne sprawy</span></div>
      <h2 id="home-most-title">Potrzebujesz pomocy w sprawie?</h2>
      <p className="civic-home-tagline">{productTagline}</p>
      <p className="civic-home-compact-copy">Udostępnij sprawę zaufanej osobie.</p>
      <button className="civic-home-action" onClick={onMost}>
        Poproś o pomoc <ArrowRight size={23} aria-hidden="true" />
      </button>
    </section>
    <nav className="civic-home-services" aria-label="Najważniejsze usługi">
      <CivicLinkRow className="civic-home-documents" icon={FileText} title="Dokumenty" detail="mDowód, prawo jazdy i auto" onClick={onDocuments} />
      <CivicLinkRow icon={HeartPulse} title="Zdrowie" detail="Skierowania, wizyty, wyniki" onClick={onHealth} />
      <CivicLinkRow icon={ShieldCheck} title="Moje dane" detail="Sprawdź, kto ma dostęp" onClick={onPrivacy} />
      <CivicLinkRow icon={UsersRound} title="Rodzina" detail="Sprawy i zgody bliskich" onClick={onFamily} />
    </nav>
  </div>;
}
