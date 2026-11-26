import { useState, type ReactNode } from "react";
import { ArrowRight, CheckCheck, House, Plus, Sparkles, UsersRound } from "lucide-react";

const sections = [
  { id: "todo", label: "Do zrobienia" },
  { id: "active", label: "W toku" },
  { id: "done", label: "Zakończone" },
] as const;
type Section = (typeof sections)[number]["id"];
export type CaseCard = { id: string; section: Section; shared: boolean; content: ReactNode };

export function Cases({ onMove, collaboration, initialShared, onAssistant, onMost, offline }: {
  onMove: () => void;
  collaboration: CaseCard[];
  initialShared: boolean;
  onAssistant: () => void;
  onMost: (shared: boolean) => void;
  offline: boolean;
}) {
  const [shared, setShared] = useState(initialShared);
  const [picker, setPicker] = useState(false);
  const [section, selectSection] = useState<Section>();
  const cards = collaboration.filter((item) => item.shared === shared);
  const selected = section ?? sections.find(({ id }) => cards.some((item) => item.section === id))?.id ?? "todo";
  const visible = cards.filter((item) => item.section === selected);
  return <section className="citizen-cases">
    <header className="cases-heading">
      <h1>Sprawy</h1>
      {!shared && <button aria-label="Nowa sytuacja życiowa" aria-expanded={picker} onClick={() => setPicker(!picker)}>
        <Plus size={17} /> Nowa sprawa
      </button>}
    </header>
    <div className="case-collections" role="group" aria-label="Widok spraw">
      <button aria-pressed={!shared} onClick={() => { setShared(false); selectSection(undefined); }}>Moje</button>
      <button aria-pressed={shared} onClick={() => { setShared(true); selectSection(undefined); setPicker(false); }}>Pomagam</button>
    </div>
    <button className="process-assistant" onClick={() => onMost(shared)}>
      <UsersRound size={19} /><span><strong>{shared ? "Przejdź do spraw, w których pomagasz" : "Przejdź do wspólnych spraw"}</strong><small>Sprawy, szkice i terminy osób zaufanych</small></span><ArrowRight size={16} />
    </button>
    {!shared && <button className="process-assistant" onClick={onAssistant}>
      <Sparkles size={19} /><span><strong>Zapytaj o swoje sprawy</strong><small>Otwórz asystenta</small></span><ArrowRight size={16} />
    </button>}
    {!shared && picker && <div className="life-event-options">
      <button onClick={() => { setPicker(false); onMove(); }}>
        <House size={22} /><span><strong>Przeprowadzam się</strong><small>Zgłoś zameldowanie lub zaktualizuj adres podatkowy.</small></span>
        <ArrowRight size={17} />
      </button>
    </div>}
    {offline && !shared && <p role="status">Połącz się z systemem demo, aby wykonać sprawę.</p>}
    <div className="case-segments" role="tablist" aria-label="Status spraw" onKeyDown={(event) => {
      const direction = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
      if (!direction) return;
      event.preventDefault();
      const index = (sections.findIndex(({ id }) => id === selected) + direction + sections.length) % sections.length;
      selectSection(sections[index].id);
      event.currentTarget.querySelectorAll("button")[index]?.focus();
    }}>
      {sections.map(({ id, label }) => <button role="tab" id={"case-tab-" + id} key={id} aria-selected={selected === id}
        tabIndex={selected === id ? 0 : -1} aria-controls="case-panel" onClick={() => selectSection(id)}>
        {label}<span aria-hidden="true">{cards.filter((item) => item.section === id).length}</span>
      </button>)}
    </div>
    <section className="case-inbox" id="case-panel" role="tabpanel" aria-labelledby={"case-tab-" + selected}>
      <h2 className="case-status-heading">{sections.find(({ id }) => id === selected)?.label}</h2>
      {visible.map((item) => <div key={item.id}>{item.content}</div>)}
      {!visible.length && <div className="cases-empty"><CheckCheck size={26} /><p>{shared ? "Brak przekazanych spraw na tym etapie." : "Brak spraw na tym etapie."}</p></div>}
    </section>
  </section>;
}
