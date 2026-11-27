import { createContext, useEffect, useLayoutEffect, useRef } from "react";
import { ArrowRight, Smartphone, X } from "lucide-react";
import type { Profile } from "../domain";

const phoneTitles: Record<Profile["id"], string> = { ewa: "Telefon Ewy", kacper: "Telefon Kacpra", aleksandra: "Telefon Aleksandry" };

export const InlineShowcaseContext = createContext<{
  active: boolean;
  open: (token?: string, helper?: Profile["id"]) => void;
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
    <span><strong>{ready ? "Zobacz sprawę na drugim telefonie" : "Pokaż współpracę na dwóch telefonach"}</strong>
      <small>{ready ? "Otwórz telefon osoby zaufanej obok swojego." : "Wybierz sprawę i sprawdź, co może zrobić osoba zaufana."}</small>
    </span>
    <ArrowRight size={19} aria-hidden="true" />
  </button>;
}

export function InlineShowcaseToolbar({ onClose, helper }: { onClose: () => void; helper: Profile["id"] }) {
  return <div className="most-duet-toolbar">
    <strong>Pokaz współpracy na dwóch telefonach</strong>
    <button onClick={() => document.getElementById("most-inline-helper")?.scrollIntoView({ block: "start" })}>
      {phoneTitles[helper]} <ArrowRight size={16} aria-hidden="true" />
    </button>
    <button onClick={onClose} aria-label="Zakończ pokaz dwóch telefonów"><X size={20} aria-hidden="true" /></button>
  </div>;
}

export function InlineHelperPhone({ token, framed, scale, helper }: { token?: string; framed: boolean; scale: number; helper: Profile["id"] }) {
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
  }, [token, helper]);

  return <section className="most-inline-helper" id="most-inline-helper" aria-label={phoneTitles[helper]}>
    <div className="phone-shell">
      <PhoneHardware />
      <div className="phone">
        {!token && <div className="most-inline-waiting"><Smartphone size={32} aria-hidden="true" />
          <h2>{phoneTitles[helper]}</h2><p>Wybierz sprawę na pierwszym telefonie i potwierdź dostęp. Udostępniona sprawa pojawi się tutaj.</p></div>}
      </div>
    </div>
    {token && <iframe className="most-inline-screen" title={phoneTitles[helper]} ref={frame} onLoad={matchDeviceScale}
      src={"/?telefon-most=" + helper + "&pokaz-w-aplikacji=1&rama=" + (framed ? "frame" : "mobile")} />}
  </section>;
}
