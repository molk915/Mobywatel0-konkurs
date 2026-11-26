import { randomBytes, randomUUID } from "node:crypto";
import { profiles } from "../src/domain.ts";
import { workflowDetails } from "../src/workflows/model.ts";
import { activeConnection } from "./most-policy.mjs";

const demoLifetime = 30 * 86_400_000;
const timestamp = (at) => new Date(at).toISOString();
const token = () => randomBytes(24).toString("base64url");
const bearer = (req) => req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{32})$/)?.[1];
const clean = (value, min, max) =>
  typeof value === "string" && value.trim().length >= min && value.trim().length <= max
    ? value.trim() : null;
const payment = (kind) => kind === "fine" || kind === "tax";

function validateInput(kind, input) {
  if (payment(kind)) {
    return ["blik", "card", "test-failure"].includes(input?.method) ? { method: input.method } : null;
  }
  const street = clean(input?.street, 4, 100);
  const city = clean(input?.city, 2, 60);
  const postalCode = typeof input?.postalCode === "string" && /^\d{2}-\d{3}$/.test(input.postalCode) ? input.postalCode : null;
  if (!street || !/\d/.test(street) || !city || !postalCode) return null;
  if (kind === "registration") {
    return ["lease", "ownership"].includes(input.basis) ? { street, postalCode, city, basis: input.basis } : null;
  }
  const office = clean(input.office, 4, 120);
  return office ? { street, postalCode, city, office } : null;
}

export function createWorkflows({ state, save }, now = Date.now, mostSessions = new Map(), control) {
  const sessions = state.sessions;
  function activeGrant(grant, at) {
    const room = mostSessions.get(grant?.trusted)?.room;
    return !grant?.revoked && grant?.expires > at && activeConnection(room, grant.invitation, at);
  }
  function assignments(room, at, withCase = false) {
    return [...sessions.values()].flatMap((session) => session.expires > at
      ? Object.entries(session.grants ?? {}).flatMap(([id, grant]) =>
        grant.trusted === room.token && activeGrant(grant, at)
          ? [{ title: workflowDetails[id].title, token: grant.token, workflow: true,
            ...(withCase && { id, expires: grant.expires, item: session.items.find((item) => item.id === id) }) }] : [])
      : []);
  }
  function profileSession(req) {
    return sessionForKey(bearer(req), now());
  }
  const publicItem = ({ confirmation, ...item }) => ({
    ...item, history: item.history.map(({ status, at }) => ({ status, at })),
  });
  function sessionForKey(key, at) {
    const session = sessions.get(key);
    return session?.expires > at ? session : null;
  }
  function controlHistory(room, helper) {
    return [...sessions.values()].flatMap((session) => session.items.flatMap((item) => item.history.flatMap((event, index) =>
      event.trusted === room.token ? [{ id: event.eventId ?? "workflow:" + session.profile + ":" + item.id + ":" + index,
        at: event.at, actor: event.actor ?? helper, label: event.action === "prepare" ? "Zapisano szkic" :
          event.action === "review" ? "Przekazano do zatwierdzenia" :
          event.status === "paid" ? "Opłacono w pokazie" : event.status === "failed" ? "Płatność nie powiodła się" : "Wysłano zgłoszenie w pokazie",
        detail: [workflowDetails[item.id].title, event.receipt].filter(Boolean).join(" · "), grant: event.grant,
        resource: item.id, result: event.status === "failed" ? "Błąd symulacji" : "Zapisano" }] : [])));
  }
  function initialCase(kind, at) {
    return { id: kind, kind, status: "new", revision: 0, createdAt: timestamp(at), history: [], read: [] };
  }
  function ewaFine(at) {
    return { ...initialCase("fine", at), paymentAmount: "150,00 zł", paymentReference: "DEMO-MD-2026-0150-EW" };
  }
  function commit(key, next, reply, status, data) {
    const before = sessions.get(key);
    sessions.set(key, next);
    try {
      save();
    } catch {
      if (before) sessions.set(key, before);
      else sessions.delete(key);
      return reply(503, { error: "Zapis sprawy nie powiódł się. Spróbuj ponownie." });
    }
    return reply(status, data);
  }
  function handler(req, reply, command) {
    const at = now();
    if (req.url === "/api/workflows/session") {
      const profile = profiles.find(({ id }) => id === command?.profile);
      if (!profile) return reply(400, { error: "Wybierz profil demonstracyjny." });
      for (const [key, value] of sessions) {
        if (value.expires <= at) sessions.delete(key);
      }
      if (sessions.size >= 512) return reply(503, { error: "Limit aktywnych sesji demonstracyjnych." });
      const key = token();
      const items = [initialCase("tax", at)];
      if (profile.id === "kacper") items.unshift(initialCase("fine", at));
      if (profile.id === "ewa") items.unshift(ewaFine(at));
      return commit(key, { profile: profile.id, expires: at + demoLifetime, items }, reply, 201, { token: key, items });
    }
    const key = bearer(req);
    const delegated = req.url === "/api/workflows/delegated";
    const managed = delegated ? control?.resolveWorkflow(key, at) : null;
    const linked = delegated && key && (managed ? [managed.key, sessionForKey(managed.key, at)] : [...sessions.entries()].find(([, owner]) =>
      owner.expires > at && Object.values(owner.grants ?? {}).some((grant) => grant.token === key)));
    const session = delegated ? linked?.[1] : profileSession(req);
    if (!session) return reply(401, { error: "Sesja spraw wygasła." });
    const permittedId = delegated && (managed?.id ?? Object.keys(session.grants ?? {}).find((id) => session.grants[id].token === key));
    if (delegated && (!permittedId || !(managed ? managed.active : activeGrant(session.grants[permittedId], at)))) {
      if (managed && req.method !== "GET") control.denyGrant(key, at, "Obsługa sprawy");
      return reply(410, { error: "Dostęp do sprawy został zakończony." });
    }
    const items = session.items;
    const managedInitial = managed && !payment(permittedId) && !items.some(({ id }) => id === permittedId)
      ? initialCase(permittedId, Date.parse(managed.grant.created)) : null;
    const delegatedItems = (records) => {
      const visible = records.filter(({ id }) => id === permittedId);
      return (managedInitial && !visible.length ? [managedInitial] : visible).map(publicItem);
    };
    const snapshot = (records, grants = session.grants) => ({
      ...(delegated && { applicant: profiles.find(({ id }) => id === session.profile)?.name,
        ...(managed && { permissions: { prepare: managed.allows("prepare"),
          confirm: managed.allows(payment(permittedId) ? "pay" : "submit"), mode: managed.grant.mode } }) }),
      items: delegated ? delegatedItems(records)
        : records.map((item) => ({ ...publicItem(item), delegated: Boolean(activeGrant(grants?.[item.id], at)),
          ...(control?.workflowGrants(key, item.id, at).length > 0 && { managedAccess: true }) })),
    });
    if (req.method === "GET") {
      if (!delegated && session.profile === "ewa" && !items.some(({ kind }) => kind === "fine")) {
        const updated = [ewaFine(at), ...items];
        return commit(key, { ...session, items: updated }, reply, 200, snapshot(updated));
      }
      return reply(200, snapshot(items));
    }
    if (!Object.hasOwn(workflowDetails, command?.id ?? "")) return reply(400, { error: "Nieznany rodzaj sprawy." });
    if (delegated && (permittedId !== command.id || !["prepare", "review", "confirm", "authorize"].includes(command.type) ||
        command.type === "authorize" && managed?.grant.mode !== "confirm" ||
        command.type === "review" && managed?.grant.mode !== "owner" ||
        managed && !managed.allows(["prepare", "review"].includes(command.type) ? "prepare" : payment(permittedId) ? "pay" : "submit"))) {
      if (managed) control.denyGrant(key, at, "Obsługa sprawy");
      return reply(403, { error: "Ta czynność wykracza poza zakres ePełnomocnictwa." });
    }
    let item = items.find(({ id }) => id === command.id) ?? managedInitial;
    if (!item && !payment(command.id) && ["prepare", "grant"].includes(command.type))
      item = initialCase(command.id, at);
    if (!item) return reply(404, { error: "Sprawa jest niedostępna w tym profilu." });
    if (command.type === "authorize" && managed?.grant.mode === "confirm") {
      if (item.status !== "prepared" || command.revision !== item.revision)
        return reply(409, { error: "Najpierw sprawdź aktualne podsumowanie sprawy." });
      const confirmation = { challenge: token(), grant: managed.grant.id, revision: item.revision, expires: at + 90_000 };
      const next = items.map((entry) => entry.id === item.id ? { ...entry, confirmation } : entry);
      return commit(linked[0], { ...session, items: next }, reply, 200, { ...snapshot(next), challenge: confirmation.challenge });
    }
    if (command.type === "grant" || command.type === "revoke") {
      const grants = { ...session.grants };
      if (command.type === "revoke") {
        if (grants[item.id]) grants[item.id] = { ...grants[item.id], revoked: true };
      }
      else {
        if (item.receipt) return reply(409, { error: "Sprawa została już wykonana." });
        const trusted = mostSessions.get(command.trustedToken);
        const grant = { trusted: command.trustedToken, invitation: trusted?.room.invitation?.token,
          expires: at + 7 * 86_400_000, token: token() };
        if (trusted?.role !== "owner" || trusted.room.delegation?.kind !== "trusted" || !activeGrant(grant, at))
          return reply(409, { error: "Najpierw połącz osobę zaufaną kodem QR w zakładce Dane." });
        if (control?.workflowGrants(key, item.id, at).length)
          return reply(409, { error: "Zarządzaj upoważnieniem do tej sprawy w Centrum kontroli." });
        if (activeGrant(grants[item.id], at)) return reply(409, { error: "Sprawa jest już udostępniona." });
        grants[item.id] = grant;
      }
      const next = items.some(({ id }) => id === item.id) ? items : [...items, item];
      return commit(key, { ...session, items: next, grants }, reply, 200, snapshot(next, grants));
    }
    if (command.type === "confirm" && item.receipt && command.revision === item.revision - 1)
      return reply(200, snapshot(items));
    if (command.type === "read") {
      const index = command.index;
      if (index !== -1 && (!Number.isInteger(index) || index < 0 || index >= item.history.length))
        return reply(400, { error: "Nieznane powiadomienie." });
      if (item.read.includes(index)) return reply(200, snapshot(items));
      item = { ...item, read: [...item.read, index] };
    } else {
      if (command.revision !== item.revision || item.receipt)
        return reply(409, { error: "Sprawa zmieniła się. Sprawdź aktualne dane." });
      if (command.type === "prepare") {
        const input = validateInput(item.kind, command.input);
        if (!input) return reply(400, { error: "Uzupełnij wymagane pola poprawnymi danymi." });
        item = { ...item, input, status: "prepared",
          approval: managed?.grant.mode === "owner" ? "draft" : undefined };
      } else if (command.type === "review" && delegated) {
        if (item.status !== "prepared" || item.approval !== "draft")
          return reply(409, { error: "Zapisz aktualny szkic przed przekazaniem do zatwierdzenia." });
        item = { ...item, approval: "requested" };
      } else if (command.type === "confirm") {
        if (item.status !== "prepared") return reply(409, { error: "Najpierw przygotuj i sprawdź podsumowanie." });
        if (item.approval === "draft") return reply(409, { error: "Szkic czeka na przekazanie przez osobę zaufaną. Możesz też zapisać własne dane i zatwierdzić sprawę." });
        if (managed?.grant.mode === "confirm" && (!item.confirmation || item.confirmation.expires <= at ||
            item.confirmation.grant !== managed.grant.id || item.confirmation.revision !== item.revision ||
            item.confirmation.challenge !== command.challenge)) {
          control.denyGrant(key, at, "Potwierdzenie sprawy");
          return reply(403, { error: "Potwierdź tę operację oddzielnie w aplikacji." });
        }
        if (item.input.method === "test-failure") {
          item = { ...item, status: "failed" };
        } else {
          const receipt = { number: "DEMO-" + randomUUID().slice(0, 12).toUpperCase(), at: timestamp(at) };
          const status = payment(item.kind) ? "paid" : item.kind === "registration" ? "awaiting" : "accepted";
          item = { ...item, receipt, status, approval: undefined, performedBy: delegated ? "trusted" : "owner" };
        }
      } else {
        return reply(400, { error: "Nieznana operacja." });
      }
      const authority = managed?.grant ?? session.grants?.[item.id];
      const reviewed = !delegated && command.type === "confirm" && item.history.findLast((entry) => entry.action === "review");
      const { confirmation, ...updated } = item;
      item = { ...updated, revision: item.revision + 1, history: [...item.history, { status: item.status, at: timestamp(at),
        ...(delegated && { action: command.type, trusted: managed?.trusted ?? authority.trusted, actor: managed?.actor,
          grant: managed?.grant.id, receipt: item.receipt?.number, eventId: "workflow:" + randomUUID() }),
        ...(reviewed && { action: command.type, trusted: reviewed.trusted, actor: profiles.find(({ id }) => id === session.profile)?.name,
          grant: reviewed.grant, receipt: item.receipt?.number, eventId: "workflow:" + randomUUID() }) }] };
    }
    const next = [...items.filter(({ id }) => id !== item.id), item];
    return commit(delegated ? linked[0] : key, { ...session, items: next }, reply, 200, snapshot(next));
  }
  return { handler, profileSession, sessionForKey, assignments, controlHistory,
    hasLegacyGrant(key, id, room, at) {
      const grant = sessionForKey(key, at)?.grants?.[id];
      return grant?.trusted === room.token && activeGrant(grant, at);
    } };
}
