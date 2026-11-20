import { useState } from "react";
import { Check, FileText, ArrowUpRight, Download, Plus } from "lucide-react";
import { movingOperations, type FormData, type Operation } from "./domain";
import { saveAttachment, downloadAttachment } from "./attachments";
export function MovePlan({ data }: { data: FormData }) {
  return (
    <section className="move-plan">
      <h3>Twój pakiet formalności</h3>
      {movingOperations(data, "PODGLĄD").map((o) => (
        <div key={o.id}>
          <strong>{o.title}</strong>
          <span>{o.recipient}</span>
          <p>{o.scope}</p>
          <small>
            {o.status === "needs-document"
              ? "Potrzebne potwierdzenie prawa do lokalu"
              : o.status === "manual"
                ? "Krok do wykonania poza prototypem"
                : "Gotowe do symulowanego przyjęcia"}
          </small>
        </div>
      ))}
      <p>
        Potwierdzenie obejmuje wyłącznie wybrane formalności. Żadne dane nie są
        wysyłane.
      </p>
    </section>
  );
}
export function MoveOutcomes({
  operations,
  onSupply,
  onManual,
}: {
  operations: Operation[];
  onSupply: (key: string, name: string) => void;
  onManual: (id: string) => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function attach(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const key = await saveAttachment(file);
      onSupply(key, file.name);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Nie udało się zapisać dokumentu.",
      );
    } finally {
      setBusy(false);
    }
  }
  const accepted = operations.filter(
    (o) => o.status === "accepted" || o.status === "manual-done",
  ).length;
  return (
    <section className="move-outcomes">
      <div className="outcomes-title">
        <h2>Wyniki formalności</h2>
        <span>
          {accepted}/{operations.length} kroków gotowych
        </span>
      </div>
      <div className="outcomes-progress">
        <i style={{ width: (accepted / operations.length) * 100 + "%" }} />
      </div>
      {operations.map((o) => (
        <article id={'operation-'+o.id} className={"operation " + o.status} key={o.id}>
          <div className="operation-top">
            <span>
              {o.status === "accepted" || o.status === "manual-done" ? (
                <Check size={19} />
              ) : o.status === "manual" ? (
                <ArrowUpRight size={19} />
              ) : (
                <FileText size={19} />
              )}
            </span>
            <div>
              <h3>{o.title}</h3>
              <small>{o.recipient}</small>
            </div>
          </div>
          <b className="operation-status">
            {o.status === "accepted"
              ? "Przyjęto w symulacji"
              : o.status === "manual-done"
                ? "Potwierdzone przez Ciebie"
                : o.status === "needs-document"
                  ? "Czeka na dokument"
                  : "Do samodzielnego wykonania"}
          </b>
          <p>
            {o.status === "needs-document"
              ? "Uzupełnij lokalny załącznik, aby dokończyć pokaz zameldowania."
              : o.status === "manual-done"
                ? "Oznaczyłeś ten krok jako wykonany poza aplikacją. To Twoje potwierdzenie, nie odpowiedź urzędu."
                : o.status === "manual"
                  ? "Sprawdź wymagania właściwego wydziału. Ten krok pozostaje poza zakresem symulacji."
                  : "Zapisaliśmy osobne potwierdzenie tej formalności. Nie wysłano danych do urzędu."}
          </p>
          <details>
            <summary>Zakres danych i potwierdzenie</summary>
            <p>{o.scope}</p>
            <code>{o.reference}</code>
          </details>
          {o.status === "manual" && (
            <button className="secondary" onClick={() => onManual(o.id)}>
              Oznacz krok jako wykonany
            </button>
          )}
          {o.status === "needs-document" && (
            <>
              <label className="secondary upload-label">
                <Plus size={17} />
                Dołącz dokument lokalnie
                <input
                  type="file"
                  accept=".pdf,.txt,.jpg,.jpeg,.png"
                  disabled={busy}
                  onChange={(e) => {
                    attach(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  attach(
                    new File(
                      [
                        "DEMO — fikcyjne potwierdzenie prawa do lokalu. Wyłącznie do prezentacji.",
                      ],
                      "Tytul_do_lokalu_DEMO.txt",
                      { type: "text/plain" },
                    ),
                  )
                }
              >
                Użyj przykładowego dokumentu
              </button>
            </>
          )}
          {o.attachmentKey && (
            <button
              className="text-button"
              onClick={() =>
                downloadAttachment(o.attachmentKey!, o.attachmentName!).catch(
                  (e) => setError(e.message),
                )
              }
            >
              <Download size={16} />
              {o.attachmentName}
            </button>
          )}
        </article>
      ))}
      {busy && <p role="status">Zapisuję załącznik na urządzeniu…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
