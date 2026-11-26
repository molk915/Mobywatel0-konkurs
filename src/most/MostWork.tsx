import { useEffect, useState, type ReactNode } from "react";
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

export function PackageSummary({ view, compare = false }: { view: MostView; compare?: boolean }) {
  const { work, files } = view;
  const previous = compare ? view.previousPackage : undefined;
  const changedAttachment = previous && (previous.attachment !== work.attachment || previous.upload?.digest !== work.upload?.digest ||
    previous.upload?.name !== work.upload?.name);
  const changes = previous && (previous.address !== work.address || previous.reason !== work.reason || changedAttachment);
  const attachment = work.attachment && view.files[work.attachment];
  const contributors = new Set((["form", "attach", "response"] as const).flatMap((type) => {
    const last = view.history.filter((entry) => entry.type === type).at(-1);
    return last ? [last.role === "helper" ? "Kacper" : "Ewa"] : [];
  }));
  return <article className="most-draft">
    <h2>{previous ? "Pakiet po poprawkach" : "Uzupełnienie wezwania"}</h2>
    {previous && <p className="most-muted">{changes
      ? "Zmiany względem poprzedniego pakietu są opisane przy odpowiednich pozycjach."
      : "Wszystkie wartości są takie same jak w poprzednim pakiecie."}</p>}
    <dl className="most-package">
      <dt>Odbiorca</dt><dd>{view.document?.office ?? "Urząd Miasta Lublin"} · demo</dd>
      <dt>Adres lokalu</dt><dd>{work.address || "Brak"}
        {previous && previous.address !== work.address && <PreviousValue value={previous.address} />}
      </dd>
      <dt>Uzasadnienie</dt><dd>{work.reason || "Brak"}
        {previous && previous.reason !== work.reason && <PreviousValue value={previous.reason} />}
      </dd>
      <dt>Załącznik</dt><dd>{attachment ? <AttachmentLink file={attachment} /> : work.upload?.name ?? "Brak"}
        {changedAttachment && <PreviousValue value={previous.upload?.name ?? files[previous.attachment]?.name ?? "Poprzedni załącznik"} />}
      </dd>
      {contributors.size > 0 && <><dt>Przygotowali</dt><dd>{[...contributors].join(", ")}</dd></>}
    </dl>
  </article>;
}

function PreviousValue({ value }: { value: string }) {
  return <small className="most-previous-value"><strong>Zmieniono</strong><span>Poprzednio: {value}</span></small>;
}

export function MostTasks({ session, beforeForms, helperFormId, onDraftReady, onDraftSaved }: {
  session: MostSession; beforeForms?: ReactNode; helperFormId?: string;
  onDraftReady?: (ready: boolean) => void;
  onDraftSaved?: (saved: boolean) => void;
}) {
  const view = session.view!;
  const { work } = view;
  const attachment = work.attachment && view.files[work.attachment];
  const owner = view.role === "owner";
  const scope = owner ? initialScope : view.invitation!.scope;
  const locked = session.busy || !session.connected;
  const [addressEdit, editAddress] = useState<{ value: string; base: string }>();
  const [reasonEdit, editReason] = useState<{ value: string; base: string }>();
  const address = addressEdit?.value ?? work.address ?? "";
  const reason = reasonEdit?.value ?? work.reason ?? "";
  const [fileError, setFileError] = useState("");
  const [readingFile, setReadingFile] = useState(false);
  const localDraft = Boolean(addressEdit?.value.trim() || reasonEdit?.value.trim());
  useEffect(() => {
    onDraftReady?.(localDraft && !readingFile);
    return () => onDraftReady?.(false);
  }, [localDraft, onDraftReady, readingFile]);
  function changeAddress(value: string) {
    onDraftSaved?.(false);
    editAddress((previous) => ({ value, base: previous?.base ?? work.address ?? "" }));
  }
  function changeReason(value: string) {
    onDraftSaved?.(false);
    editReason((previous) => ({ value, base: previous?.base ?? work.reason ?? "" }));
  }
  const draft = () => ({
    draft: { ...(scope.form && addressEdit && { address }), ...(scope.response && reasonEdit && { reason }) },
    expectedDraft: {
      ...(scope.form && addressEdit && { address: addressEdit.base }),
      ...(scope.response && reasonEdit && { reason: reasonEdit.base }),
    },
  });
  async function addFile(file?: File) {
    if (!file) return;
    setFileError("");
    if (!/\.(pdf|png|jpe?g)$/i.test(file.name) ||
        !["application/pdf", "image/png", "image/jpeg"].includes(file.type) ||
        !file.size || file.size > 5 * 1024 * 1024) {
      setFileError("Wybierz PDF, PNG lub JPG do 5 MB.");
      return;
    }
    setReadingFile(true);
    try {
      const bytes = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const digest = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
      await session.act({ type: "upload", file: { name: file.name, mime: file.type, size: file.size, digest } });
    } catch {
      setFileError("Nie udało się odczytać pliku. Spróbuj ponownie.");
    } finally {
      setReadingFile(false);
    }
  }
  const assigned = [
    { allowed: scope.form, done: !!work.address, title: "Adres" },
    { allowed: scope.attachments, done: !!work.attachment, title: "Kopia umowy" },
    { allowed: scope.response, done: !!work.reason, title: "Uzasadnienie" },
  ].filter((item) => item.allowed);
  return <>
    <section className="most-checklist" aria-label={owner ? "Twoje uzupełnienie" : "Twoje zadania"}>
      <h2>{owner ? "Twoje uzupełnienie" : "Twoje zadania"}</h2>
      {assigned.length ? <ul>{assigned.map(({ title, done }) => (
        <li key={title}><span>{title}</span><small>{done ? "Gotowe" : "Do zrobienia"}</small></li>
      ))}</ul> : <p>Możesz poprosić Ewę o kopię umowy.</p>}
      {!owner && !view.complete && assigned.length > 0 && assigned.every(({ done }) => done) &&
        <p>{view.invitation?.maySubmit ? "Ewa może uzupełnić brakujące elementy pakietu." : "Możesz przekazać swoją część Ewie do uzupełnienia."}</p>}
    </section>
    {beforeForms}
    {work.feedback && <MostNotice tone="warning" live>{work.feedback}{!view.canReview && view.complete && " Zmień co najmniej jedno zadanie przed przekazaniem pakietu."}</MostNotice>}
    <section className="most-draft">
      <h2>1. Potwierdź adres lokalu</h2>
      <p className="most-muted">{work.address ? "Zapisano adres: " + work.address : "Wskaż adres lokalu objętego wezwaniem."}</p>
      {scope.form && <form className="most-editor" onSubmit={async (e) => {
        e.preventDefault();
        if (await session.act({ type: "form", address })) editAddress(undefined);
      }}>
        <label>Adres lokalu<input aria-label="Adres lokalu" value={address} onChange={(e) => changeAddress(e.target.value)} maxLength={120} required /></label>
        <button type="button" className="most-inline" onClick={() => changeAddress(sampleAddress)}>Użyj przykładowego adresu</button>
        <button className="most-button most-secondary" disabled={locked || !address.trim()}>Zapisz formularz</button>
      </form>}
      {!scope.form && <p className="most-muted">To zadanie pozostaje po stronie Ewy.</p>}
    </section>
    <section className="most-draft">
      <h2>2. Dołącz kopię umowy</h2>
      <p className="most-muted">Wymagane potwierdzenie prawa do lokalu. W przykładzie jest to kopia umowy najmu.</p>
      {attachment ? <AttachmentLink file={attachment} /> : <p className="most-muted">{work.upload?.name ?? "Nie dodano jeszcze załącznika."}</p>}
      {scope.attachments && <div className="most-attachment-actions">
        <button className="most-inline" disabled={locked || work.attachment === "helper"} onClick={() => void session.act({ type: "attach", source: "helper" })}>
          Użyj przykładowej umowy
        </button>
        <label className="most-button most-secondary most-file-picker">
          Dodaj plik z urządzenia
          <input className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={locked || readingFile} onChange={(event) => {
            void addFile(event.currentTarget.files?.[0]);
            event.currentTarget.value = "";
          }} />
        </label>
        <small>Użyj pliku przykładowego. Zapisujemy opis pliku, a jego treść pozostaje na urządzeniu.</small>
      </div>}
      {fileError && <MostNotice tone="warning" live>{fileError}</MostNotice>}
      {work.documentRequest === "pending" && <MostNotice live>Czeka na dokument od Ewy.</MostNotice>}
      {scope.attachments && work.documentRequest === "shared" && <button className="most-button most-secondary" disabled={locked || work.attachment === "owner"} onClick={() => void session.act({ type: "attach", source: "owner" })}>Dołącz dokument Ewy</button>}
      {!scope.attachments && <p className="most-muted">Za dołączenie dokumentu odpowiada Ewa.</p>}
      {!owner && scope.requestDocument && !work.documentRequest && !work.attachment && <button className="most-button most-secondary" disabled={locked} onClick={() => void session.act({ type: "request" })}>Poproś Ewę o dokument</button>}
    </section>
    <section className="most-draft">
      <h2>3. Przygotuj uzasadnienie</h2>
      <p className="most-muted">{work.reason ? "Uzasadnienie zapisane." : "Wyjaśnij, w jaki sposób załącznik uzupełnia wezwanie."}</p>
      {scope.response && <form className="most-editor" onSubmit={async (e) => {
        e.preventDefault();
        if (await session.act({ type: "response", reason })) editReason(undefined);
      }}>
        <label>Uzasadnienie<textarea aria-label="Uzasadnienie" rows={3} value={reason} onChange={(e) => changeReason(e.target.value)} maxLength={1400} required /></label>
        <button type="button" className="most-inline" onClick={() => changeReason(!owner && view.invitation?.managed
          ? "W imieniu właścicielki sprawy przekazuję kopię umowy najmu potwierdzającą jej prawo do lokalu."
          : sampleReason)}>Wstaw propozycję uzasadnienia</button>
        <button className="most-button most-secondary" disabled={locked || !reason.trim()}>Zapisz uzasadnienie</button>
      </form>}
      {!scope.response && <p className="most-muted">To zadanie pozostaje po stronie Ewy.</p>}
    </section>
    <MostNotice tone={view.complete ? "success" : "info"} live><Check size={16} /> {view.complete ? "Pakiet jest kompletny." : "Pakiet wymaga uzupełnienia."}</MostNotice>
    {helperFormId && <form id={helperFormId} className="most-editor" onSubmit={async (event) => {
      event.preventDefault();
      if (locked || readingFile) return;
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      if (submitter instanceof HTMLButtonElement && submitter.value === "save-draft") {
        if (await session.act({ type: "saveDraft", ...draft() })) {
          editAddress(undefined);
          editReason(undefined);
          onDraftSaved?.(true);
        }
      } else void session.act({ type: "review", ...draft() });
    }} />}
  </>;
}
