import type { Access, CaseKind, Receipt, Tab } from "./domain";
import type { Store } from "./storage";
import type { HealthTarget } from "./health/model";
export type Layer =
  | {
      type: "notifications" | "about" | "install" | "reset" | "most" | "most-help" | "services";
    }
  | { type: "profile"; service?: "family" }
  | { type: "family"; decision?: boolean }
  | { type: "health"; target: HealthTarget; helper?: boolean }
  | { type: "document"; id: number }
  | { type: "assistant"; caseId?: string; screen?: Tab; documentId?: number }
  | { type: "flow"; kind: CaseKind }
  | { type: "receipt"; receipt: Receipt }
  | { type: "access"; access: Access }
  | {
      type: "share";
      id: number;
      returnTo?: number;
      initialScope?: "adult" | "identity";
    };
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
      },
    };
  if (l.type === "family" && (tab === "cases" || tab === "services")) return { tab, layer: { type: "family", decision: l.decision === true } };
  if (l.type === "health" && (tab === "cases" || tab === "services" || tab === "privacy") && l.target && typeof l.target === "object") {
    const target = l.target as HealthTarget;
    if (["home", "timeline", "prescriptions", "referrals", "results", "visits", "access", "assistant", "invite", "plan", "review", "inbox", "share"].includes(target.section))
      return { tab, layer: { type: "health", helper: l.helper === true, target: { section: target.section, id: typeof target.id === "string" ? target.id : undefined,
        origin: target.origin === "results" || target.origin === "visits" ? target.origin : undefined } } };
  }
  if (l.type === "most" && (tab === "cases" || tab === "privacy") && store.profile === "ewa")
    return { tab, layer: { type: "most" } };
  if (l.type === "most-help" && tab === "cases") return { tab, layer: { type: "most-help" } };
  if (l.type === "services") return { tab: "services", layer: null };
  if (l.type === "profile") return { tab, layer: { type: "profile", ...(l.service === "family" && { service: "family" }) } };
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
  if (
    l.type === "flow" &&
    ["move", "wallet", "letter"].includes(String(l.kind)) &&
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
