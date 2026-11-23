export const operations = {
  monitor: "Monitorowanie terminów", view: "Otwieranie dokumentu lub sprawy", download: "Pobieranie dokumentu",
  prepare: "Przygotowanie odpowiedzi lub zgłoszenia", attach: "Dodawanie załączników",
  submit: "Wysłanie w pokazie", pay: "Płatność własnymi środkami w pokazie",
} as const;
export type Operation = keyof typeof operations;
export type Mode = "owner" | "independent" | "confirm";
export type Duration = "period" | "once" | "case" | "open";
export const modeLabels = { owner: "Właściciel zatwierdza wykonanie", independent: "Pomocnik działa samodzielnie", confirm: "Końcowa operacja wymaga osobnego potwierdzenia" };
export const durationLabels = { period: "Do wskazanej daty", once: "Do pierwszego wykonania", case: "Do zakończenia sprawy", open: "Przez czas połączenia" };

export type Resource = { id: string; title: string; kind: "deadline" | "vehicle" | "document" | "letter" | "payment" | "workflow"; actions: Operation[]; group?: string };
export type Selection = { resource: string; actions: Operation[]; mode: Mode; duration: Duration; end?: string; formalRequired?: boolean };
export type Grant = Selection & { id: string; title: string; created: string; expires: number; status: "active" | "revoked" | "expired" | "completed"; href?: string; formal?: Formal; waitingForFormal?: boolean };
export type Formal = { reference: string; version: number; procedure: string; scope: string; form: string; created: string; status: "draft" | "awaiting" | "signed-demo" | "pending-demo" | "checked-demo" | "rejected-demo" | "revoked" | "expired"; method?: string; signedAt?: string;
  basis?: { label: string; href: string }; filing?: string; methods?: string[] };
export type Deadline = { id: string; title: string; date: string; days: number; source: string; category: string; done: boolean; action?: string; href?: string; editable?: boolean; helper?: string };
export type ControlEvent = { id: string; at: string; label: string; actor: string; detail?: string; resource?: string; result?: string; grant?: string };
export type ControlNotice = { id: string; at: string; title: string; read: boolean; resource?: string };
export type AccessRequest = { id: string; title: string; resource: string; at: string; status: "pending" | "accepted" | "rejected" };
export type TrustedConnection = { token: string; primary: boolean; current: boolean; name: string; status: string; lastActivity?: string };
export type ControlCase = { id: string; kind: "letter" | "payment" | "workflow"; title: string;
  stage: "new" | "draft" | "review" | "approved" | "correction" | "done"; updated?: string;
  href?: string; grantId?: string; people?: string[]; paymentAmount?: string };
export type ControlView = { role: "owner" | "helper"; revision: number; owner: string; helper: string; helperProfile?: string; connectedAt?: string; passkeyRegistered?: boolean; connections?: TrustedConnection[]; resources: Resource[]; deadlines: Deadline[]; grants: Grant[]; history: ControlEvent[]; notifications: ControlNotice[]; requests: AccessRequest[]; assignments: { title: string; href: string }[]; cases: ControlCase[] };
