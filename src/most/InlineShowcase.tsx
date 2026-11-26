import { createContext, useEffect, useLayoutEffect, useRef } from "react";
import { ArrowRight, Smartphone, X } from "lucide-react";

export const InlineShowcaseContext = createContext<{
  active: boolean;
  open: (token?: string) => void;
  connect: (token: string) => void;
} | null>(null);

export function PhoneHardware() {
  return <div aria-hidden="true">
    <span className="hardware-button volume-one" />
    <span className="hardware-button volume-two" />
    <span className="hardware-button power" />
  </div>;
}

export function ShowcaseEntry({ onOpen, ready }: { onOpen: () => void; ready?: boolean }) {
  return <button className="most-showcase-entry" onClick={onOpen}>
    <span className="most-showcase-symbol" aria-hidden="true"><Smartphone /><Smartphone /></span>
    <span><strong>{ready ? "Zobacz sprawę u Kacpra" : "Pokaż MOST na dwóch telefonach"}</strong>
      <small>{ready ? "Otwórz telefon Kacpra obok Ewy." : "Wybierz sprawę Ewy i sprawdź, co Kacper może zrobić."}</small>
    </span>
    <ArrowRight size={19} aria-hidden="true" />
  </button>;
}

export function InlineShowcaseToolbar({ onClose }: { onClose: () => void }) {
  return <div className="most-duet-toolbar">
    <strong>Pokaz MOST na dwóch telefonach</strong>
    <button onClick={() => document.getElementById("most-inline-helper")?.scrollIntoView({ block: "start" })}>
      Telefon Kacpra <ArrowRight size={16} aria-hidden="true" />
    </button>
    <button onClick={onClose} aria-label="Zakończ pokaz dwóch telefonów"><X size={20} aria-hidden="true" /></button>
  </div>;
}

export function InlineHelperPhone({ token, framed, scale }: { token?: string; framed: boolean; scale: number }) {
  const frame = useRef<HTMLIFrameElement>(null);
  function matchDeviceScale() {
    frame.current?.contentDocument?.documentElement?.style.setProperty("--embedded-device-scale", String(scale));
  }
  useLayoutEffect(matchDeviceScale, [scale]);
  useEffect(() => {
    if (!token) return;
    const deliver = () => frame.current?.contentWindow?.postMessage({ type: "most-showcase-invitation", token }, location.origin);
    const receive = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && event.origin === location.origin &&
          event.data?.type === "most-showcase-ready") deliver();
    };
    window.addEventListener("message", receive);
    deliver();
    return () => window.removeEventListener("message", receive);
  }, [token]);

  return <section className="most-inline-helper" id="most-inline-helper" aria-label="Telefon Kacpra">
    <div className="phone-shell">
      <PhoneHardware />
      <div className="phone">
        {!token && <div className="most-inline-waiting"><Smartphone size={32} aria-hidden="true" />
          <h2>Telefon Kacpra</h2><p>Wybierz sprawę na telefonie Ewy i potwierdź dostęp. Udostępniona sprawa pojawi się tutaj.</p></div>}
      </div>
    </div>
    {token && <iframe className="most-inline-screen" title="Telefon Kacpra" ref={frame} onLoad={matchDeviceScale}
      src={"/?telefon-most=kacper&pokaz-w-aplikacji=1&rama=" + (framed ? "frame" : "mobile")} />}
  </section>;
}
