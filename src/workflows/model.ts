export type WorkflowKind = "fine" | "tax" | "registration" | "tax-address";
export type WorkflowStatus = "new" | "prepared" | "failed" | "paid" | "awaiting" | "accepted";
export type PaymentMethod = "blik" | "card" | "test-failure";
export type WorkflowInput = { method: PaymentMethod } | {
  street: string;
  postalCode: string;
  city: string;
  office?: string;
  basis?: "lease" | "ownership";
};
export type WorkflowCase = {
  id: string;
  kind: WorkflowKind;
  status: WorkflowStatus;
  revision: number;
  createdAt: string;
  paymentAmount?: string;
  paymentReference?: string;
  input?: WorkflowInput;
  receipt?: { number: string; at: string };
  history: { status: WorkflowStatus; at: string }[];
  read: number[];
  delegated?: boolean;
  managedAccess?: boolean;
  approval?: "draft" | "requested";
  performedBy?: "owner" | "trusted";
};

const warsawDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw", dateStyle: "short" });
const polishDay = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "short" });

export function fineDueDate(issuedAt: string) {
  const issuedDay = Date.parse(warsawDay.format(new Date(issuedAt)));
  return new Date(issuedDay + 8 * 86_400_000).toISOString().slice(0, 10);
}

export function formatWorkflowDay(value: string) {
  return polishDay.format(new Date(value));
}

export const workflowDetails = {
  fine: {
    title: "Mandat drogowy",
    action: "Opłać mandat",
    amount: "300,00 zł",
    recipient: "Centrum rozliczeń mandatów (demo)",
    description: "Przekroczenie dozwolonej prędkości",
    reference: "DEMO-MD-2026-0300",
  },
  tax: {
    title: "Podatek od nieruchomości",
    action: "Opłać podatek",
    amount: "210,00 zł",
    recipient: "Urząd Miasta Warszawy",
    reference: "DEMO-PN-2026-0184",
  },
  registration: {
    title: "Zgłoszenie pobytu stałego",
    action: "Zgłoś zameldowanie",
    description: "Scenariusz z własnym tytułem prawnym do lokalu. Potrzebny jest dokument potwierdzający ten tytuł.",
  },
  "tax-address": {
    title: "Aktualizacja adresu w urzędzie skarbowym",
    action: "Zaktualizuj adres (ZAP-3)",
    description: "Scenariusz dla osoby identyfikowanej numerem PESEL, która może zaktualizować adres formularzem ZAP-3.",
  },
} as const;

export const workflowStatus: Record<WorkflowStatus, string> = {
  new: "Do zrobienia",
  prepared: "Gotowe do zatwierdzenia",
  failed: "Płatność nieudana",
  paid: "Opłacony",
  awaiting: "Zgłoszenie przyjęte · oczekuje na rozpatrzenie",
  accepted: "Aktualizacja przyjęta w systemie demo",
};

export type WorkflowAction = "fine" | "tax" | "move" | "letter" | "help" | "cases";
export const workflowActions: WorkflowAction[] = ["fine", "tax", "move", "letter", "help", "cases"];
