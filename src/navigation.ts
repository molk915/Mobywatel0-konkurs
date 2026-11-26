import type { Access, CaseKind, Receipt, Tab } from "./domain";
import type { Store } from "./storage";
import type { HealthTarget } from "./health/model";
import { delegationTitles, type DelegationContext } from "./most/model.ts";
import { workflowActions, workflowDetails, type WorkflowAction, type WorkflowKind } from "./workflows/model.ts";
export type Layer =
  | {
      type: "notifications" | "about" | "install" | "reset" | "most" | "most-help" | "services" | "tax-payment";
    }
  | { type: "most-hub"; mode?: MostHubMode }
  | { type: "profile"; service?: "family"; returnToMost?: MostHubMode }
  | { type: "family"; decision?: boolean }
  | { type: "health"; target: HealthTarget; helper?: boolean }
  | { type: "document"; id: number }
  | { type: "assistant"; caseId?: string; screen?: Tab; documentId?: number; workflow?: WorkflowAction; returnWorkflow?: WorkflowKind; conversation?: string }
  | { type: "workflow"; kind: WorkflowKind; city?: string }
  | { type: "moving"; city?: string }
  | { type: "flow"; kind: CaseKind }
  | { type: "receipt"; receipt: Receipt }
  | { type: "delegation"; kind: DelegationContext["kind"]; receiptId?: string; trackerEventId?: string }
  | { type: "access"; access: Access }
  | { type: "data-event"; id: string }
  | {
      type: "share";
      id: number;
      returnTo?: number;
      initialScope?: "adult" | "identity";
    };
export type MostHubMode = "own" | "help";
export function restoreNavigation(
  value: unknown,
  store: Store,
): { tab: Tab; layer: Layer | null } {
  const fallback = { tab: "home" as Tab, layer: null };
  if (!value || typeof value !== "object") return fallback;
  const state = value as Record<string, unknown>;
  if (
    !state.prototype ||
    state.profile !== store.profile ||
    !["home", "documents", "cases", "services", "privacy"].includes(String(state.tab))
  )
    return fallback;
  const tab = state.tab as Tab,
    c = store.citizens[store.profile],
    candidate = state.layer;
  if (!candidate || typeof candidate !== "object") return { tab, layer: null };
  const l = candidate as Record<string, unknown>;
  if (l.type === "assistant")
    return {
      tab,
      layer: {
        type: "assistant",
        ...(["home", "documents", "cases", "services", "privacy"].includes(String(l.screen))
          ? { screen: l.screen as Tab }
          : {}),
        ...(Number.isInteger(l.documentId) &&
        Number(l.documentId) >= 0 &&
        Number(l.documentId) < 5
          ? { documentId: Number(l.documentId) }
          : {}),
        ...(typeof l.caseId === "string" &&
        c.receipts.some((r) => r.id === l.caseId)
          ? { caseId: l.caseId }
          : {}),
        ...(workflowActions.includes(l.workflow as WorkflowAction) ? { workflow: l.workflow as WorkflowAction } : {}),
        ...(typeof l.returnWorkflow === "string" && Object.hasOwn(workflowDetails, l.returnWorkflow)
          ? { returnWorkflow: l.returnWorkflow as WorkflowKind } : {}),
        ...(typeof l.conversation === "string" && /^[a-z0-9:-]{1,100}$/i.test(l.conversation)
          ? { conversation: l.conversation } : {}),
      },
    };
  if (l.type === "family" && (tab === "home" || tab === "cases" || tab === "services")) return { tab, layer: { type: "family", decision: l.decision === true } };
  if (l.type === "health" && (tab === "home" || tab === "cases" || tab === "services" || tab === "privacy") && l.target && typeof l.target === "object") {
    const target = l.target as HealthTarget;
    if (["home", "timeline", "prescriptions", "referrals", "results", "visits", "access", "assistant", "invite", "plan", "review", "inbox", "share"].includes(target.section))
      return { tab, layer: { type: "health", helper: l.helper === true, target: { section: target.section, id: typeof target.id === "string" ? target.id : undefined,
        origin: target.origin === "results" || target.origin === "visits" ? target.origin : undefined } } };
  }
  if (l.type === "most" && (tab === "cases" || tab === "privacy") && store.profile === "ewa")
    return { tab, layer: { type: "most" } };
  if (l.type === "most-help" && tab === "cases") return { tab, layer: { type: "most-help" } };
  if (l.type === "most-hub") return { tab, layer: { type: "most-hub", mode: l.mode === "own" || l.mode === "help" ? l.mode : undefined } };
  if (l.type === "services") return { tab: "services", layer: null };
  if (l.type === "tax-payment" && tab === "cases") return { tab, layer: { type: "tax-payment" } };
  const city = typeof l.city === "string" && l.city.length <= 60 ? l.city : undefined;
  if (l.type === "moving") return { tab, layer: { type: "moving", city } };
  if (l.type === "workflow" && typeof l.kind === "string" && Object.hasOwn(workflowDetails, l.kind))
    return { tab, layer: { type: "workflow", kind: l.kind as WorkflowKind, city } };
  if (l.type === "delegation" && l.kind === "trusted") {
    const kind = l.kind as DelegationContext["kind"];
    if (l.receiptId !== undefined && !c.receipts.some((r) => r.id === l.receiptId && r.kind === kind)) return { tab, layer: null };
    return { tab, layer: { type: "delegation", kind, receiptId: typeof l.receiptId === "string" ? l.receiptId : undefined,
      ...(typeof l.trackerEventId === "string" && /^[a-z0-9:./-]{1,100}$/i.test(l.trackerEventId) && { trackerEventId: l.trackerEventId }) } };
  }
  if (l.type === "data-event" && tab === "privacy" && typeof l.id === "string" && /^[a-z0-9:./-]{1,100}$/i.test(l.id))
    return { tab, layer: { type: "data-event", id: l.id } };
  if (l.type === "profile") return { tab, layer: { type: "profile", ...(l.service === "family" && { service: "family" }),
    ...(l.returnToMost === "own" || l.returnToMost === "help" ? { returnToMost: l.returnToMost }
      : l.returnToMost === true ? { returnToMost: "own" } : {}) } };
  if (
    [
      "notifications",
      "assistant",
      "about",
      "install",
      "reset",
    ].includes(String(l.type))
  )
    return { tab, layer: { type: l.type as "notifications" | "about" | "install" | "reset" } };
  if (
    l.type === "document" &&
    Number.isInteger(l.id) &&
    Number(l.id) >= 0 &&
    Number(l.id) < 5
  )
    return { tab, layer: { type: "document", id: Number(l.id) } };
  if (
    l.type === "share" &&
    Number.isInteger(l.id) &&
    Number(l.id) >= 0 &&
    Number(l.id) < 5
  )
    return {
      tab,
      layer: {
        type: "share",
        id: Number(l.id),
        ...(l.initialScope === "adult" || l.initialScope === "identity"
          ? { initialScope: l.initialScope }
          : {}),
        returnTo:
          Number.isInteger(l.returnTo) &&
          Number(l.returnTo) >= 0 &&
          Number(l.returnTo) < 5
            ? Number(l.returnTo)
            : undefined,
      },
    };
  if (l.type === "flow" && l.kind === "move") return { tab: "cases", layer: { type: "moving", city: c.drafts.move?.data.city } };
  if (l.type === "flow" && l.kind === "letter") return { tab: "cases", layer: store.profile === "ewa" ? { type: "most" } : null };
  if (
    l.type === "flow" &&
    l.kind === "wallet" &&
    c.drafts[l.kind as CaseKind]
  )
    return { tab, layer: { type: "flow", kind: l.kind as CaseKind } };
  if (l.type === "receipt") {
    const id = (l.receipt as Receipt | undefined)?.id;
    const receipt = c.receipts.find((r) => r.id === id);
    if (receipt) return { tab, layer: { type: "receipt", receipt } };
  }
  if (l.type === "access") {
    const id = (l.access as Access | undefined)?.id;
    const access = c.access.find((a) => a.id === id);
    if (access) return { tab, layer: { type: "access", access } };
  }
  return { tab, layer: null };
}

type AssistantLayer = Extract<Layer, { type: "assistant" }>;
export function conversationFor(layer: AssistantLayer): string {
  if (layer.conversation) return layer.conversation;
  if (layer.returnWorkflow) return "workflow:" + layer.returnWorkflow;
  if (layer.workflow) return "topic:" + layer.workflow;
  if (layer.caseId) return "receipt:" + layer.caseId;
  if (layer.documentId !== undefined) return "document:" + layer.documentId;
  return "general";
}

export function openConversation(conversation: string, c: Store["citizens"][string], screen: Tab): AssistantLayer {
  const base: AssistantLayer = { type: "assistant", conversation, screen };
  const [type, id] = conversation.split(":");
  if (type === "workflow" && Object.hasOwn(workflowDetails, id)) {
    const kind = id as WorkflowKind;
    return { ...base, screen: "cases", returnWorkflow: kind, workflow: kind === "registration" || kind === "tax-address" ? "move" : kind };
  }
  if (type === "topic" && workflowActions.includes(id as WorkflowAction)) return { ...base, workflow: id as WorkflowAction };
  if (type === "receipt" && c.receipts.some((r) => r.id === id)) return { ...base, caseId: id };
  if (type === "document" && /^[0-4]$/.test(id)) return { ...base, screen: "documents", documentId: Number(id) };
  return base;
}
export function searchDocuments(query: string, extra: string): number[] {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ł/g, "l")
      .toLowerCase();
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return [
    "mDowód dowód tożsamość dane",
    "mPrawo jazdy uprawnienia kierowca",
    "Moje pojazdy samochód auto OC badanie",
    extra,
  ].flatMap((name, id) =>
    words.every((w) => normalize(name).includes(w)) ? [id] : [],
  );
}
