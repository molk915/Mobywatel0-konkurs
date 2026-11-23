export const mostTitle = "Pismo z urzędu";
export const formatMostDeadline = (at?: number) => at === undefined ? "Ustalany przy otwarciu" :
  new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeZone: "Europe/Warsaw" }).format(at);
export const mostSummary = "Urząd prosi Ewę o kopię dokumentu potwierdzającego prawo do lokalu.";
export const sampleAddress = "ul. Lipowa 12/4, 20-020 Lublin";
export const sampleReason = "Uzupełniam wezwanie. Dołączona kopia umowy najmu potwierdza moje prawo do wskazanego lokalu.";
export const initialScope = { document: true, reference: false, form: true, response: true, attachments: true, requestDocument: true, comments: true };
export type MostScope = typeof initialScope;
export type MostRole = "owner" | "helper";
export const delegationTitles = {
  move: "Przeprowadzka", wallet: "Ochrona po utracie portfela", letter: "Odpowiedź na pismo",
  vehicle: "Badanie pojazdu", passport: "Paszport dziecka", license: "Wymiana prawa jazdy",
  library: "Karta biblioteczna", school: "Zaświadczenie ze szkoły", registration: "Rejestracja samochodu",
  parking: "Abonament parkingowy", certificate: "Odpis aktu urodzenia", trusted: "Osoba zaufana",
} as const;
export type DelegationContext = { kind: keyof typeof delegationTitles; step?: number };
export type DelegationAssignment = { title: string; token: string; workflow?: boolean; legacy?: boolean };
export type MostDocument = { title: string; office: string; body: string; reference?: string; pesel?: string };
export type MostInvitation = {
  expiresAt: number; scope: MostScope; status: "waiting" | "active" | "revoked" | "expired"; online: boolean; token?: string;
  maySubmit?: boolean; managed?: boolean; confirmationMode?: "owner" | "independent" | "confirm";
};
export type AttachmentSource = "helper" | "owner" | "upload";
export type MostAttachment = { name: string; text: string };
export type FileDescriptor = { name: string; mime: string; size: number; digest: string };
export type MostPackage = { address?: string; reason?: string; attachment?: AttachmentSource; upload?: FileDescriptor; reviewId?: number; feedback?: string; documentRequest?: "pending" | "shared" };
export type SubmittedPackage = Required<Pick<MostPackage, "address" | "reason" | "attachment">> & Pick<MostPackage, "upload">;
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
  send: "Wysłano odpowiedź w pokazie",
  saveDraft: "Zapisano szkic odpowiedzi", resumeDraft: "Przejęto szkic do uzupełnienia",
};
export type MostEvent = { id: number; at: string; role: MostRole; type: keyof typeof eventLabels; scope?: MostScope; detail?: string };
export type MostNotification = Pick<MostEvent, "id" | "at" | "type"> & { read: boolean };
export type MostComment = { id: number; role: MostRole; text: string };
export type MostView = {
  deadlineAt: number;
  sentAt?: string;
  receipt?: { number: string; at: string };
  role: MostRole; revision: number; document?: MostDocument; invitation: MostInvitation | null;
  status: MostStatus; work: MostPackage; complete: boolean; canReview: boolean;
  previousPackage?: SubmittedPackage;
  delegation?: DelegationContext;
  assignments?: DelegationAssignment[];
  files: Partial<Record<AttachmentSource, MostAttachment>>;
  comments: MostComment[]; history: MostEvent[]; notifications: MostNotification[];
};
export type MostCommand =
  | { type: "invite"; scope: MostScope; trustedOwnerToken?: string; step?: number; maySubmit?: boolean; demoHelper?: "kacper" }
  | { type: "form"; address: string }
  | { type: "response"; reason: string }
  | { type: "attach"; source: "helper" | "owner" }
  | { type: "upload"; file: FileDescriptor }
  | { type: "send"; reviewId?: number; challenge?: string }
  | { type: "authorizeSend"; reviewId: number }
  | { type: "comment"; text: string }
  | { type: "accept" | "reject"; reviewId: number }
  | { type: "correction"; reviewId: number; text: string }
  | { type: "read"; id: number }
  | { type: "join"; profile?: string }
  | { type: "saveDraft"; draft: LetterDraft; expectedDraft?: LetterDraft }
  | { type: "review"; draft?: LetterDraft; expectedDraft?: LetterDraft }
  | { type: "resumeDraft"; reviewId: number }
  | { type: "request" | "share" | "revoke" | "reset" | "openDocument" };

export type LetterDraft = { address?: string; reason?: string };

export const delegationScope: MostScope = {
  document: false, reference: false, form: false, response: true,
  attachments: false, requestDocument: false, comments: false,
};

export const scopeLabels: Record<keyof MostScope, string> = {
  document: "Treść tego pisma", reference: "Numer pisma", form: "Uzupełnianie formularza",
  response: "Przygotowanie uzasadnienia", attachments: "Dołączanie dokumentu",
  requestDocument: "Proszenie o dokument Ewy", comments: "Komentarze",
};
