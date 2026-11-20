import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Access, CitizenState, Profile } from "./domain";
export function PrivacyHub({
  p,
  c,
  onShare,
  onAccess,
  onProtect,
  collaboration,
}: {
  p: Profile;
  c: CitizenState;
  onShare: (scope: "adult" | "identity") => void;
  onAccess: (a: Access) => void;
  onProtect: () => void;
  collaboration?: ReactNode;
}) {
  const [scope, setScope] = useState<"adult" | "identity">("adult");
  const active = c.access.filter((a) => a.revocable && a.active);
  return (
    <section className="privacy-workspace">
      <h1>Dane</h1>
      <p>Zakres udostępnienia, zgody i ślad użycia informacji.</p>
      {collaboration && <section className="privacy-collaboration">
        <h2>Dostęp do spraw i zdrowia</h2>{collaboration}
      </section>}
      <section className="privacy-scope-card">
        <header>
          <h2>Udostępnij minimum</h2>
          <small>mDowód · demo</small>
        </header>
        <div className="privacy-choice" aria-label="Zakres danych">
          <button
            aria-pressed={scope === "adult"}
            onClick={() => setScope("adult")}
          >
            Pełnoletność
          </button>
          <button
            aria-pressed={scope === "identity"}
            onClick={() => setScope("identity")}
          >
            Imię i nazwisko
          </button>
        </div>
        <div className="privacy-preview">
          <ShieldCheck size={29} />
          <span>
            <small>Odbiorca zobaczy tylko</small>
            <strong>
              {scope === "adult" ? "Tak, mam ukończone 18 lat" : p.name}
            </strong>
          </span>
        </div>
        <p>
          {scope === "adult"
            ? "Bez imienia, daty urodzenia, numeru dokumentu i PESEL."
            : "Bez daty urodzenia, numeru dokumentu i PESEL."}{" "}
          Odbiorcę i zgodę sprawdzisz przed utworzeniem kodu.
        </p>
        <button className="primary" onClick={() => onShare(scope)}>
          Udostępnij wybrane dane
          <ArrowRight size={17} />
        </button>
      </section>
      <div className="privacy-ai-note">
        <Sparkles size={21} />
        <span>
          <strong>Z jakich danych korzysta asystent?</strong>
          <small>
            Imię z profilu demo, status ochrony, bieżący ekran i etap otwartej
            sprawy. Bez zdjęcia, PESEL i treści plików. Domyślnie obliczenia są
            lokalne.
          </small>
        </span>
      </div>
      <div className="section-title">
        <h2>Aktywne zgody</h2>
        <span>{active.length}</span>
      </div>
      {active.length ? (
        active.map((a) => (
          <button className="inbox-item" key={a.id} onClick={() => onAccess(a)}>
            <span className="inbox-symbol green">
              <ShieldCheck size={21} />
            </span>
            <span>
              <strong>{a.who}</strong>
              <small>{a.scope}</small>
              <b className="case-cta">
                Sprawdź lub cofnij zgodę
                <ArrowRight size={14} />
              </b>
            </span>
            <ChevronRight size={16} />
          </button>
        ))
      ) : (
        <p className="inline-empty">
          Nie masz aktywnych zgód demonstracyjnych.
        </p>
      )}
      <button className="inbox-item" onClick={onProtect}>
        <span className="inbox-symbol green">
          <ShieldCheck size={21} />
        </span>
        <span>
          <strong>Ochrona PESEL</strong>
          <small>
            {c.protected
              ? "Włączona w symulacji"
              : "Nie zmieniano w tym profilu"}
          </small>
          <b className="case-cta">
            {c.protected
              ? "Sprawdź wybrane działania"
              : "Przygotuj plan ochrony"}
            <ArrowRight size={14} />
          </b>
        </span>
        <ChevronRight size={16} />
      </button>
      <div className="section-title">
        <h2>Historia dostępu</h2>
      </div>
      <div className="access-timeline">
        {c.access.map((a) => (
          <button key={a.id} onClick={() => onAccess(a)}>
            <span className={"timeline-dot " + (!a.active ? "inactive" : "")} />
            <span>
              <small>
                {new Date(a.at).toLocaleString("pl-PL", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
              <strong>{a.who}</strong>
              <span>{a.purpose}</span>
              {!a.active && <em>Zgoda wycofana</em>}
            </span>
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
      <p className="footnote">
        Historia dotyczy wyłącznie zdarzeń w pokazie. Zgody można cofnąć tylko
        tam, gdzie typ operacji na to pozwala.
      </p>
    </section>
  );
}
