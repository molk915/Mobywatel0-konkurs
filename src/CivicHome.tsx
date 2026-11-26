import { ArrowRight, FileText, HeartPulse, ShieldCheck, UsersRound } from "lucide-react";
import { CivicLinkRow, WavePattern } from "./CivicChrome";
import type { Profile } from "./domain";

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
      <div className="civic-home-mark"><UsersRound aria-hidden="true" /> <span>MOST</span></div>
      <h2 id="home-most-title">Potrzebujesz pomocy w sprawie?</h2>
      <p>Udostępnij wybraną sprawę komuś, komu ufasz.</p>
      <button className="civic-home-action" onClick={onMost}>
        Otwórz MOST <ArrowRight size={23} aria-hidden="true" />
      </button>
    </section>
    <nav className="civic-home-services" aria-label="Najważniejsze usługi">
      <CivicLinkRow icon={FileText} title="Dokumenty" detail="mDowód, prawo jazdy, pojazdy" onClick={onDocuments} />
      <CivicLinkRow icon={HeartPulse} title="Zdrowie" detail="Skierowania, wizyty, wyniki badań" onClick={onHealth} />
      <CivicLinkRow icon={UsersRound} title="Rodzina" detail="Sprawy bliskich i zgody opiekunów" onClick={onFamily} />
      <CivicLinkRow icon={ShieldCheck} title="Moje dane" detail="Sprawdź, kto korzysta z Twoich danych" onClick={onPrivacy} />
    </nav>
  </div>;
}
