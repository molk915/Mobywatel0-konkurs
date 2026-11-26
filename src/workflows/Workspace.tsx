import { useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Download, FileText, House, Sparkles } from "lucide-react";
import { fineDueDate, formatWorkflowDay, workflowDetails, workflowStatus, type PaymentMethod, type WorkflowCase, type WorkflowInput, type WorkflowKind } from "./model";
import { useWorkflows } from "./session";
import { MostLayout } from "../most/components";
import { helperDashboardUrl } from "../most/session";
import "./workflows.css";

const paymentMethods: Record<PaymentMethod, string> = { blik: "BLIK", card: "Karta", "test-failure": "Płatność testowo odrzucona" };
const date = (at: string) => new Date(at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
const moveKinds = ["registration", "tax-address"] as const;
const actionTitle = (item: WorkflowCase) => item.receipt ? "Otwórz potwierdzenie" : item.status === "prepared" ? "Sprawdź i zatwierdź" : workflowDetails[item.kind].action;

export function WorkflowCard({ item, open }: { item: WorkflowCase; open: () => void }) {
  const info = workflowDetails[item.kind];
  return <button className="inbox-item" onClick={open}>
    <span className={"inbox-symbol " + (item.receipt ? "green" : "blue")}>{item.receipt ? <Check size={20} /> : <FileText size={20} />}</span>
    <span>
      <strong>{info.title}</strong>
      <small>{"amount" in info ? (item.paymentAmount ?? info.amount) + " · " : ""}{workflowStatus[item.status]} · demo{item.delegated ? " · udostępniona" : ""}</small>
      <b className="case-cta">{actionTitle(item)} <ArrowRight size={14} /></b>
    </span>
  </button>;
}

export function MovePicker({ items, open }: { items: WorkflowCase[]; open: (kind: WorkflowKind) => void }) {
  return <div className="layer-body flow-body workflow-body">
    <h1>Przeprowadzam się</h1>
    <p className="lead">Wybierz formalność, którą chcesz załatwić. Każde zgłoszenie otrzyma własne potwierdzenie w systemie demo.</p>
    {moveKinds.map((kind) => {
      const existing = items.find((item) => item.kind === kind);
      return existing ? <WorkflowCard key={kind} item={existing} open={() => open(kind)} />
        : <button key={kind} className="inbox-item" onClick={() => open(kind)}>
          <span className="inbox-symbol blue"><House size={20} /></span>
          <span><strong>{workflowDetails[kind].action}</strong><small>{workflowDetails[kind].description}</small></span>
          <ArrowRight size={17} />
        </button>;
    })}
  </div>;
}

export function WorkflowWorkspace({ kind, applicant, city, session, onAssistant, onBack, onResult, trustedToken, onTrust, inline = false, delegated = false }: {
  kind: WorkflowKind;
  applicant: string;
  city?: string;
  session: ReturnType<typeof useWorkflows>;
  onAssistant?: () => void;
  onBack: () => void;
  onResult: (item: WorkflowCase) => void;
  inline?: boolean;
  trustedToken?: string | null;
  onTrust?: () => void;
  delegated?: boolean;
}) {
  const item = session.items.find((candidate) => candidate.kind === kind);
  const previousAddress = session.items.find((candidate) => moveKinds.some((k) => k === candidate.kind) && candidate.input)?.input;
  const details = workflowDetails[kind];
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [approval, setApproval] = useState<{ challenge: string; revision: number }>();
  const working = useRef(false);
  const body = useRef<HTMLDivElement>(null);
  const formId = useId();
  const Heading = inline ? "h2" : "h1";
  const hasPayment = "amount" in details;
  const prepared = item?.status === "prepared" && !editing;
  const canPrepare = session.permissions?.prepare ?? true;
  const canConfirm = session.permissions?.confirm ?? true;
  const awaitsHelper = !delegated && item?.approval === "draft";
  const preparesForOwner = delegated && session.permissions?.mode === "owner";
  const confirmFirst = session.permissions?.mode === "confirm" && approval?.revision !== item?.revision;
  const data = item?.input ?? previousAddress;
  useLayoutEffect(() => {
    if (body.current) body.current.scrollTop = 0;
  }, [prepared, paying, item?.status]);

  async function execute(command: Parameters<typeof session.act>[0]) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await session.act(command);
      if (command.type === "confirm" && result?.receipt) onResult(result);
      if (command.type === "prepare" || command.type === "confirm") {
        setEditing(false);
        setPaying(true);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sprawa jest chwilowo niedostępna.");
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  async function confirm(revision: number) {
    if (!confirmFirst) {
      await execute({ type: "confirm", id: kind, revision, challenge: approval?.challenge });
      setApproval(undefined);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const challenge = await session.authorize(kind, revision);
      if (challenge) setApproval({ challenge, revision });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Potwierdzenie jest niedostępne.");
    } finally { setBusy(false); }
  }

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "");
    const input: WorkflowInput = hasPayment ? { method: field("method") as PaymentMethod } : {
      street: field("street"), postalCode: field("postalCode"), city: field("city"),
      ...(kind === "registration" ? { basis: field("basis") as "lease" | "ownership" } : { office: field("office") }),
    };
    void execute({ type: "prepare", id: kind, revision: item?.revision ?? 0, input });
  }

  const receipt = item?.receipt;
  const submitted = item?.input;
  const recipient = "recipient" in details ? details.recipient
    : submitted && "street" in submitted ? submitted.office ?? "Urząd gminy · " + submitted.city : undefined;
  return <>
    <div className={inline ? "workflow-body" : "layer-body flow-body workflow-body"} ref={body}>
      <div className="workflow-badge"><span /> Tryb demonstracyjny</div>
      <Heading>{receipt ? workflowStatus[item.status] : prepared ? "Sprawdź podsumowanie" : details.title}</Heading>
      {delegated && <p className="lead">Działasz w imieniu: {applicant}.{hasPayment && canConfirm ? " Płatność demo korzysta z metody pomocnika." : ""}</p>}
      {!session.ready && <div role="status">
        <p>{session.error ?? "Łączenie z systemem demonstracyjnym…"}</p>
        {session.error && <button className="text-button" onClick={session.retry}>Połącz ponownie</button>}
      </div>}
      {item?.approval === "requested" && <p className="most-notice success" role="status">
        {delegated ? "Przekazano do zatwierdzenia." : "Osoba zaufana przekazała szkic do zatwierdzenia."}
      </p>}
      {item?.approval === "draft" && <p className="most-notice" role="status">
        {delegated ? "Szkic zapisany." : "Osoba zaufana pracuje nad szkicem. Zobaczysz zgłoszenie do zatwierdzenia po przekazaniu."}
      </p>}
      {session.ready && hasPayment && !item && <p>Ta sprawa jest niedostępna w tym profilu.</p>}
      {hasPayment && item && <>
        <div className="workflow-amount">{item.paymentAmount ?? details.amount}</div>
        {(prepared || receipt || (!paying && !editing && item.status !== "failed")) && <dl className="data-list">
          <div><dt>Sprawa</dt><dd>{details.title}</dd></div>
          <div><dt>Numer sprawy</dt><dd>{item.paymentReference ?? details.reference}</dd></div>
          {"description" in details && <>
            {!prepared && !receipt && <div><dt>Powód</dt><dd>{details.description}</dd></div>}
            {!prepared && !receipt && <div><dt>Data wystawienia</dt><dd>{formatWorkflowDay(item.createdAt)}</dd></div>}
            <div><dt>Termin płatności</dt><dd>{formatWorkflowDay(fineDueDate(item.createdAt))}</dd></div>
          </>}
          <div><dt>Odbiorca</dt><dd>{recipient}</dd></div>
          {(prepared || receipt) && submitted && "method" in submitted && <div><dt>Metoda</dt><dd>{paymentMethods[submitted.method]}</dd></div>}
        </dl>}
      </>}
      {!hasPayment && (prepared || receipt) && submitted && "street" in submitted && <dl className="data-list workflow-review-data">
        <div><dt>Wnioskodawca</dt><dd>{applicant}</dd></div>
        <div><dt>Nowy adres</dt><dd>{submitted.street}, {submitted.postalCode} {submitted.city}</dd></div>
        <div><dt>Odbiorca</dt><dd>{recipient}</dd></div>
        {submitted.basis && <div><dt>Załącznik demonstracyjny</dt><dd>{submitted.basis === "lease" ? "Kopia umowy najmu" : "Potwierdzenie własności"}</dd></div>}
      </dl>}
      {error && <p role="alert" className="most-notice warning">{error}</p>}
      {item?.status === "failed" && <p role="alert" className="most-notice warning">Płatność testowa została odrzucona. Wybierz BLIK albo kartę i spróbuj ponownie.</p>}
      {receipt ? <>
        <section className="workflow-receipt">
          <Check size={22} aria-hidden="true" />
          <div><h2>Potwierdzenie demonstracyjne</h2><p>{receipt.number} · {date(receipt.at)}</p>
            {item.performedBy === "trusted" && <p>Wykonane przez osobę zaufaną</p>}</div>
        </section>
        <a className="most-inline" download={receipt.number + ".txt"}
          href={"data:text/plain;charset=utf-8," + encodeURIComponent(
            ["Potwierdzenie demonstracyjne", receipt.number, date(receipt.at), details.title, recipient, workflowStatus[item.status],
              hasPayment ? item.paymentAmount ?? details.amount : ""].join("\n"),
          )}><Download size={17} /> Pobierz potwierdzenie</a>
      </> : session.ready && (!hasPayment || item) && <>
        {canPrepare && (!hasPayment || paying || item?.status === "failed" || editing) ? !prepared &&
          <form className="workflow-form" id={formId} onSubmit={prepare}>
            {hasPayment ? <fieldset>
              <legend>Metoda demonstracyjna</legend>
              {(Object.entries(paymentMethods) as [PaymentMethod, string][]).map(([method, label]) =>
                <label className="workflow-option" key={method}><input type="radio" name="method" value={method} required
                  defaultChecked={data && "method" in data && data.method === method} />{label}</label>)}
              <small>Bez podawania kodu BLIK i danych karty.</small>
            </fieldset> : <>
              <p className="lead">{details.description}</p>
              <label>Wnioskodawca<input value={applicant} readOnly /></label>
              <label>Ulica i numer<input name="street" required minLength={4} maxLength={100} defaultValue={data && "street" in data ? data.street : ""} /></label>
              <label>Kod pocztowy<input name="postalCode" placeholder="00-000" pattern="[0-9]{2}-[0-9]{3}" required defaultValue={data && "street" in data ? data.postalCode : ""} /></label>
              <label>Miejscowość<input name="city" required minLength={2} maxLength={60} defaultValue={data && "street" in data ? data.city : city ?? ""} /></label>
              {kind === "registration" ? <label>Dokument potwierdzający prawo do lokalu
                <select name="basis" required defaultValue={data && "street" in data ? data.basis ?? "" : ""}>
                  <option value="">Wybierz dokument</option><option value="lease">Kopia umowy najmu</option>
                  <option value="ownership">Potwierdzenie własności</option>
                </select>
              </label> : <label>Właściwy urząd skarbowy<input name="office" required minLength={4} maxLength={120} defaultValue={data && "street" in data ? data.office : ""} /></label>}
            </>}
          </form> : null}
        {prepared && canConfirm && <p className="lead">{hasPayment ? "To płatność próbna. Żadne pieniądze nie zostaną pobrane."
          : "Zgłoszenie zostanie zapisane w prototypie. Nie trafi do urzędu."}</p>}
        {prepared && !canConfirm && <p className="lead">Końcową operację zatwierdza właściciel sprawy.</p>}
      </>}
      {item && item.history.length > 0 && <details className="workflow-history">
        <summary>Historia operacji</summary>
        <ol>{[...item.history].reverse().map((entry, index) => <li key={index}>{workflowStatus[entry.status]} · {date(entry.at)}</li>)}</ol>
      </details>}
      {onTrust && session.ready && (!receipt || item?.delegated || item?.managedAccess) && (!hasPayment || item) &&
        <details className="workflow-history">
          <summary>Przekaż przez ePełnomocnictwo</summary>
          <p>Osoba zaufana otrzyma dostęp do tej sprawy i będzie mogła {hasPayment ? "zatwierdzić płatność demonstracyjną" : "uzupełnić i wysłać zgłoszenie demonstracyjne"}.</p>
          {item?.managedAccess ? <button className="most-button most-secondary" onClick={onTrust}>Zarządzaj w Centrum kontroli</button> : item?.delegated
            ? <button className="most-button most-secondary" disabled={busy} onClick={() => void execute({ type: "revoke", id: kind })}>Cofnij ePełnomocnictwo</button>
            : trustedToken
              ? <button className="most-button most-primary" disabled={busy} onClick={() => void execute({ type: "grant", id: kind, trustedToken })}>Upoważnij osobę zaufaną</button>
              : <button className="most-button most-secondary" onClick={onTrust}>Połącz osobę zaufaną przez QR</button>}
        </details>}
      {onAssistant && <button className="process-assistant" onClick={onAssistant}><Sparkles size={20} /><span><strong>Zapytaj asystenta</strong><small>Otwórz rozmowę o tej sprawie</small></span><ArrowRight size={16} /></button>}
    </div>
    <div className={inline ? "chat-operation-actions" : "flow-footer"}>
      {busy && <p role="status">{prepared ? "Przetwarzamy operację…" : "Zapisujemy dane…"}</p>}
      {receipt ? <button className="primary" onClick={onBack}>{delegated ? "Wróć do spraw w MOST" : inline ? "Rozpocznij inną rozmowę" : "Wróć do spraw"}</button> : session.ready && (!hasPayment || item) &&
        (prepared ? <>
          {canPrepare && <button className="text-button" disabled={busy} onClick={() => setEditing(true)}>Zmień dane</button>}
          {canConfirm && <button className="primary" disabled={busy || awaitsHelper} onClick={() => void confirm(item.revision)}>
            {confirmFirst ? "Rozpocznij osobne potwierdzenie" : hasPayment ? "Potwierdź płatność" : "Wyślij zgłoszenie"} <Check size={18} />
          </button>}
          {preparesForOwner && item.approval === "draft" && <button className="primary" disabled={busy}
            onClick={() => void execute({ type: "review", id: kind, revision: item.revision })}>Przekaż do zatwierdzenia <ArrowRight size={18} /></button>}
        </> : !canPrepare ? null : hasPayment && !paying && !editing && item?.status !== "failed"
          ? <button className="primary" onClick={() => setPaying(true)}>{details.action}<ArrowRight size={18} /></button>
          : <button className="primary" type="submit" form={formId} disabled={busy}>{delegated && session.permissions ? "Zapisz szkic" : "Sprawdź podsumowanie"}<ArrowRight size={18} /></button>)}
    </div>
  </>;
}

export function DelegatedWorkflow({ token, onBack }: { token: string; onBack?: () => void }) {
  const session = useWorkflows("delegated", token);
  const item = session.items[0];
  const back = onBack ?? (() => location.assign(helperDashboardUrl));
  return <MostLayout role="helper" roleLabel="Pomagam" contextTitle="ePełnomocnictwo · demo" onBack={back}
    screen="delegated-operation" title={item ? workflowDetails[item.kind].title : "Przekazana sprawa"}>
    {item ? <WorkflowWorkspace kind={item.kind} applicant={session.applicant ?? ""} session={session}
      onBack={back} onResult={() => {}} inline delegated /> :
      <p role="status">{session.error ?? "Sprawdzamy ePełnomocnictwo…"}</p>}
  </MostLayout>;
}
