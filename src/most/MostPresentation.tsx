import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, FileCheck2, Link2, Monitor, RotateCcw, Send, Smartphone } from "lucide-react";
import { CivicBrand, WavePattern } from "../CivicChrome";
import { routeForMost } from "./session";

const helperKey = "mobywatel-most-stage-invitation";
const readHelper = () => {
  try { return sessionStorage.getItem(helperKey) ?? ""; }
  catch { return ""; }
};

const steps = [
  { Icon: Link2, label: "Ewa wysyła zaproszenie" },
  { Icon: Send, label: "Kacper kompletuje sprawę" },
  { Icon: FileCheck2, label: "Ewa podejmuje decyzję" },
];

export function MostPresentation() {
  const started = () => new URLSearchParams(location.search).get("start") === "1";
  const [active, setActive] = useState(started);

  useEffect(() => {
    const restore = () => setActive(started());
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  if (active) return <MostStage />;
  return (
    <main className="most-stage most-welcome">
      <header className="most-stage-top">
        <a className="most-stage-brand" href="/"><CivicBrand /></a>
        <a className="most-stage-link" href="/"><ArrowLeft size={17} /> Wróć do aplikacji</a>
      </header>
      <section className="most-welcome-content">
        <div>
          <h1>Jedna sprawa.<br />Dwie osoby.<br /><em>Pełna kontrola.</em></h1>
          <p>Zobacz, jak Ewa może bezpiecznie poprosić Kacpra o pomoc przy sprawie urzędowej.</p>
          <button className="most-button most-primary" onClick={() => {
            history.pushState(null, "", "/?pokaz=most&start=1");
            setActive(true);
          }}>Rozpocznij demonstrację <ArrowRight size={19} /></button>
        </div>
        <div className="most-welcome-steps civic-pattern-card">
          <WavePattern />
          <h2>Przebieg pokazu</h2>
          <ol>{steps.map(({ Icon, label }) => <li key={label}><span className="most-icon"><Icon size={20} /></span>{label}</li>)}</ol>
        </div>
      </section>
    </main>
  );
}

function MostStage() {
  const [helper, setHelper] = useState(readHelper);
  const [resetting, setResetting] = useState(false);
  const [status, setStatus] = useState("");
  const owner = useRef<HTMLIFrameElement>(null);
  const timer = useRef<number>(0);
  const ownerUrl = routeForMost("owner", "stage");
  const helperUrl = helper ? routeForMost("helper", "stage", helper) : "/?most=czeka&ramka=1";

  useEffect(() => {
    const receive = (message: MessageEvent) => {
      if (message.origin !== location.origin || message.source !== owner.current?.contentWindow) return;
      if (message.data?.type === "most-invite" && /^[A-Za-z0-9_-]{32}$/.test(message.data.token)) {
        setHelper(message.data.token);
        try { sessionStorage.setItem(helperKey, message.data.token); } catch { /* optional persistence */ }
      }
      if (message.data?.type === "most-reset-result") {
        window.clearTimeout(timer.current);
        setResetting(false);
        if (message.data.done) {
          setHelper("");
          try { sessionStorage.removeItem(helperKey); } catch { /* optional persistence */ }
          setStatus("Pokaz zresetowany.");
        } else {
          setStatus("Nie udało się zresetować. Sprawdź połączenie Ewy i spróbuj ponownie.");
        }
      }
    };
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener("message", receive);
      window.clearTimeout(timer.current);
    };
  }, []);

  function reset() {
    setStatus("");
    setResetting(true);
    owner.current?.contentWindow?.postMessage({ type: "most-reset" }, location.origin);
    timer.current = window.setTimeout(() => {
      setResetting(false);
      setStatus("Telefon Ewy nie odpowiedział. Spróbuj ponownie.");
    }, 6000);
  }

  return (
    <main className="most-stage">
      <header className="most-stage-top">
        <a className="most-stage-brand" href="/"><CivicBrand /></a>
        <nav aria-label="Tryb prezentacji">
          <a href="/" aria-label="Wróć do aplikacji"><Smartphone size={17} /> <span>Wróć do aplikacji</span></a>
          <span aria-current="page"><Monitor size={18} /> <span>Dwa telefony</span></span>
        </nav>
      </header>
      <div className="most-stage-heading">
        <div>
          <h1>Jedna sprawa. Dwie osoby.</h1>
          <ol className="most-stage-guide">
            <li>Wyślij zaproszenie</li><li>Przygotuj pakiet</li><li>Zatwierdź wynik</li>
          </ol>
        </div>
        <div className="most-stage-reset">
          <button onClick={reset} disabled={resetting}><RotateCcw size={16} /> {resetting ? "Resetowanie…" : "Zacznij od nowa"}</button>
          <small aria-live="polite">{status}</small>
        </div>
      </div>
      <div className="most-stage-phones">
        <section className="most-stage-side" aria-label="Telefon Ewy">
          <h2>Ewa <span>Właścicielka sprawy</span></h2>
          <div className="most-stage-device"><iframe ref={owner} title="Telefon Ewy" src={ownerUrl} /></div>
        </section>
        <section className="most-stage-side" aria-label="Telefon Kacpra">
          <h2>Kacper <span>Zaproszony do pomocy</span></h2>
          <div className="most-stage-device"><iframe title="Telefon Kacpra" src={helperUrl} /></div>
        </section>
      </div>
    </main>
  );
}
