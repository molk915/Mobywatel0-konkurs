import { useState } from "react";
import { Check, FileText } from "lucide-react";
import { Inbox } from "../Inbox";
import { MostNotice } from "./components";
import { eventLabels, initialScope, sampleAddress, sampleReason, type MostAttachment, type MostNotification, type MostView } from "./model";
import type { useMostSession } from "./session";

export type MostSession = ReturnType<typeof useMostSession>;
export function unread(view?: MostView | null) {
  return view?.notifications.filter((item) => !item.read).length ?? 0;
}

export function MostInbox({ items, markRead, onOpen }: {
  items: MostNotification[];
  markRead: (id: number) => Promise<boolean>;
  onOpen: (item: MostNotification) => void;
}) {
  return <Inbox items={items.map((item) => ({
    ...item, key: String(item.id), title: eventLabels[item.type],
    markRead: () => markRead(item.id), open: () => onOpen(item),
  }))} />;
}

export function AttachmentLink({ file }: { file: MostAttachment }) {
  const { name, text } = file;
  return <a className="most-inline" href={"data:text/plain;charset=utf-8," + encodeURIComponent(text)} download={name}><FileText size={17} /> {name}</a>;
}

export function PackageSummary({ view }: { view: MostView }) {
  const { work } = view;
  const attachment = work.attachment && view.files[work.attachment];
  const contributors = new Set((["form", "attach", "response"] as const).flatMap((type) => {
    const last = view.history.filter((entry) => entry.type === type).at(-1);
    return last ? [last.role === "helper" ? "Kacper" : "Ewa"] : [];
  }));
  return <article className="most-draft">
    <h2>Uzupełnienie wezwania</h2>
    <dl className="most-package">
      <dt>Adres lokalu</dt><dd>{work.address || "Brak"}</dd>
      <dt>Uzasadnienie</dt><dd>{work.reason || "Brak"}</dd>
      <dt>Załącznik</dt><dd>{attachment ? <AttachmentLink file={attachment} /> : "Brak"}</dd>
      {contributors.size > 0 && <><dt>Przygotowali</dt><dd>{[...contributors].join(", ")}</dd></>}
    </dl>
  </article>;
}

export function MostTasks({ session }: { session: MostSession }) {
  const view = session.view!;
  const { work } = view;
  const attachment = work.attachment && view.files[work.attachment];
  const owner = view.role === "owner";
  const scope = owner ? initialScope : view.invitation!.scope;
  const locked = session.busy || !session.connected;
  const [address, setAddress] = useState(work.address ?? "");
  const [reason, setReason] = useState(work.reason ?? "");
  return <>
    <p className="most-lead">Uzupełnij wezwanie dokumentem potwierdzającym prawo do lokalu. Korzystaj wyłącznie z danych fikcyjnych.</p>
    {work.feedback && <MostNotice tone="warning" live>{work.feedback}{!view.canReview && view.complete && " Zmień co najmniej jedno zadanie przed przekazaniem pakietu."}</MostNotice>}
    <section className="most-draft">
      <h2>1. Uzupełnij formularz</h2>
      <p className="most-muted">{work.address ? "Zapisano adres: " + work.address : "Wskaż adres lokalu objętego wezwaniem."}</p>
      {scope.form && <form className="most-editor" onSubmit={(e) => { e.preventDefault(); void session.act({ type: "form", address }); }}>
        <label>Adres lokalu<input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={120} required /></label>
        <button type="button" className="most-inline" onClick={() => setAddress(sampleAddress)}>Wstaw adres demo</button>
        <button className="most-button most-secondary" disabled={locked || !address.trim()}>Zapisz formularz</button>
      </form>}
      {!scope.form && <p className="most-muted">To zadanie pozostaje po stronie Ewy.</p>}
    </section>
    <section className="most-draft">
      <h2>2. Dołącz dokument</h2>
      <p className="most-muted">Wymagane potwierdzenie prawa do lokalu. W przykładzie jest to kopia umowy najmu.</p>
      {attachment ? <AttachmentLink file={attachment} /> : <p className="most-muted">Brak dostępnego załącznika w tym zakresie.</p>}
      {scope.attachments && <button className="most-inline" disabled={locked || work.attachment === "helper"} onClick={() => void session.act({ type: "attach", source: "helper" })}>Dołącz kopię demonstracyjną</button>}
      {work.documentRequest === "pending" && <MostNotice live>Czeka na dokument od Ewy.</MostNotice>}
      {scope.attachments && work.documentRequest === "shared" && <button className="most-button most-secondary" disabled={locked || work.attachment === "owner"} onClick={() => void session.act({ type: "attach", source: "owner" })}>Dołącz dokument Ewy</button>}
      {!owner && scope.requestDocument && !work.documentRequest && !work.attachment && <button className="most-button most-secondary" disabled={locked} onClick={() => void session.act({ type: "request" })}>Poproś Ewę o dokument</button>}
    </section>
    <section className="most-draft">
      <h2>3. Przygotuj uzasadnienie</h2>
      <p className="most-muted">{work.reason ? "Uzasadnienie zapisane." : "Wyjaśnij, w jaki sposób załącznik uzupełnia wezwanie."}</p>
      {scope.response && <form className="most-editor" onSubmit={(e) => { e.preventDefault(); void session.act({ type: "response", reason }); }}>
        <label>Uzasadnienie<textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1400} required /></label>
        <button type="button" className="most-inline" onClick={() => setReason(sampleReason)}>Wstaw uzasadnienie demo</button>
        <button className="most-button most-secondary" disabled={locked || !reason.trim()}>Zapisz uzasadnienie</button>
      </form>}
      {!scope.response && <p className="most-muted">To zadanie pozostaje po stronie Ewy.</p>}
    </section>
    <MostNotice tone={view.complete ? "success" : "info"} live><Check size={16} /> {view.complete ? "Pakiet jest kompletny." : "Pakiet wymaga uzupełnienia."}</MostNotice>
  </>;
}
