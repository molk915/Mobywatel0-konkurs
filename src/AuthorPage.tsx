import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowRight, Sailboat, X } from "lucide-react";
import { CivicBrand } from "./CivicChrome";
import "./author.css";

const experience = [
  { name: "EY Polska", roles: ["Cybersecurity Intern", "Data & AI Solutions Intern"], description: "Bezpieczeństwo aplikacji, AI i przetwarzanie danych." },
  { name: "VeloBank", roles: ["IT Intern – Generative AI & Development"], description: "Generatywna AI, RAG, automatyzacja i technologie chmurowe." },
];

export default function AuthorDialog({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<"professional" | "personal">("professional");
  const dialog = useRef<HTMLDialogElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const modal = dialog.current!;
    modal.showModal();
    return () => modal.close();
  }, []);

  function switchView(next: typeof view) {
    if (next === view) return;
    setView(next);
    scroll.current?.scrollTo(0, 0);
  }

  return <dialog ref={dialog} className="author-page author-dialog" data-view={view} aria-labelledby="author-dialog-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="author-dialog-frame">
      <header className="author-header">
        <div className="author-brand"><CivicBrand most /></div>
        <span id="author-dialog-title">O twórcy</span>
        <button className="author-close" aria-label="Zamknij O twórcy" autoFocus onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </button>
        <div className="author-switch" role="group" aria-label="Widok profilu">
          <button aria-pressed={view === "professional"} onClick={() => switchView("professional")}>Kandydat na papierze</button>
          <button aria-pressed={view === "personal"} onClick={() => switchView("personal")}>Poznaj mnie</button>
        </div>
      </header>
      <div className="author-scroll" ref={scroll} tabIndex={0} aria-label="Profil twórcy">
        <div className="author-shell">
          {view === "professional" ? <Professional key="professional" /> : <Personal key="personal" onClose={onClose} />}
        </div>
      </div>
    </div>
  </dialog>;
}

function Professional() {
  return <div className="author-view">
    <section className="author-professional-hero" aria-labelledby="author-name">
      <div className="author-intro">
        <p className="author-eyebrow">18 lat <span>·</span> Warszawa</p>
        <h1 id="author-name">Piotr<span>.</span></h1>
        <p className="author-role">Twórca koncepcji<br />mObywatel MOST</p>
      </div>
      <figure className="author-portrait">
        <img src="/author/portret.jpg" width="950" height="950" fetchPriority="high" alt="Piotr w garniturze" />
      </figure>
    </section>
    <section className="author-about author-section" aria-labelledby="author-about">
      <h2 id="author-about">Zainteresowania</h2>
      <p>Interesuję się AI, cyberbezpieczeństwem i tworzeniem produktów cyfrowych. Lubię przechodzić od pomysłu do działającego prototypu.</p>
    </section>
    <section className="author-section author-career" aria-labelledby="author-experience">
      <h2 id="author-experience">Doświadczenie</h2>
      <ol className="author-timeline">{experience.map(({ name, roles, description }) => <li key={name}>
        <h3>{name}</h3>
        <ul>{roles.map((role) => <li key={role}>{role}</li>)}</ul>
        <p>{description}</p>
      </li>)}</ol>
    </section>
    <section className="author-section author-about" aria-labelledby="author-school">
      <h2 id="author-school">Edukacja</h2>
      <div><p>Techni Schools, Warszawa · technikum programistyczne</p>
        <p>Zespołowe zwycięstwo w hackathonie · IELTS Academic 7.0</p></div>
    </section>
  </div>;
}

function Personal({ onClose }: { onClose: () => void }) {
  return <div className="author-view author-life">
    <section className="author-life-hero" aria-labelledby="author-personal">
      <img src="/author/nad-morzem.jpg" width="1600" height="1200" alt="Piotr w żółtej koszulce przy stole na tarasie z widokiem na morze" />
      <h1 id="author-personal">Trochę więcej<br />niż technologia.</h1>
    </section>
    <section className="author-life-intro">
      <p>Poza technologią najwięcej czasu poświęcam sportowi i podróżom. Od kilku lat interesuję się akrobatyką, sportami wodnymi i żeglarstwem. Lubię uczyć się nowych rzeczy i poznawać ludzi po drodze.</p>
    </section>
    <section className="author-voyage" aria-labelledby="author-voyage">
      <div className="author-voyage-copy">
        <Sailboat size={30} strokeWidth={1.5} aria-hidden="true" />
        <h2 id="author-voyage">Dwa miesiące przez Atlantyk</h2>
        <p>Przepłynąłem Atlantyk z Hiszpanii do Brazylii jako członek załogi żaglowca STS Fryderyk Chopin.</p>
      </div>
      <div className="author-route">
        <span>Hiszpania</span>
        <ArrowDownRight size={33} strokeWidth={1.4} aria-hidden="true" />
        <span>Brazylia</span>
      </div>
    </section>
    <section className="author-water">
      <figure>
        <img src="/author/windsurfing.jpg" width="1250" height="938" loading="lazy" alt="Piotr trzyma żagiel windsurfingowy, stojąc w wodzie" />
      </figure>
      <div>
        <h2>Poza ekranem</h2>
        <p>Na wodzie lubię to, że ciągle jest się czego uczyć. W technologii najbardziej fascynuje mnie chwila, gdy pomysł staje się rozwiązaniem konkretnego problemu.</p>
      </div>
    </section>
    <section className="author-why author-section">
      <h2>Dlaczego mObywatel MOST?</h2>
      <p>Technologia publiczna powinna być dostępna również dla osób, które nie czują się pewnie w cyfrowym świecie. Projektując MOST, chciałem ułatwić bliskim wzajemną pomoc i zostawić właścicielowi danych decyzję o tym, co i komu udostępnia.</p>
      <button onClick={onClose}>Wróć do prototypu <ArrowRight size={17} aria-hidden="true" /></button>
    </section>
  </div>;
}
