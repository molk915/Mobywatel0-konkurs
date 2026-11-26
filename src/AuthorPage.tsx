import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowLeft, ArrowRight, Sailboat } from "lucide-react";
import { CivicBrand } from "./CivicChrome";
import "./author.css";

const experience = [
  { name: "EY Polska", roles: ["Cybersecurity Intern", "Data & AI Solutions Intern"], description: "Offensive security, analiza bezpieczeństwa aplikacji oraz praca nad rozwiązaniami z obszaru AI i przetwarzania danych." },
  { name: "VeloBank", roles: ["IT Intern – Generative AI & Development"], description: "Generatywna AI, RAG, automatyzacja i technologie chmurowe." },
];
const focus = ["Artificial Intelligence & Data", "Cybersecurity & Offensive Security", "Software Development", "Product Development & UX"];
const activities = [
  "Zespołowe zwycięstwo w hackathonie",
  "Wolontariat na wydarzeniach technologicznych, m.in. Data Science Summit i DevAI",
  "Tworzenie własnych projektów technologicznych",
  "IELTS Academic · Overall 7.0",
];

export default function AuthorPage() {
  const [view, setView] = useState<"professional" | "personal">("professional");
  useEffect(() => {
    const title = document.title;
    document.title = "O twórcy · mObywatel MOST";
    const restore = (event: PageTransitionEvent) => { if (event.persisted) setView("professional"); };
    window.addEventListener("pageshow", restore);
    return () => {
      document.title = title;
      window.removeEventListener("pageshow", restore);
    };
  }, []);

  return <div className="author-page" data-view={view}>
    <header className="author-header author-shell">
      <a href="/" className="author-brand" aria-label="mObywatel MOST — prototyp"><CivicBrand most /></a>
      <a className="author-back" href="/"><ArrowLeft size={17} aria-hidden="true" /> <span>Wróć do prototypu</span></a>
    </header>
    <main className="author-shell">
      <div className="author-switchbar">
        <span>O twórcy</span>
        <div className="author-switch" role="group" aria-label="Widok profilu">
          <button aria-pressed={view === "professional"} onClick={() => setView("professional")}>Kandydat na papierze</button>
          <button aria-pressed={view === "personal"} onClick={() => setView("personal")}>Poznaj mnie</button>
        </div>
      </div>
      {view === "professional" ? <Professional key="professional" /> : <Personal key="personal" />}
    </main>
    <footer className="author-footer author-shell">
      <span>Piotr · twórca koncepcji MOST</span>
      <a href="/">Otwórz prototyp <ArrowRight size={16} aria-hidden="true" /></a>
    </footer>
  </div>;
}

function Professional() {
  return <div className="author-view">
    <section className="author-professional-hero" aria-labelledby="author-name">
      <div className="author-intro">
        <p className="author-eyebrow">18 lat <span>·</span> Warszawa</p>
        <h1 id="author-name">Piotr<span>.</span></h1>
        <p className="author-role">Twórca koncepcji<br />mObywatel MOST</p>
        <p className="author-disciplines">Artificial Intelligence <i /> Cybersecurity <i /> Product Development</p>
      </div>
      <figure className="author-portrait">
        <img src="/author/portret.jpg" width="950" height="950" fetchPriority="high" alt="Piotr w garniturze" />
      </figure>
    </section>
    <section className="author-about author-section" aria-labelledby="author-about">
      <h2 id="author-about">O mnie zawodowo</h2>
      <div>
        <p>Uczę się w technikum programistycznym. Interesuję się sztuczną inteligencją, cyberbezpieczeństwem i tworzeniem produktów cyfrowych. Doświadczenie zdobywałem w EY Polska i VeloBanku, pracując nad rozwiązaniami z obszaru AI, danych i bezpieczeństwa.</p>
        <p>Najbardziej interesuje mnie cały proces tworzenia produktu: od zrozumienia problemu przez koncepcję i implementację po doświadczenie użytkownika.</p>
      </div>
    </section>
    <section className="author-section author-career" aria-labelledby="author-experience">
      <h2 id="author-experience">Doświadczenie</h2>
      <ol className="author-timeline">{experience.map(({ name, roles, description }) => <li key={name}>
        <h3>{name}</h3>
        <ul>{roles.map((role) => <li key={role}>{role}</li>)}</ul>
        <p>{description}</p>
      </li>)}</ol>
    </section>
    <div className="author-facts author-section">
      <section aria-labelledby="author-school">
        <h2 id="author-school">Edukacja</h2>
        <h3>Techni Schools, Warszawa</h3>
        <p>Technikum programistyczne</p>
      </section>
      <section aria-labelledby="author-focus">
        <h2 id="author-focus">Kompetencje</h2>
        <ul>{focus.map((area) => <li key={area}>{area}</li>)}</ul>
      </section>
    </div>
    <section className="author-section author-about" aria-labelledby="author-activities">
      <h2 id="author-activities">Osiągnięcia i aktywności</h2>
      <ul className="author-activities">{activities.map((activity) => <li key={activity}><ArrowDownRight size={17} aria-hidden="true" />{activity}</li>)}</ul>
    </section>
    <section className="author-social" aria-label="Profile zawodowe">
      <span><strong>LinkedIn</strong> / <strong>GitHub</strong></span>
      <small>Adresy profili do uzupełnienia</small>
    </section>
  </div>;
}

function Personal() {
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
      <a href="/">Zobacz prototyp <ArrowRight size={17} aria-hidden="true" /></a>
    </section>
  </div>;
}
