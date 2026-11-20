import { familyMembers, passportOffices, travelPurposes } from "./fixtures.ts";

export type FamilyRole = keyof typeof familyMembers;
type OtherRole = Exclude<FamilyRole, "aleksandra">;
export type PassportForm = { purpose: string; office: string };
type EventType = "saved" | "requested" | "approved" | "declined";
export type FamilyEvent = {
  revision: number;
  type: EventType;
  actor: FamilyRole;
  at: string;
  requestId?: number;
  sharedForm?: PassportForm;
};
type ConsentRequest = {
  id: number;
  sender: "aleksandra";
  recipient: "tomasz";
  status: "pending" | "approved" | "declined";
  form: PassportForm;
};
type FamilyStatus = "draft" | "pending" | "ready" | "declined";
export type FamilyCase = {
  revision: number;
  status: FamilyStatus;
  form: PassportForm;
  request: ConsentRequest | null;
  history: FamilyEvent[];
};
export type FamilyView = {
  role: FamilyRole;
  members: {
    id: FamilyRole;
    name: string;
    relation: string;
    passport?: { label: string; attention: boolean };
  }[];
  case: FamilyCase | null;
};
export type FamilyCommand =
  | { type: "save"; form: PassportForm }
  | { type: "request" }
  | { type: "approve" | "decline" };

export function projectFamily(role: FamilyRole, current: FamilyCase | null): FamilyView {
  let sharedCase = role === "aleksandra" ? current : null;
  if (role === "tomasz" && current?.request?.recipient === role) {
    const request = current.request;
    const history = current.history.filter((event) => event.type !== "saved");
    sharedCase = {
      revision: history.at(-1)!.revision,
      status: request.status === "approved" ? "ready" : request.status,
      form: request.form,
      request,
      history,
    };
  }
  const ids: FamilyRole[] = ["aleksandra", "tomasz", "zosia"];
  return {
    role,
    members: ids.map((id) => {
      const member = familyMembers[id];
      return {
        id,
        name: member.name,
        relation: member.relation,
        ...(role !== "zosia" || id === role
          ? { passport: { label: member.document, attention: member.attention } }
          : {}),
      };
    }),
    case: sharedCase,
  };
}

export function isValidPassportForm(form: unknown): form is PassportForm {
  if (!form || typeof form !== "object") return false;
  const { purpose, office } = form as Record<string, unknown>;
  return travelPurposes.some((option) => option === purpose) &&
    passportOffices.some((option) => option === office);
}

export function updateFamilyCase(
  current: FamilyCase | null,
  role: FamilyRole,
  command: FamilyCommand,
  expectedRevision: number,
  at: string,
): { next: FamilyCase } | { status: 400 | 403 | 409; error: string } {
  const preparing = command.type === "save" || command.type === "request";
  if (role !== (preparing ? "aleksandra" : "tomasz"))
    return { status: 403, error: "Ta czynność jest niedostępna w Twojej roli." };
  if (expectedRevision !== (current?.revision ?? 0))
    return { status: 409, error: "Sprawa się zmieniła. Sprawdź jej aktualny stan." };
  const revision = expectedRevision + 1;
  const conflict = { status: 409, error: "Ta czynność jest niedostępna na obecnym etapie." } as const;
  const history = current?.history ?? [];
  if (command.type === "save") {
    if (current?.status === "pending" || current?.status === "ready") return conflict;
    if (!isValidPassportForm(command.form))
      return { status: 400, error: "Wybierz cel podróży i punkt paszportowy z listy." };
    const { purpose, office } = command.form;
    return {
      next: {
        revision, status: "draft", form: { purpose, office }, request: current?.request ?? null,
        history: [...history, { revision, type: "saved", actor: role, at }],
      },
    };
  }
  if (!current) return conflict;
  if (command.type === "request") {
    if (current.status !== "draft") return conflict;
    return {
      next: {
        ...current, revision, status: "pending",
        request: {
          id: revision, sender: "aleksandra", recipient: "tomasz",
          status: "pending", form: current.form,
        },
        history: [...history, {
          revision, type: "requested", actor: role, at,
          requestId: revision, sharedForm: current.form,
        }],
      },
    };
  }
  if (current.status !== "pending" || current.request?.recipient !== role) return conflict;
  const status = command.type === "approve" ? "approved" : "declined";
  return {
    next: {
      ...current, revision, status: status === "approved" ? "ready" : "declined",
      request: { ...current.request, status },
      history: [...history, { revision, type: status, actor: role, at, requestId: current.request.id }],
    },
  };
}

export type FamilyInvites = Record<OtherRole, string>;
export type FamilyNotification = { id: number; title: string; at: string; read: boolean };
export type FamilySessionResponse = { view: FamilyView; invites?: FamilyInvites; notifications?: FamilyNotification[] };
