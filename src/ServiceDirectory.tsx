import { useState } from "react";
import { ArrowRight, HeartPulse, House, Search, ShieldCheck, Sparkles, UsersRound, X } from "lucide-react";
import { MostRow } from "./most/components";

const groups = [
  { title: "Usługi osobiste", services: [
    { id: "health", title: "Zdrowie", detail: "Skierowania, wizyty i dokumentacja", keywords: "wizyta wyniki recepta", Icon: HeartPulse },
    { id: "family", title: "Rodzina", detail: "Sprawy bliskich i zgody opiekunów", keywords: "paszport dziecko rodzice", Icon: UsersRound },
    { id: "privacy", title: "Moje dane", detail: "Sprawdź historię dostępu i uprawnienia", keywords: "rejestry prywatność zgody historia data tracker", Icon: ShieldCheck },
  ] },
  { title: "Codzienne formalności", services: [
    { id: "move", title: "Przeprowadzka", detail: "Zgłoszenia zmiany adresu", keywords: "adres meldunek", Icon: House },
  ] },
] as const;
type Service = (typeof groups)[number]["services"][number]["id"];
const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll("ł", "l");

export function ServiceDirectory({ open, onAssistant }: {
  open: (id: Service) => void;
  onAssistant: () => void;
}) {
  const [query, setQuery] = useState("");
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const results = groups.map(({ title, services }) => ({
    title,
    services: services.filter((service) =>
      terms.every((term) => normalize([service.title, service.detail, service.keywords].join(" ")).includes(term))),
  })).filter(({ services }) => services.length);
  return (
    <section className="service-directory" aria-label="Katalog usług">
      <header><h1>Usługi</h1><p>Znajdź sprawę, którą chcesz załatwić.</p></header>
      <div className="service-search">
        <label><Search size={19} aria-hidden="true" /><input type="search" value={query}
          onChange={(event) => setQuery(event.target.value)} aria-label="Szukaj usługi" placeholder="Szukaj usługi" /></label>
        {query && <button onClick={() => setQuery("")} aria-label="Wyczyść wyszukiwanie"><X size={18} /></button>}
      </div>
      {results.map(({ title, services }) => (
        <section className="service-group" key={title} aria-label={title}>
          <h2>{title}</h2>
          <div>{services.map(({ id, title, detail, Icon }) => (
            <MostRow key={id} icon={<Icon size={21} />} title={title} detail={detail} onClick={() => open(id)} />
          ))}</div>
        </section>
      ))}
      {!results.length && <p role="status" className="service-empty">Brak pasujących usług. Spróbuj „wizyta”, „rodzina” lub „adres”.</p>}
      <button className="service-assistant civic-pattern-card" onClick={onAssistant}>
        <span className="most-icon"><Sparkles size={20} aria-hidden="true" /></span>
        <span><strong>Otwórz asystenta</strong><small>Opisz, co chcesz załatwić.</small></span>
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </section>
  );
}
