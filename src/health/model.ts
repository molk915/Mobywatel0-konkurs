export type HealthProfile = "ewa" | "aleksandra" | "kacper";
export type HealthStatus = "new" | "preparing" | "review" | "correction" | "declined" | "confirmed";
export type HealthSection = "home" | "timeline" | "prescriptions" | "referrals" | "results" | "visits" | "access" | "assistant" | "invite" | "plan" | "review" | "inbox" | "share";
export type HealthResource = { section: "results" | "visits"; id: string };
export type HealthTarget = { section: HealthSection; id?: string; origin?: HealthResource["section"] };
export type HealthRecord = {
  id: string;
  title: string;
  date: string;
  place: string;
  detail: string;
  kind: "visit" | "consultation" | "hospital" | "test" | "procedure" | "prescription";
  state?: "active" | "filled" | "archived";
  specialty?: string;
  directions?: string;
  code?: string;
  document?: string;
};
export type HealthReferral = { id: string; title: string; date: string; deadline: string; place: string; detail: string; status: HealthStatus };
export type VisitPlan = { slot: string; contact: "telefon-demo" | "aplikacja-demo"; checklist: string[] };
export type HealthGrant = { id: number; referralId?: string; resource?: HealthResource; title?: string; status: "waiting" | "active" | "revoked" | "expired"; expires: string; details: boolean; prepare: boolean; token?: string };
export type HealthNotification = { id: number; title: string; at: string; read: boolean; target: HealthTarget };
export type HealthEvent = { id: number; at: string; label: string; actor: "Ewa" | "Kacper" | "Właściciel" | "System demo"; referralId?: string; detail?: string };
export type HealthCase = {
  status: HealthStatus; referral: HealthReferral; plan?: VisitPlan; feedback?: string; reviewId?: number; shared: boolean;
  appointment?: { place: string; time: string };
  reminderAt?: string;
};
export type HealthVisit = { id: string; referralId: string; title: string; place: string; time: string; checklist: string[] };
export type HealthView = {
  role: "owner" | "helper";
  revision: number;
  profile?: HealthProfile;
  records?: HealthRecord[];
  upcoming?: HealthVisit[];
  sharedRecord?: HealthRecord;
  sharedVisit?: HealthVisit;
  cases: HealthCase[];
  slots: { id: string; place: string; time: string }[];
  grants: HealthGrant[];
  history: HealthEvent[];
  notifications: HealthNotification[];
};
export type HealthCommand =
  | { type: "invite"; id: string; minutes: number; details: boolean; prepare: boolean }
  | { type: "revoke"; grant: number }
  | { type: "share"; resource: HealthResource; minutes: number }
  | { type: "remind"; id: string; enabled: boolean }
  | { type: "save" | "submit" | "book"; id: string; plan: VisitPlan }
  | { type: "approve" | "correct" | "reject"; id: string; reviewId: number; feedback?: string }
  | { type: "read"; id: number }
  | { type: "simulate"; event: "prescription" | "result" | "referral" }
  | { type: "reset" };

export const healthCaption: Record<HealthStatus, string> = {
  new: "Nowe skierowanie",
  preparing: "Kacper przygotowuje wizytę",
  review: "Czeka na Twoją decyzję",
  correction: "Do poprawy przez Kacpra",
  declined: "Projekt odrzucony",
  confirmed: "Wizyta zaplanowana",
};
export const checklistItems = [
  ["referral", "Sprawdź dane skierowania"],
  ["documents", "Przygotuj dokument tożsamości"],
  ["questions", "Zapisz pytania do lekarza"],
] as const;

export const healthDate = (date: string, time = false) => new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium", ...(time ? { timeStyle: "short" } : {}), timeZone: "Europe/Warsaw",
}).format(new Date(date));
