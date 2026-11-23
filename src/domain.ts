export type CaseKind = "move" | "wallet" | "letter";
export type Tab = "home" | "documents" | "cases" | "services" | "privacy";
export type FormData = Record<string, string>;
export type Draft = { kind: CaseKind; step: number; data: FormData };
export const demoTax = { title: "Podatek od nieruchomości", amount: "210,00 zł", recipient: "Urząd Miasta Warszawy", reference: "DEMO-PN-2026-0184" };
export type Receipt = {
  id: string;
  kind: CaseKind;
  at: string;
  data: FormData;
  followups: string[];
  operations?: Operation[];
  events?: { at: string; label: string }[];
};
export type Operation = {
  id: string;
  title: string;
  recipient: string;
  scope: string;
  status: "accepted" | "needs-document" | "ready-to-send" | "manual" | "manual-done";
  reference: string;
  attachmentKey?: string;
  attachmentName?: string;
};
export function movingOperations(data: FormData, id: string): Operation[] {
  return [
    {
      key: "meldunek",
      title: "Zameldowanie",
      recipient: "Urząd miasta · demo",
      scope:
        "Imię, nazwisko, adres, data pobytu i potwierdzenie prawa do lokalu",
      status: "needs-document",
    },
    {
      key: "tax",
      title: "Aktualizacja adresu podatkowego",
      recipient: "Urząd skarbowy · demo",
      scope: "Imię, nazwisko i nowy adres",
      status: "accepted",
    },
    {
      key: "car",
      title: "Dane właściciela pojazdu",
      recipient: "Wydział komunikacji · demo",
      scope: "Adres właściciela i wybrany pojazd",
      status: "manual",
    },
  ]
    .filter((o) => data[o.key] === "true")
    .map((o) => ({
      id: o.key,
      title: o.title,
      recipient: o.recipient,
      scope: o.scope,
      status: o.status as Operation["status"],
      reference: id + "/" + o.key.toUpperCase(),
    }));
}
export function supplyMovingDocument(
  c: CitizenState,
  receiptId: string,
  key: string,
  name: string,
): CitizenState {
  const receipt = c.receipts.find((r) => r.id === receiptId);
  const op = receipt?.operations?.find((o) => o.id === "meldunek");
  if (!op || op.status !== "needs-document" || !key || !name)
    throw new Error("Nie można uzupełnić tej formalności.");
  return {
    ...c,
    receipts: c.receipts.map((r) =>
      r.id !== receiptId
        ? r
        : {
            ...r,
            events: [
              ...(r.events || [
                { at: r.at, label: "Przygotowano pakiet demonstracyjny" },
              ]),
              {
                at: new Date().toISOString(),
                label: "Dodano dokument lokalny: " + name,
              },
            ],
            operations: r.operations!.map((o) =>
              o.id !== "meldunek"
                ? o
                : {
                    ...o,
                    status: "ready-to-send",
                    attachmentKey: key,
                    attachmentName: name,
                  },
            ),
          },
    ),
  };
}
export function sendMovingDocument(c: CitizenState, receiptId: string): CitizenState {
  const receipt = c.receipts.find((r) => r.id === receiptId);
  const op = receipt?.operations?.find((operation) => operation.id === "meldunek");
  if (!receipt || op?.status !== "ready-to-send" || !op.attachmentKey || !op.attachmentName) return c;
  const at = new Date().toISOString();
  return {
    ...c,
    receipts: c.receipts.map((r) => r !== receipt ? r : {
      ...r,
      operations: r.operations?.map((o) => o === op ? { ...o, status: "accepted" } : o),
      events: [...(r.events ?? []), { at, label: "Wysłano zgłoszenie zameldowania w symulacji" }],
    }),
    access: [{ id: receiptId + "-document", who: op.recipient, purpose: "Zgłoszenie zameldowania · symulacja",
      scope: "Nazwa lokalnego załącznika: " + op.attachmentName, at, active: true, revocable: false }, ...c.access],
  };
}
export function receiptNeedsAction(r: Receipt): boolean {
  return !!r.operations?.some(
    (o) => o.status === "needs-document" || o.status === "ready-to-send" || o.status === "manual",
  );
}
export function receiptNextStep(r: Receipt): string {
  return r.operations?.some((o) => o.status === "needs-document")
    ? "Czeka na dokument"
    : r.operations?.some((o) => o.status === "ready-to-send") ? "Wyślij zgłoszenie zameldowania"
    : r.operations?.some((o) => o.status === "manual")
      ? "Krok do wykonania samodzielnie"
      : "Pakiet gotowy";
}
export function confirmManualOperation(
  c: CitizenState,
  receiptId: string,
  operationId: string,
): CitizenState {
  const operation = c.receipts
    .find((r) => r.id === receiptId)
    ?.operations?.find((o) => o.id === operationId);
  if (!operation || operation.status !== "manual")
    throw new Error("Ten krok nie oczekuje na Twoje potwierdzenie.");
  return {
    ...c,
    receipts: c.receipts.map((r) =>
      r.id !== receiptId
        ? r
        : {
            ...r,
            events: [
              ...(r.events || [
                { at: r.at, label: "Przygotowano pakiet demonstracyjny" },
              ]),
              {
                at: new Date().toISOString(),
                label: "Potwierdzono samodzielnie: " + operation.title,
              },
            ],
            operations: r.operations!.map((o) =>
              o.id === operationId ? { ...o, status: "manual-done" } : o,
            ),
          },
    ),
    access: [
      {
        id: receiptId + "-" + operationId + "-manual",
        who: "Ty · lokalne potwierdzenie",
        purpose: operation.title,
        scope:
          "Potwierdzenie wykonania kroku poza prototypem; bez przekazania danych instytucji",
        at: new Date().toISOString(),
        active: true,
        revocable: false,
      },
      ...c.access,
    ],
  };
}
export type Access = {
  id: string;
  who: string;
  purpose: string;
  scope: string;
  at: string;
  expiresAt?: string;
  inactiveReason?: "expired";
  revocable: boolean;
  active: boolean;
};
export type Message = {
  role: "user" | "assistant";
  text: string;
  conversation?: string;
  action?: CaseKind;
  suggestedData?: FormData;
  caseId?: string;
  documentId?: number;
  shareDocumentId?: number;
  showPrivacy?: boolean;
  workflowAction?: import("./workflows/model.ts").WorkflowAction;
  fallback?: boolean;
};
export type CitizenState = {
  demoTaxPaidAt?: string;
  drafts: Partial<Record<CaseKind, Draft>>;
  receipts: Receipt[];
  access: Access[];
  protected: boolean;
  messages: Message[];
  address: string;
  tasks: string[];
  documentIds?:number[];
};
export const profiles = [
  {
    id: "aleksandra",
    first: "Aleksandra",
    name: "Aleksandra Nowak",
    greeting: "Aleksandro",
    initials: "AN",
    city: "Gdańsk",
    subtitle: "Praca i nowe miejsce",
    pesel:"00000000000",
    birth: "12.06.1994",
    number: "DEMO AN 024",
    extra: "Karta EKUZ",
  },
  {
    id: "kacper",
    first: "Kacper",
    name: "Kacper Zieliński",
    greeting: "Kacprze",
    initials: "KZ",
    city: "Gdańsk",
    subtitle: "Studia i samodzielność",
    pesel:"00000000000",
    birth: "21.03.2006",
    number: "DEMO KZ 026",
    extra: "Legitymacja studencka",
  },
  {
    id: "ewa",
    first: "Ewa",
    name: "Ewa Wiśniewska",
    greeting: "Ewo",
    initials: "EW",
    city: "Lublin",
    subtitle: "Spokojnie, krok po kroku",
    pesel:"00000000000",
    birth: "14.05.1963",
    number: "DEMO EW 063",
    extra: "Karta EKUZ",
  },
] as const;
export type Profile = (typeof profiles)[number];
export const caseMeta: Record<
  CaseKind,
  {
    title: string;
    short: string;
    description: string;
    time: string;
    icon: string;
    steps: string[];
  }
> = {
  move: {
    title: "Nowy adres. Dobry początek.",
    short: "Przeprowadzka",
    description: "Jeden plan na wszystkie formalności.",
    time: "około 3 min",
    icon: "house",
    steps: ["Twój plan", "Nowy adres", "Formalności", "Sprawdź i zatwierdź"],
  },
  wallet: {
    title: "Najpierw zadbajmy o Ciebie.",
    short: "Zgubiony portfel",
    description: "Uporządkuj ochronę tożsamości.",
    time: "około 2 min",
    icon: "shield",
    steps: ["Co zginęło", "Plan ochrony", "Sprawdź i zatwierdź"],
  },
  letter: {
    title: "Urzędowe na ludzkie.",
    short: "Zrozum pismo",
    description: "Dowiedz się, o co chodzi i co dalej.",
    time: "około 3 min",
    icon: "letter",
    steps: [
      "Twoje pismo",
      "Proste wyjaśnienie",
      "Twoja odpowiedź",
      "Sprawdź i zatwierdź",
    ],
  },
};
export const sampleLetter =
  "DEMO · Urząd Miasta Warszawy\nWezwanie do uzupełnienia wniosku UM/2026/184.\nProsimy o uzupełnienie brakującego potwierdzenia tytułu prawnego do lokalu. Prosimy odpowiedzieć do 27.11.2026. Dokument można dołączyć jako kopię umowy najmu. W razie trudności prosimy o kontakt z urzędem. To fikcyjne pismo demonstracyjne.";
export function initialCitizen(p: Profile): CitizenState {
  return {
    drafts: {},
    receipts: [],
    protected: false,
    address: p.city + ", ul. Słoneczna 12/4",
    tasks: [],
    messages: [],
    access: [
      {
        id: "initial1",
        who: "Przychodnia · przykład",
        purpose: "Potwierdzenie uprawnienia do świadczeń",
        scope: "Status ubezpieczenia — bez historii leczenia",
        at: "2026-11-16T10:14:00+01:00",
        active: true,
        revocable: false,
      },
      {
        id: "initial2",
        who: "Biblioteka miejska · przykład",
        purpose: "Założenie konta czytelnika",
        scope: "Imię i nazwisko",
        at: "2026-11-15T12:35:00+01:00",
        active: true,
        revocable: true,
      },
    ],
  };
}
export function freshDraft(kind: CaseKind): Draft {
  return {
    kind,
    step: 0,
    data:
      kind === "move"
        ? {
            city: "",
            street: "",
            postal: "",
            date: "2026-12-01",
            type: "stały",
            household: "samodzielnie",
            meldunek: "true",
            tax: "true",
            car: "false",
          }
        : kind === "wallet"
          ? {
              id: "true",
              cards: "false",
              license: "false",
              pesel: "true",
              report: "true",
            }
          : {
              text: sampleLetter,
              reply: "document",
              response:
                "Dzień dobry, w odpowiedzi na wezwanie UM/2026/184 przygotuję kopię umowy najmu i przekażę ją urzędowi. Proszę o potwierdzenie otrzymania dokumentu.",
              attachment: "false",
            },
  };
}
export function validateStep(d: Draft): Record<string, string> {
  const e: Record<string, string> = {};
  if (d.kind === "move" && d.step === 1) {
    if (d.data.city.trim().length < 2) e.city = "Podaj miejscowość.";
    if (d.data.street.trim().length < 4 || !/\d/.test(d.data.street))
      e.street = "Podaj ulicę i numer domu.";
    if (!/^\d{2}-\d{3}$/.test(d.data.postal))
      e.postal = "Wpisz kod w formacie 00-000.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data.date) || d.data.date < "2026-11-17")
      e.date = "Wybierz datę od 17.11.2026.";
  }
  if (
    d.kind === "move" &&
    d.step === 2 &&
    !["meldunek", "tax", "car"].some((k) => d.data[k] === "true")
  )
    e.selection = "Wybierz przynajmniej jedną formalność.";
  if (
    d.kind === "wallet" &&
    d.step === 0 &&
    !["id", "cards", "license"].some((k) => d.data[k] === "true")
  )
    e.selection = "Zaznacz, co zginęło.";
  if (
    d.kind === "wallet" &&
    d.step === 1 &&
    !["pesel", "report"].some((k) => d.data[k] === "true") &&
    d.data.cards !== "true" &&
    d.data.license !== "true"
  )
    e.selection = "Wybierz działanie ochronne.";
  if (d.kind === "letter" && d.step === 0 && d.data.text.trim().length < 40)
    e.text = "Wklej co najmniej 40 znaków pisma lub użyj przykładu.";
  if (d.kind === "letter" && d.step === 2 && d.data.response.trim().length < 20)
    e.response = "Napisz odpowiedź zawierającą co najmniej 20 znaków.";
  if (d.kind === "letter" && d.step === 2 && d.data.directReply === "true" && (!d.data.attachmentKey || !d.data.attachmentName))
    e.attachment = "Dołącz kopię dokumentu przed wysłaniem odpowiedzi.";
  if (d.step === caseMeta[d.kind].steps.length - 1 && d.data.consent !== "true")
    e.consent = "Potwierdź, że rozumiesz zakres symulacji.";
  return e;
}
export function completeCase(c: CitizenState, d: Draft): CitizenState {
  const invalidPrevious = caseMeta[d.kind].steps.some(
    (_, step) => Object.keys(validateStep({ ...d, step })).length > 0,
  );
  if (d.step !== caseMeta[d.kind].steps.length - 1 || invalidPrevious)
    throw new Error("Sprawa wymaga poprawnych danych i świadomej zgody.");
  const at = new Date().toISOString();
  const id = "DEMO-" + Date.now().toString(36).toUpperCase();
  const operations =
    d.kind === "move" ? movingOperations(d.data, id) : undefined;
  const sentLetter = d.kind === "letter" && d.data.directReply === "true";
  const followups =
    d.kind === "move"
      ? [
          "Przekaż dokument potwierdzający prawo do lokalu.",
          "Sprawdź adres w banku i u pracodawcy.",
        ]
      : d.kind === "wallet"
        ? [
            ...(d.data.cards === "true"
              ? ["Zablokuj karty samodzielnie w aplikacji swojego banku."]
              : []),
            ...(d.data.license === "true"
              ? ["Sprawdź procedurę zgłoszenia utraty prawa jazdy."]
              : []),
            "Przejrzyj aktywność na swoich kontach.",
          ]
        : sentLetter ? [] : [
            "Dołącz właściwy dokument i przekaż odpowiedź urzędowi oficjalnym kanałem.",
            "Sprawdź termin w oryginalnym piśmie.",
          ];
  const drafts = { ...c.drafts };
  delete drafts[d.kind];
  return {
    ...c,
    drafts,
    receipts: [
      {
        id,
        kind: d.kind,
        at,
        data: { ...d.data },
        followups,
        operations,
        events: [
          {
            at,
            label:
              sentLetter ? "Wysłano odpowiedź w symulacji" : "Zatwierdzono zakres symulacji i zapisano " +
              caseMeta[d.kind].short.toLowerCase(),
          },
        ],
      },
      ...c.receipts,
    ],
    protected: c.protected || (d.kind === "wallet" && d.data.pesel === "true"),
    address:
      d.kind === "move"
        ? `${d.data.city}, ${d.data.street}, ${d.data.postal}`
        : c.address,
    access: operations
      ? [
          ...operations.map((o) => ({
            id: o.reference,
            who: o.recipient,
            purpose: o.title + " · przygotowanie symulacji",
            scope: o.scope,
            at,
            revocable: false,
            active: true,
          })),
          ...c.access,
        ]
      : [
          {
            id,
            who:
              d.kind === "move"
                ? "Urząd miasta · symulacja"
                : d.kind === "wallet"
                  ? "Rejestr ochrony · symulacja"
                  : sentLetter ? "Urząd Miasta Warszawy · symulacja" : "Szkic odpowiedzi · lokalnie",
            purpose: caseMeta[d.kind].short,
            scope:
              d.kind === "move"
                ? "Imię, nazwisko, nowy adres i data"
                : d.kind === "wallet"
                  ? "Wybrane działania ochronne"
                  : "Treść pisma i szkic odpowiedzi",
            at,
            revocable: false,
            active: true,
          },
          ...c.access,
        ],
  };
}
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .toLowerCase();
export type AssistantContext = {
  profileName: string;
  protected: boolean;
  screen?: Tab;
  documentId?: number;
  drafts?: { kind: CaseKind; nextStep: string }[];
  process?: {
    id: string;
    kind: CaseKind;
    nextStep: string;
    completed: number;
    total: number;
  };
};
export interface AssistantProvider {
  reply(
    text: string,
    context: AssistantContext,
    signal?: AbortSignal,
  ): Promise<Message>;
}
export class DemoAssistant implements AssistantProvider {
  async reply(
    text: string,
    context: AssistantContext,
    signal?: AbortSignal,
  ): Promise<Message> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const t = norm(text);
    if (
      context.documentId !== undefined &&
      /pokaz|otworz|udostep|ten dokument/.test(t)
    )
      return {
        role: "assistant",
        text: /udostep/.test(t)
          ? "Przygotuję udostępnienie wybranego dokumentu. Najpierw sprawdzisz odbiorcę i minimalny zakres danych; dopiero potem wyrazisz zgodę."
          : "To dokument wybrany w Twoim portfelu. Otwórz go, aby sprawdzić dane i możliwe działania.",
        ...(/udostep/.test(t)
          ? { shareDocumentId: context.documentId }
          : { documentId: context.documentId }),
      };
    if (
      context.process &&
      /dalej|teraz|brak|dokument|status|krok|spraw|pomoc/.test(t)
    ) {
      const pr = context.process;
      return {
        role: "assistant",
        text: `W sprawie „${caseMeta[pr.kind].short}” masz ${pr.completed} z ${pr.total} formalności gotowych. Następny krok: ${pr.nextStep}. Otwórz tę sprawę, aby sprawdzić zakres i dokończyć działanie. Niczego nie wykonuję w Twoim imieniu.`,
        caseId: pr.id,
      };
    }
    if (context.drafts?.length && /kontynu|dokoncz|wroc|dalej/.test(t)) {
      const d = context.drafts[0];
      return {
        role: "assistant",
        text:
          "Twój plan jest zapisany. Następny krok: " +
          d.nextStep +
          ". Wrócisz do ostatniego etapu, bez ponownego wpisywania danych.",
        action: d.kind,
      };
    }
    let result: Omit<Message, "role">;
    if (/przeprowadz|adres|meldun|warszaw/.test(t))
      result = {
        text: "Przygotujmy przeprowadzkę. Zapytam o nowy adres i datę, a potem wybierzesz formalności. Zobaczysz odbiorców i zakres danych przed zatwierdzeniem.",
        action: "move",
      };
    else if (/portfel|zgubil|zgubi[lł]|ukrad|zastrze|dowod|pesel/.test(t))
      result = {
        text: context.protected
          ? "W tym profilu ochrona PESEL jest już włączona w symulacji. Możesz przygotować kolejne kroki dla utraconych dokumentów."
          : "Najpierw ustalimy, co zginęło. Oddzielimy ochronę PESEL, zgłoszenie utraty dokumentu i działania w banku. Wszystko zatwierdzisz samodzielnie.",
        action: "wallet",
      };
    else if (/pismo|urz[eę]d|wezwan|list|decyzj|rozum|dokument/.test(t))
      result = {
        text: "Przejdźmy przez treść pisma. W trybie demo mogę pokazać wyjaśnienie przykładu, wyłapać termin z wklejonego tekstu i pomóc przygotować szkic. Sprawdzisz go przed zapisaniem.",
        action: "letter",
      };
    else if (/dane|prywat|zgod/.test(t))
      result = {
        showPrivacy: true,
        text: "W zakładce Dane sprawdzisz odbiorcę, cel i zakres każdego przykładowego dostępu. Udostępnienie „Mam 18 lat” ujawnia tylko odpowiedź tak/nie. Aktywne zgody możesz wycofać.",
      };
    else
      result = {
        text: `${context.profileName}, działam w trybie demonstracyjnym, bez modelu AI. Pomogę w trzech sprawach: przeprowadzce, zgubionym portfelu i zrozumieniu pisma. Napisz, która sytuacja Cię dotyczy.`,
      };
    const destination = t.split(/\bdo\s+/).at(-1) || t;
    const city = /warszaw/.test(destination)
      ? "Warszawa"
      : /krakow/.test(destination)
        ? "Kraków"
        : /gdansk/.test(destination)
          ? "Gdańsk"
          : /lublin/.test(destination)
            ? "Lublin"
            : undefined;
    return {
      role: "assistant",
      ...result,
      ...(result.action === "move" && city
        ? {
            text:
              result.text +
              ` Wstępnie uzupełnię miejscowość: ${city}. Możesz ją zmienić.`,
            suggestedData: { city },
          }
        : {}),
    };
  }
}
/** Production transport only talks to your own backend. Never place provider keys in VITE_* or the client. */
export class ServerAssistant implements AssistantProvider {
  async reply(
    text: string,
    context: AssistantContext,
    signal?: AbortSignal,
  ): Promise<Message> {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, context }),
      signal,
    });
    if (!response.ok) throw new Error("Asystent jest chwilowo niedostępny.");
    return parseAssistantResponse(await response.json());
  }
}
export function parseAssistantResponse(r: unknown): Message {
  if (
    !r ||
    typeof r !== "object" ||
    !("text" in r) ||
    typeof r.text !== "string"
  )
    throw new Error("Nieprawidłowa odpowiedź serwera.");
  const a =
    "action" in r && ["move", "wallet", "letter"].includes(String(r.action))
      ? (r.action as CaseKind)
      : undefined;
  const data =
    "suggestedData" in r &&
    r.suggestedData &&
    typeof r.suggestedData === "object"
      ? (r.suggestedData as Record<string, unknown>)
      : {};
  const city =
    typeof data.city === "string" &&
    ["Warszawa", "Kraków", "Gdańsk", "Lublin"].includes(data.city)
      ? data.city
      : undefined;
  return {
    role: "assistant",
    text: r.text.slice(0, 3000),
    action: a,
    ...("documentId" in r &&
    Number.isInteger(r.documentId) &&
    Number(r.documentId) >= 0 &&
    Number(r.documentId) < 5
      ? { documentId: Number(r.documentId) }
      : {}),
    ...("shareDocumentId" in r &&
    Number.isInteger(r.shareDocumentId) &&
    Number(r.shareDocumentId) >= 0 &&
    Number(r.shareDocumentId) < 5
      ? { shareDocumentId: Number(r.shareDocumentId) }
      : {}),
    ...("showPrivacy" in r && r.showPrivacy === true
      ? { showPrivacy: true }
      : {}),
    ...(a === "move" && city ? { suggestedData: { city } } : {}),
    ...("caseId" in r && typeof r.caseId === "string"
      ? { caseId: r.caseId.slice(0, 80) }
      : {}),
  };
}
export function analyzeLetter(text: string) {
  const sample = text === sampleLetter;
  const date = text.match(/\b\d{2}\.\d{2}\.\d{4}\b/)?.[0];
  return {
    sample,
    date,
    summary: sample
      ? "Urząd prosi o brakujący dokument do Twojego wniosku: potwierdzenie prawa do lokalu, np. kopię umowy najmu. To prośba o uzupełnienie, a nie decyzja odmowna."
      : "To własny tekst. Tryb demo nie interpretuje wiarygodnie dowolnych pism. Poniżej pokazuję wyłącznie datę znalezioną w treści. Sprawdź jej znaczenie i wymagane działania w oryginale lub z urzędem.",
  };
}
