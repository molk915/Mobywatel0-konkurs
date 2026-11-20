export const mostTitle = "Pismo z urzędu";
export const formatMostDeadline = (at?: number) => at === undefined ? "Ustalany przy otwarciu" :
  new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeZone: "Europe/Warsaw" }).format(at);
export const mostSummary = "Urząd prosi Ewę o kopię dokumentu potwierdzającego prawo do lokalu.";
export const sampleAddress = "ul. Lipowa 12/4, 20-020 Lublin";
export const sampleReason = "Uzupełniam wezwanie. Dołączona kopia umowy najmu potwierdza moje prawo do wskazanego lokalu.";
export const initialScope = { document: true, reference: false, form: true, response: true, attachments: true, requestDocument: true, comments: true };
export type MostScope = typeof initialScope;
export type MostRole = "owner" | "helper";
export type MostDocument = { title: string; office: string; body: string; reference?: string; pesel?: string };
export type MostInvitation = {
  expiresAt: number; scope: MostScope; status: "waiting" | "active" | "revoked" | "expired"; online: boolean; token?: string;
};
export type AttachmentSource = "helper" | "owner";
export type MostAttachment = { name: string; text: string };
export type MostPackage = { address?: string; reason?: string; attachment?: AttachmentSource; reviewId?: number; feedback?: string; documentRequest?: "pending" | "shared" };
export type MostStatus = "new" | "preparing" | "document" | "review" | "correction" | "finished" | "rejected";
export const statusLabels: Record<MostStatus, string> = {
  new: "Wymaga Twojej uwagi", preparing: "Przygotowanie sprawy", document: "Potrzebny dokument od Ewy",
  review: "Czeka na zatwierdzenie Ewy", correction: "Do poprawy", finished: "Pakiet zatwierdzony", rejected: "Projekt odrzucony",
};
export const eventLabels = {
  letter: "Masz nowe pismo z urzędu", reminder: "Zbliża się termin uzupełnienia wezwania", invite: "Ewa poprosiła Cię o pomoc",
  join: "Kacper otworzył sprawę", form: "Uzupełniono formularz", response: "Przygotowano uzasadnienie",
  attach: "Dołączono dokument", request: "Kacper potrzebuje dokumentu", share: "Ewa udostępniła kopię umowy",
  review: "Kacper przygotował sprawę do zatwierdzenia", correction: "Ewa poprosiła o poprawę",
  accept: "Ewa zatwierdziła pakiet dokumentów", reject: "Ewa odrzuciła projekt",
  comment: "Dodano komentarz", revoke: "Dostęp do sprawy został zakończony", expiry: "Dostęp do sprawy wygasł",
};
export type MostEvent = { id: number; at: string; role: MostRole; type: keyof typeof eventLabels; scope?: MostScope; detail?: string };
export type MostNotification = Pick<MostEvent, "id" | "at" | "type"> & { read: boolean };
export type MostComment = { id: number; role: MostRole; text: string };
export type MostView = {
  deadlineAt: number;
  role: MostRole; revision: number; document?: MostDocument; invitation: MostInvitation | null;
  status: MostStatus; work: MostPackage; complete: boolean; canReview: boolean;
  files: Partial<Record<AttachmentSource, MostAttachment>>;
  comments: MostComment[]; history: MostEvent[]; notifications: MostNotification[];
};
export type MostCommand =
  | { type: "invite"; scope: MostScope }
  | { type: "form"; address: string }
  | { type: "response"; reason: string }
  | { type: "attach"; source: AttachmentSource }
  | { type: "comment"; text: string }
  | { type: "accept" | "reject"; reviewId: number }
  | { type: "correction"; reviewId: number; text: string }
  | { type: "read"; id: number }
  | { type: "request" | "share" | "review" | "revoke" | "reset" };

export const scopeLabels: Record<keyof MostScope, string> = {
  document: "Treść tego pisma", reference: "Numer pisma", form: "Uzupełnianie formularza",
  response: "Przygotowanie uzasadnienia", attachments: "Dołączanie dokumentu",
  requestDocument: "Proszenie o dokument Ewy", comments: "Komentarze",
};
