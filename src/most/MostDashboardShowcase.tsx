import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CivicBrand } from "../CivicChrome";
import "./control.css";

const invitationKey = "most-showcase-invitation";

export default function MostDashboardShowcase() {
  const owner = useRef<HTMLIFrameElement>(null);
  const helper = useRef<HTMLIFrameElement>(null);
  const [invitation, setInvitation] = useState(() => {
    try { return sessionStorage.getItem(invitationKey) ?? ""; } catch { return ""; }
  });
  function deliverInvitation(token: string) {
    if (token) helper.current?.contentWindow?.postMessage({ type: "most-showcase-invitation", token }, location.origin);
  }
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== location.origin) return;
      if (event.source === helper.current?.contentWindow && event.data?.type === "most-showcase-ready") {
        deliverInvitation(invitation);
        return;
      }
      if (event.source !== owner.current?.contentWindow ||
          event.data?.type !== "most-dashboard-invite" || typeof event.data.token !== "string" ||
          !/^[A-Za-z0-9_-]{32}$/.test(event.data.token)) return;
      setInvitation(event.data.token);
      try { sessionStorage.setItem(invitationKey, event.data.token); } catch { /* The active showcase still works. */ }
    }
    window.addEventListener("message", receive);
    deliverInvitation(invitation);
    return () => window.removeEventListener("message", receive);
  }, [invitation]);

  return <main className="most-stage control-showcase">
    <header className="most-stage-top">
      <a className="most-stage-brand" href="/"><CivicBrand /></a>
      <a className="most-stage-link" href="/?start=most-hub"><ArrowLeft size={17} /> Otwórz wspólne sprawy w aplikacji</a>
    </header>
    <div className="most-stage-heading"><div>
      <h1>Współpraca na dwóch telefonach</h1>
      <p>Otwórz zakładkę Pomoc na telefonie Ewy, wyślij zaproszenie i odbierz je na telefonie Kacpra.</p>
    </div></div>
    <div className="most-stage-phones">
      <section className="most-stage-side" aria-label="Telefon Ewy">
        <h2>Ewa <span>Właścicielka spraw</span></h2>
        <div className="most-stage-device"><iframe ref={owner} title="Telefon Ewy" src="/?telefon-most=ewa" /></div>
      </section>
      <section className="most-stage-side" aria-label="Telefon Kacpra">
        <h2>Kacper <span>Osoba zaufana</span></h2>
        <div className="most-stage-device">
          <iframe ref={helper} title="Telefon Kacpra" src="/?telefon-most=kacper" onLoad={() => deliverInvitation(invitation)} />
        </div>
      </section>
    </div>
  </main>;
}
