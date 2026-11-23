import { randomBytes, randomUUID } from "node:crypto";
import { profiles } from "../src/domain.ts";
import { fineDueDate, workflowDetails } from "../src/workflows/model.ts";
import { operations } from "../src/most/control-model.ts";
import { activeConnection, bearer, day, dayAfterInWarsaw, grantStatus, isoDay, permits, warsawDate } from "./most-policy.mjs";
import { formalTemplateFor, legalTemplates } from "./most-legal.mjs";

const token = () => randomBytes(24).toString("base64url");
const time = (at) => new Date(at).toISOString();
const url = (kind, key) => kind === "letter" ? "/?most=pomoc#most=" + key : "/#workflow=" + key;
const vehicle = { id: "vehicle", title: "Samochód demonstracyjny · wszystkie terminy", kind: "vehicle", actions: ["monitor"] };
const letter = { id: "letter", title: "Wezwanie do uzupełnienia wniosku", kind: "letter", actions: ["view", "monitor", "prepare", "attach", "submit"] };
const documents = [
  { id: "id-card", title: "Dowód osobisty", offset: 120 },
  { id: "passport", title: "Paszport", offset: 42 },
  { id: "licence", title: "Prawo jazdy", offset: 75 },
].map((item) => ({ ...item, kind: "document", actions: ["monitor", "view", "download"] }));
const vehicleDates = [
  { id: "inspection", title: "Badanie techniczne pojazdu", offset: 12, action: "Badanie wykonuje stacja kontroli pojazdów. Możesz przypomnieć właścicielowi." },
  { id: "insurance", title: "Koniec polisy OC", offset: 29, action: "Właściciel może sprawdzić warunki odnowienia u ubezpieczyciela." },
].map((item) => ({ ...item, group: "vehicle", kind: "deadline", actions: ["monitor"] }));
const profile = (id) => profiles.find((item) => item.id === id);
const requestable = [letter];
const reminders = [30, 14, 7, 1, 0];
const modes = new Set(["owner", "independent", "confirm"]);
const durations = new Set(["period", "once", "case", "open"]);

export function createMostControl(state, now = Date.now) {
  const { sessions, rooms } = state;
  const capability = new Map();
  for (const room of rooms)
    for (const grant of room.control?.grants ?? []) capability.set(grant.token, room.token);

  function initialize(room, at) {
    return room.control ??= { revision: 0, dates: {}, grants: [], history: [], notices: [], requests: [], created: at };
  }
  function audit(room, at, actor, label, detail, resource, result = "Zapisano", grant) {
    const control = initialize(room, at);
    control.history.push({ id: randomUUID(), at: time(at), actor, label, detail, resource, result, grant });
    if (control.history.length > 500) control.history.shift();
    control.revision++;
  }
  function notice(room, at, role, title, resource, unique) {
    const control = room.control;
    if (unique && control.notices.some((item) => item.unique === unique)) return;
    control.notices.push({ id: randomUUID(), at: time(at), role, title, resource, unique, read: false,
      ...(role === "helper" && { invitation: room.invitation?.token }) });
    if (control.notices.length > 350) control.notices.shift();
    control.revision++;
  }

  const boundLetter = (key, at) => {
    const entry = sessions.get(key);
    return entry?.role === "owner" && !entry.room.delegation && entry.room.expiresAt > at ? entry.room : null;
  };
  const bindWorkflow = (room, at) => workflows?.sessionForKey(room.control?.workflowKey, at);
  let workflows;
  let installLetter;
  let authenticator;
  let createPeer;
  let assistantIntent;
  function wire(adapters) { ({ workflows, installLetter, authenticator, createPeer, assistantIntent } = adapters); }
  const rootFor = (room) => room.control.root ? sessions.get(room.control.root)?.room : room;
  const peersOf = (room, at) => {
    const root = rootFor(room);
    return root ? [...rooms].filter((peer) => peer.expiresAt > at && (peer === root || peer.control?.root === root.token)) : [room];
  };
  const security = (room) => rootFor(room)?.control ?? room.control;

  function catalog(room, at) {
    const account = bindWorkflow(room, at);
    const ids = account ? new Set([...account.items.map(({ id }) => id), "registration", "tax-address"]) : [];
    const cases = [...ids].map((id) => ({
      id, title: workflowDetails[id].title, kind: ["fine", "tax"].includes(id) ? "payment" : "workflow",
      actions: ["view", "prepare", ...(["fine", "tax"].includes(id) ? ["monitor", "pay"] : ["submit"])],
    }));
    return [
      ...(room.control.profile === "ewa" ? [vehicle, ...vehicleDates] : []), ...documents,
      ...(boundLetter(room.control.letterKey, at) ? [letter] : []), ...cases,
    ];
  }
  const finished = (grant, at) => grant.resource === "letter" ? Boolean(boundLetter(grant.binding, at)?.sentAt)
    : Boolean(workflows?.sessionForKey(grant.binding, at)?.items.find(({ id }) => id === grant.resource)?.receipt);
  const status = (room, grant, at) => grantStatus(room, grant, at, (item) => finished(item, at));
  const allows = (room, grant, action, resource, at) => permits(room, grant, action, resource, at, (item) => finished(item, at));
  const allowed = (room, action, resource, at) => room.control.grants.find((grant) => allows(room, grant, action, resource, at));
  const actionAllowed = (room, grant, action, at) => allows(room, grant, action, grant.resource, at) &&
    (!["submit", "pay"].includes(action) || grant.mode !== "owner" &&
      (!grant.formalRequired || grant.formal?.status === "checked-demo"));
  const actorName = (room, role) => role === "owner" ? profile(room.control.profile)?.name ?? "Właściciel dostępu"
    : profile(room.control.helperProfile)?.name ?? "Osoba zaufana";

  function deadlines(room, at, includeBase = true) {
    const control = room.control;
    const days = (date) => Math.round((Date.parse(date) - Date.parse(warsawDate(at))) / day);
    const rows = (includeBase ? catalog(room, at) : []).flatMap((resource) => {
      const override = control.dates[resource.id];
      const paper = resource.id === "letter" && boundLetter(control.letterKey, at);
      const workflow = ["workflow", "payment"].includes(resource.kind) &&
        bindWorkflow(room, at)?.items.find(({ id }) => id === resource.id);
      const date = override || (resource.offset ? warsawDate(control.created + resource.offset * day)
        : paper ? warsawDate(paper.deadlineAt)
          : workflow?.id === "fine" ? fineDueDate(workflow.createdAt)
            : workflow?.id === "tax" ? warsawDate(Date.parse(workflow.createdAt) + 30 * day) : null);
      if (!date) return [];
      return [{ id: resource.id, title: resource.title, date, days: days(date), group: resource.group,
        source: override ? "Data wpisana przez właściciela" : paper ? "Pismo demonstracyjne" : "Dane demonstracyjne",
        category: resource.group ? "Pojazdy" : resource.kind === "document" ? "Dokumenty" : "Sprawy",
        done: Boolean(paper?.sentAt || workflow?.receipt),
        editable: Boolean(resource.offset), action: resource.action ??
          (resource.kind === "document" ? "Przed upływem ważności sprawdź zasady odnowienia dokumentu." : undefined) }];
    });
    for (const grant of control.grants) {
      if (status(room, grant, at) !== "active") continue;
      const date = warsawDate(grant.expires - 1);
      rows.push({ id: "grant:" + grant.id, title: "Koniec dostępu · " + grant.title, date, days: days(date), source: "Upoważnienie MOST",
        helper: actorName(room, "helper"),
        category: "Dostęp", done: false });
    }
    return rows.sort((left, right) => left.date.localeCompare(right.date));
  }
  function deadlineGrant(room, item, at) {
    return item.id.startsWith("grant:")
      ? room.control.grants.find((grant) => item.id === "grant:" + grant.id && status(room, grant, at) === "active")
      : allowed(room, "monitor", item.id, at) || (item.group && allowed(room, "monitor", item.group, at));
  }

  function sweep(at = now()) {
    let changed = false;
    for (const [key, roomKey] of capability) if (!(sessions.get(roomKey)?.room.expiresAt > at)) capability.delete(key);
    for (const room of rooms) {
      if (!room.control || room.expiresAt <= at) continue;
      const control = room.control;
      const previous = control.revision;
      for (const grant of control.grants) {
        const current = status(room, grant, at);
        if (current !== "expired" || grant.expiryRecorded) continue;
        grant.expiryRecorded = true;
        audit(room, at, "MOST", "Dostęp wygasł", grant.title, grant.resource, "Zakończono", grant.id);
        notice(room, at, "owner", "Wygasło upoważnienie", grant.resource);
      }
      for (const item of deadlines(room, at)) {
        if (item.done || item.days < 0) continue;
        const threshold = [...reminders].reverse().find((value) => item.days <= value);
        if (threshold === undefined) continue;
        const key = [item.id, item.date, threshold].join("|");
        if (!control.root || item.id.startsWith("grant:"))
          notice(room, at, "owner", "Termin: " + item.title, item.id, "owner|" + key);
        if (deadlineGrant(room, item, at))
          notice(room, at, "helper", "Termin: " + item.title, item.id, room.invitation.token + "|" + key);
      }
      changed ||= previous !== control.revision;
    }
    return changed;
  }

  function visibleNotices(room, role, rows, at) {
    return room.control.notices.filter((notice) => {
      if (notice.role !== role) return false;
      if (notice.unique && !rows.some(({ id, date, done }) => id === notice.resource && !done && notice.unique.includes("|" + date + "|"))) return false;
      if (role === "owner") return true;
      return notice.invitation === room.invitation.token &&
        (!notice.resource || rows.some(({ id }) => id === notice.resource) || room.control.grants.some((grant) =>
          grant.resource === notice.resource && status(room, grant, at) === "active"));
    }).map(({ id, at, title, read, resource }) => ({ id, at, title, read, resource })).reverse();
  }

  function access(key, at) {
    const room = sessions.get(capability.get(key))?.room;
    const current = room?.control?.grants.find((item) => item.token === key);
    return current ? { room, grant: current } : null;
  }
  function useGrant(key, action, at, detail, awaitingOwner = false) {
    const entry = access(key, at);
    if (!entry) return;
    const { room, grant } = entry;
    if (grant.duration === "once" && ["submit", "pay"].includes(action)) grant.used = true;
    audit(room, at, actorName(room, "helper"), action === "submit" ? "Wysłano odpowiedź w pokazie" : action === "pay" ? "Opłacono w pokazie" : action,
      detail, grant.resource, "Wykonano", grant.id);
    if (["submit", "pay"].includes(action)) notice(room, at, "owner", "Wykonano operację · " + grant.title, grant.resource);
    if (awaitingOwner) notice(room, at, "owner", "Szkic czeka na zatwierdzenie · " + grant.title, grant.resource);
  }
  function ownerLetterAction(key, at, action, detail) {
    const entry = access(key, at);
    if (!entry) return;
    const { room, grant } = entry;
    audit(room, at, actorName(room, "owner"), action, detail ?? grant.title, grant.resource, "Zapisano", grant.id);
    if (status(room, grant, at) === "active") notice(room, at, "helper", action + " · " + grant.title, grant.resource);
  }
  function denyGrant(key, at, action) {
    const entry = access(key, at);
    if (entry) audit(entry.room, at, actorName(entry.room, "helper"), "Odmowa dostępu", action, entry.grant.resource, "Odmówiono", entry.grant.id);
  }
  function recordRevocation(room, grant, at) {
    if (grant.revoked) return;
    grant.revoked = true;
    audit(room, at, actorName(room, "owner"), "Cofnięto dostęp", grant.title + " · " + actorName(room, "helper"), grant.resource, "Zakończono", grant.id);
    notice(room, at, "helper", "Zakres dostępu został zmieniony");
  }
  function resolveWorkflow(key, at) {
    const entry = access(key, at);
    if (!entry || !["workflow", "payment"].includes(entry.grant.kind)) return null;
    const { room, grant } = entry;
    return { key: grant.binding, id: grant.resource, grant, trusted: room.token, active: actionAllowed(room, grant, "view", at),
      allows: (action) => actionAllowed(room, grant, action, at), actor: actorName(room, "helper") };
  }
  function checkLetter(key, at, action) {
    const entry = access(key, at);
    if (!entry || entry.grant.kind !== "letter") return false;
    return actionAllowed(entry.room, entry.grant, action, at);
  }
  function workflowGrants(key, id, at) {
    return [...rooms].flatMap((room) => (room.control?.grants ?? []).filter((grant) =>
      ["workflow", "payment"].includes(grant.kind) && grant.binding === key && grant.resource === id &&
      status(room, grant, at) === "active"));
  }

  function caseSummary(room, resource, at, grant, legacy) {
    const paper = resource.kind === "letter" && boundLetter(grant?.binding ?? room.control.letterKey, at);
    const workflow = !paper && (legacy?.item ?? (!legacy && bindWorkflow(room, at)?.items.find(({ id }) => id === resource.id)));
    const stage = paper
      ? paper.sentAt || paper.status === "rejected" ? "done" : paper.status === "review" ? "review" :
        paper.status === "finished" ? "approved" : paper.status === "correction" ? "correction" :
          paper.work.address || paper.work.reason || paper.work.attachment ? "draft" : "new"
      : workflow?.receipt ? "done" : workflow?.approval === "requested" ? "review" : workflow?.input ? "draft" : "new";
    const updated = paper ? paper.history.at(-1)?.at : workflow?.history.at(-1)?.at;
    return { id: resource.id, kind: resource.kind, title: resource.title, stage, updated,
      ...(resource.kind === "payment" && { paymentAmount: workflow?.paymentAmount ?? workflowDetails[resource.id]?.amount }),
      ...(grant && { href: url(grant.kind, grant.token), grantId: grant.id }),
      ...(legacy && { href: url(resource.kind, legacy.token) }),
    };
  }

  function project(room, role, at, { grants = room.control.grants } = {}) {
    const control = room.control;
    const owner = role === "owner";
    const connected = activeConnection(room, room.invitation?.token, at);
    const peers = owner ? peersOf(room, at) : [room];
    const visibleDeadlines = owner
      ? peers.flatMap((peer) => deadlines(peer, at, peer === room)).sort((a, b) => a.date.localeCompare(b.date))
      : deadlines(room, at).filter((item) => deadlineGrant(room, item, at));
    const rows = visibleDeadlines.map(({ group, ...item }) => {
      const linked = grants.find((grant) => grant.resource === item.id && actionAllowed(room, grant, "view", at));
      return { ...item, editable: owner && item.editable, ...(linked && { href: url(linked.kind, linked.token) }) };
    });
    const activeGrants = grants.filter((grant) => owner || status(room, grant, at) === "active");
    const assignments = connected ? workflows?.assignments(room, at, true) ?? [] : [];
    const linkedRooms = connected ? [...rooms].filter((candidate) => {
      const invite = candidate.invitation;
      return invite?.trustedRoom === room.token && invite.trustedInvitation === room.invitation.token &&
        !invite.control && !candidate.delegation && invite.expiresAt > at && ["active", "waiting"].includes(invite.status);
    }) : [];
    const history = owner ? [
      ...peers.flatMap((peer) => peer.control.history),
      ...linkedRooms.flatMap((item) => item.history.filter((event) => event.type === "send" && event.role === "helper")
        .map((event) => ({ id: "letter:" + event.id, at: event.at, label: "Wysłano odpowiedź w pokazie", actor: actorName(room, "helper"), detail: event.detail }))),
      ...peers.flatMap((peer) => workflows?.controlHistory(peer, actorName(peer, "helper")) ?? []),
    ].sort((a, b) => b.at.localeCompare(a.at)) : [];
    const caseResources = catalog(room, at).filter(({ kind }) => ["letter", "payment", "workflow"].includes(kind));
    const cases = caseResources.flatMap((resource) => {
      if (owner) {
        const current = grants.find((grant) => grant.resource === resource.id && status(room, grant, at) === "active");
        const people = peers.filter((peer) => peer.control.grants.some((grant) => grant.resource === resource.id && status(peer, grant, at) === "active") ||
          workflows?.hasLegacyGrant(room.control.workflowKey, resource.id, peer, at) ||
          resource.id === "letter" && boundLetter(room.control.letterKey, at)?.invitation?.trustedRoom === peer.token &&
          linkedRooms.includes(boundLetter(room.control.letterKey, at))).map((peer) => actorName(peer, "helper"));
        const { href, ...summary } = caseSummary(room, resource, at, current);
        return [{ ...summary, people }];
      }
      const grant = activeGrants.find((item) => item.resource === resource.id && actionAllowed(room, item, "view", at));
      const legacy = resource.id === "letter" && linkedRooms[0] ? { token: linkedRooms[0].invitation.token }
        : assignments.find((item) => item.id === resource.id);
      return grant || legacy ? [caseSummary(room, resource, at, grant, legacy)] : [];
    });
    if (!owner) for (const item of assignments) {
      if (cases.some(({ id }) => id === item.id)) continue;
      const kind = ["fine", "tax"].includes(item.id) ? "payment" : "workflow";
      cases.push(caseSummary(room, { id: item.id, title: item.title, kind }, at, undefined, item));
    }
    const notifications = peers.flatMap((peer) => visibleNotices(peer, role, rows, at));
    if (owner) {
      for (const peer of peers) for (const item of workflows?.controlHistory(peer, actorName(peer, "helper")) ?? []) {
        if (!["Opłacono w pokazie", "Wysłano zgłoszenie w pokazie", "Przekazano do zatwierdzenia"].includes(item.label)) continue;
        notifications.push({ id: item.id, at: item.at, title: item.label + " · " + item.detail,
          resource: item.resource, read: (security(room).workflowRead ?? []).includes(item.id) });
      }
    }
    notifications.sort((a, b) => b.at.localeCompare(a.at));
    return {
      role, revision: control.revision, owner: actorName(room, "owner"), helper: actorName(room, "helper"), helperProfile: control.helperProfile,
      ...(owner && { passkeyRegistered: Boolean(security(room).passkey), connections: peersOf(room, at).map((peer) => ({
        token: peer.token, primary: !peer.control.root, current: peer === room, name: actorName(peer, "helper"),
        status: activeConnection(peer, peer.invitation?.token, at) ? "active" : peer.invitation?.status ?? "waiting",
        lastActivity: peer.control.history.at(-1)?.at,
      })) }),
      connectedAt: connected ? time(room.invitation.joinedAt ?? control.created) : undefined,
      resources: owner ? catalog(room, at).map(({ offset, action, ...resource }) => resource) : requestable.map(({ id, kind }) => ({ id, kind, title: "Dostęp do pisma urzędowego", actions: ["view"] })),
      grants: activeGrants.map((grant) => {
        const current = status(room, grant, at);
        const { id, title, resource, created, expires, actions, mode, duration, end, formal, formalRequired } = grant;
        return { id, title, resource, created, expires, actions, mode, duration, end, formalRequired, status: current,
          ...(formalRequired && { waitingForFormal: formal?.status !== "checked-demo" }),
          ...(current === "active" && !owner && grant.actions.includes("view") && ["letter", "workflow", "payment"].includes(grant.kind) &&
            { href: url(grant.kind, grant.token) }),
          ...(owner && formal && { formal: ["active", "completed"].includes(current) ? formal : { ...formal, status: current } }),
        };
      }),
      deadlines: rows, history, cases,
      notifications,
      requests: control.requests.filter((request) => owner || request.invitation === room.invitation.token)
        .map(({ invitation, ...request }) => request),
      assignments: owner ? [] : [
        ...assignments.map((item) => ({ title: item.title, href: url("workflow", item.token) })),
        ...linkedRooms.map((item) => ({ title: letter.title, href: url("letter", item.invitation.token) })),
      ],
    };
  }

  function validate(room, input, at) {
    const item = catalog(room, at).find(({ id }) => id === input?.resource);
    if (!item || !Array.isArray(input.actions) || !input.actions.length || input.actions.length > item.actions.length ||
        input.actions.some((action) => !item.actions.includes(action)) || new Set(input.actions).size !== input.actions.length ||
        !modes.has(input.mode) || !durations.has(input.duration)) return null;
    const { actions, mode, duration, end, formalRequired } = input;
    const executable = actions.includes("submit") || actions.includes("pay");
    const caseType = ["letter", "workflow", "payment"].includes(item.kind);
    if ((actions.includes("download") || actions.includes("prepare")) && !actions.includes("view") ||
        actions.includes("attach") && !actions.includes("prepare") ||
        executable && (!actions.includes("prepare") || mode === "owner") ||
        caseType && !actions.includes("view") && !actions.every((action) => action === "monitor") ||
        formalRequired === true && (!executable || !caseType) || duration === "once" && !executable || duration === "case" && !caseType ||
        duration === "period" && (!isoDay(end) || dayAfterInWarsaw(end) <= at)) return null;
    const binding = item.kind === "letter" ? room.control.letterKey : caseType ? room.control.workflowKey : undefined;
    const caseExpiry = item.kind === "letter" ? boundLetter(binding, at)?.expiresAt : caseType ? bindWorkflow(room, at)?.expires : Infinity;
    const expires = Math.min(room.invitation.expiresAt, caseExpiry, duration === "period" ? dayAfterInWarsaw(end) : Infinity);
    if (caseType && binding && duration === "case" && finished({ resource: item.id, binding }, at)) return null;
    return { resource: item.id, title: item.title, kind: item.kind, duration, actions, mode, expires, binding, formalRequired: formalRequired === true,
      ...(duration === "period" && { end }) };
  }

  function issue(room, selection, at, changeId, requestId) {
    const control = room.control;
    if (control.grants.length >= 100 || !activeConnection(room, room.invitation?.token, at)) return null;
    const old = changeId && control.grants.find((item) => item.id === changeId && status(room, item, at) === "active");
    if (changeId && (!old || old.resource !== selection.resource)) return null;
    const request = requestId && control.requests.find((item) => item.id === requestId && item.status === "pending" &&
      item.invitation === room.invitation.token && item.resource === selection.resource);
    if (requestId && !request) return null;
    if (control.grants.some((item) => item !== old && item.resource === selection.resource && status(room, item, at) === "active")) return null;
    if (["workflow", "payment"].includes(selection.kind) && workflows?.hasLegacyGrant(selection.binding, selection.resource, room, at)) return null;
    const grant = { ...selection, id: randomUUID(), invitation: room.invitation.token, token: token(), created: time(at) };
    if (grant.kind === "letter" && grant.actions.includes("view") &&
        !installLetter?.(boundLetter(grant.binding, at), room, grant, at, old?.token)) return null;
    if (old) old.revoked = true;
    if (request) request.status = "accepted";
    control.grants.push(grant);
    capability.set(grant.token, room.token);
    audit(room, at, actorName(room, "owner"), old ? "Zmieniono zakres dostępu" : request ? "Zatwierdzono prośbę o dostęp" : "Udzielono dostępu",
      grant.title + " · " + actorName(room, "helper"), grant.resource, "Zapisano", grant.id);
    notice(room, at, "helper", "Nowy zakres dostępu · " + grant.title, grant.resource);
    return grant;
  }

  async function assistant(room, role, command, at, exactResource) {
    const text = command.text;
    if (typeof text !== "string" || !text.trim() || text.length > 1000) return null;
    const value = text.toLocaleLowerCase("pl");
    if (/wynik|zdrow|badań krwi|pesel|bank|hasło/.test(value))
      return { text: "Ten kontekst MOST nie udostępnia takich danych.", links: [] };
    const candidates = role === "owner" ? ["history"] : ["letter", "fine", "tax"]
      .filter((id) => (!exactResource || id === exactResource) && allowed(room, "view", id, at));
    const recent = (room.control.assistantCalls ?? []).filter((call) => call > at - 60_000);
    let intent = { provider: "demo" };
    if (recent.length < 5 && assistantIntent) {
      room.control.assistantCalls = [...recent, at];
      intent = await assistantIntent(text, candidates);
    }
    const current = now();
    if (role === "helper" && !activeConnection(room, command.invitation, current)) return null;
    if (exactResource && !allowed(room, "view", exactResource, current)) return null;
    const view = project(room, role, current);
    if (role === "owner" && (/zrobi|histori|ostatni/.test(value) || intent.selected === "history")) {
      const events = view.history.filter((item) => Date.parse(item.at) >= at - 7 * day && item.actor === view.helper);
      return { text: events.length ? events.slice(0, 8).map((item) => item.label + (item.detail ? " · " + item.detail : "")).join("\n")
        : "W ostatnich siedmiu dniach nie zapisano działań tej osoby.", links: [], provider: intent.provider };
    }
    const resource = /pism|wezwani|umow|umów|odpowied/.test(value) ? "letter" : /mandat/.test(value) ? "fine" :
      /podat/.test(value) ? "tax" : exactResource ?? (candidates.includes(intent.selected) ? intent.selected : null);
    if (role === "helper" && resource) {
      const grant = (!exactResource || exactResource === resource) && allowed(room, "view", resource, current);
      if (!grant) return { text: "Brakuje odpowiedniego upoważnienia. Możesz poprosić właściciela o dostęp do pisma w Centrum kontroli.", links: [] };
      const paper = resource === "letter" && boundLetter(grant.binding, current);
      const intro = "Działasz w imieniu: " + view.owner + ". ";
      return { text: intro + (paper
        ? "Pismo dotyczy uzupełnienia wniosku o kopię umowy najmu. " + (paper.sentAt ? "Odpowiedź wysłano w pokazie." : "Sprawdź wymagane pola i załącznik w udostępnionej sprawie.")
        : grant.title + ". Otwórz sprawę, aby sprawdzić status.") +
        (grant.mode === "owner" ? " Końcową operację zatwierdza właściciel." : " Ewentualne wykonanie potwierdzisz w formularzu sprawy."),
      links: exactResource ? [] : [{ title: "Otwórz udostępnioną sprawę", href: url(grant.kind, grant.token) }], provider: intent.provider };
    }
    if (intent.selected === "unavailable") return { text: "To pytanie wykracza poza sprawy i terminy widoczne w tym kontekście.", links: [], provider: intent.provider };
    const due = view.deadlines.filter((item) => !item.done && item.days <= 7).slice(0, 6);
    return { text: (role === "helper" ? "Pomagasz osobie: " + view.owner + ". " : "") +
      (due.length ? due.map((item) => item.title + " · " + item.date).join("\n") : "W widocznym zakresie nie ma terminów do załatwienia w ciągu siedmiu dni.") +
      (view.grants.length ? "\nZakres: " + view.grants.filter((item) => item.status === "active").map((item) => item.title).join(", ") + "." : ""),
      links: view.grants.filter((item) => item.href).map(({ title, href }) => ({ title, href })), provider: intent.provider };
  }

  async function handler(req, reply, command) {
    const at = now();
    const key = bearer(req);
    const moderated = command?.type === "assistant" && access(key, at);
    if (moderated) {
      const { room, grant } = moderated;
      if (grant.kind !== "letter" || !allows(room, grant, "view", "letter", at)) return reply(410, { error: "Dostęp do sprawy został zakończony." });
      const answer = await assistant(room, "helper", { text: command.text, invitation: grant.invitation }, at, "letter");
      if (access(key, now())?.grant !== grant || !allows(room, grant, "view", "letter", now()))
        return reply(410, { error: "Dostęp do sprawy został zakończony." });
      return answer ? reply(200, { answer }) : reply(400, { error: "Wpisz krótkie pytanie." });
    }
    const entry = sessions.get(key);
    if (!entry || entry.room.delegation?.kind !== "trusted" || entry.room.expiresAt <= at)
      return reply(401, { error: "Sesja Centrum kontroli wygasła." });
    const { room, role } = entry;
    const owner = role === "owner";
    if (!owner && !activeConnection(room, bearer(req), at))
      return reply(410, { error: "Dostęp do Centrum kontroli został zakończony." });
    const control = initialize(room, at);
    const done = (extra) => reply(200, { view: project(room, role, at), ...extra });
    const invalid = (error = "Sprawdź zakres i czas dostępu.") => reply(400, { error });
    const conflict = (error) => reply(409, { error });
    const denied = () => {
      audit(room, at, actorName(room, role), "Odmowa dostępu", "Operacja Centrum kontroli", undefined, "Odmówiono");
      return reply(403, { error: "Ta czynność wykracza poza zakres dostępu." });
    };
    if (req.method === "GET") { sweep(at); return done(); }
    const type = command?.type;
    if (type === "bind" && owner) {
      const account = workflows?.sessionForKey(command.workflowKey, at);
      if (!account || control.workflowKey && control.workflowKey !== command.workflowKey)
        return denied();
      if (command.letterKey && (account.profile !== "ewa" || !boundLetter(command.letterKey, at) ||
          control.letterKey && control.letterKey !== command.letterKey)) return denied();
      control.workflowKey = command.workflowKey;
      control.profile = account.profile;
      if (command.letterKey) control.letterKey = command.letterKey;
      if (rootFor(room) === room) for (const peer of peersOf(room, at)) {
        if (peer === room) continue;
        peer.control.workflowKey = control.workflowKey;
        peer.control.profile = control.profile;
        peer.control.letterKey = control.letterKey;
      }
      control.revision++;
      sweep(at);
      return done();
    }
    if (type === "assistant") {
      const answer = await assistant(room, role, { text: command.text, invitation: key }, at);
      if (sessions.get(key)?.room !== room || !owner && !activeConnection(room, key, now()))
        return reply(410, { error: "Dostęp do Centrum kontroli został zakończony." });
      return answer ? reply(200, { view: project(room, role, now()), answer }) : invalid("Wpisz krótkie pytanie.");
    }
    if (type === "case-open" && !owner) {
      const grant = allowed(room, "view", command.resource, at);
      if (!grant || !["letter", "workflow", "payment"].includes(grant.kind)) return denied();
      audit(room, at, actorName(room, role), "Otwarto sprawę w panelu Pomagam", grant.title, grant.resource, "Odczytano", grant.id);
      return done();
    }
    if (type === "read") {
      const view = project(room, role, at);
      if (!view.notifications.some(({ id }) => id === command.id)) return denied();
      const item = (owner ? peersOf(room, at) : [room]).flatMap((peer) => peer.control.notices).find(({ id }) => id === command.id);
      if (item) item.read = true;
      else if (owner) {
        const account = security(room);
        if (!(account.workflowRead ?? []).includes(command.id)) (account.workflowRead ??= []).push(command.id);
      }
      control.revision++;
      return done();
    }
    if (type === "document") {
      const document = documents.find(({ id }) => id === command.id);
      const action = command.download === true ? "download" : "view";
      const grant = document && !owner && allowed(room, action, document.id, at);
      if (!document || !owner && !grant) return denied();
      const date = control.dates[document.id] ?? warsawDate(control.created + document.offset * day);
      audit(room, at, actorName(room, role), action === "download" ? "Pobrano dokument" : "Otwarto dokument", document.title, document.id, "Odczytano", grant?.id);
      return done({ document: { title: document.title,
        text: ["DOKUMENT FIKCYJNY · MOST", document.title, "Profil demonstracyjny: " + actorName(room, "owner"), "Ważność: " + date].join("\n") } });
    }
    if (type === "request" && !owner) {
      const item = requestable.find(({ id }) => id === command.resource);
      if (!item) return denied();
      if (control.requests.some((item) => item.resource === command.resource && item.invitation === room.invitation.token && item.status === "pending"))
        return conflict("Prośba czeka już na decyzję.");
      if (control.requests.length >= 50) return conflict("Osiągnięto limit próśb w pokazie.");
      control.requests.push({ id: randomUUID(), resource: item.id, title: "Dostęp do pisma urzędowego", at: time(at),
        status: "pending", invitation: room.invitation.token });
      audit(room, at, actorName(room, role), "Poproszono o dostęp", "Pismo urzędowe", item.id);
      notice(room, at, "owner", "Osoba zaufana prosi o dostęp do pisma", item.id);
      return done();
    }
    if (type === "nudge" && !owner) {
      const item = deadlines(room, at).find(({ id, done }) => id === command.id && !done);
      if (!item || !deadlineGrant(room, item, at)) return denied();
      notice(room, at, "owner", "Osoba zaufana przypomina · " + item.title, item.id,
        "nudge|" + item.id + "|" + item.date + "|" + warsawDate(at) + "|");
      return done();
    }
    if (!owner) return denied();
    if (type === "add-peer") {
      const root = rootFor(room);
      if (!root || root.expiresAt <= at || peersOf(room, at).length >= 5) return conflict("Centrum osiągnęło limit połączeń w pokazie.");
      const peer = createPeer?.();
      if (!peer) return conflict("Nie można teraz przygotować kolejnego połączenia.");
      const main = root.control;
      peer.expiresAt = Math.min(peer.expiresAt, root.expiresAt);
      Object.assign(initialize(peer, at), { root: root.token, created: main.created, dates: main.dates,
        workflowKey: main.workflowKey, letterKey: main.letterKey, profile: main.profile });
      return done({ peer: peer.token });
    }
    if (type === "deadline") {
      const item = catalog(room, at).find(({ id, offset }) => id === command.id && offset);
      if (!item || !isoDay(command.date) || !/^(20|21)\d\d/.test(command.date)) return invalid("Wpisz poprawną datę terminu.");
      if (control.dates[item.id] !== command.date) {
        control.dates[item.id] = command.date;
        audit(room, at, actorName(room, role), "Zmieniono termin", item.title + " · " + command.date, item.id);
        sweep(at);
      }
      return done();
    }
    if (type === "reject") {
      const request = control.requests.find((item) => item.id === command.id && item.status === "pending");
      if (!request) return conflict("Ta prośba została już rozpatrzona.");
      request.status = "rejected";
      audit(room, at, actorName(room, role), "Odrzucono prośbę o dostęp", request.title, request.resource);
      if (request.invitation === room.invitation?.token) notice(room, at, "helper", "Właściciel odrzucił prośbę o dostęp");
      return done();
    }
    if (type === "authorize") {
      if (!activeConnection(room, room.invitation?.token, at)) return conflict("Najpierw połącz osobę zaufaną kodem QR.");
      const selection = validate(room, command.selection, at);
      if (!selection || command.changeId && typeof command.changeId !== "string" || command.requestId && typeof command.requestId !== "string") return invalid();
      const authorization = { key: token(), until: at + 120_000, invitation: room.invitation.token,
        input: command.selection, changeId: command.changeId, requestId: command.requestId };
      const account = security(room);
      const method = authenticator?.available(account) ? "passkey" : "demo";
      const options = method === "passkey" && await authenticator.options(account, req, authorization.key);
      if (method === "passkey" && !options) return conflict("Otwórz MOST pod adresem, na którym zarejestrowano klucz dostępu.");
      if (room.invitation?.token !== authorization.invitation || !activeConnection(room, authorization.invitation, now()))
        return conflict("Połączenie się zmieniło. Otwórz aktualny zakres.");
      control.authorization = authorization;
      return done({ authorization: { key: authorization.key, method, ...(options && { options }) } });
    }
    if (type === "grant") {
      const authorization = control.authorization;
      if (!authorization || authorization.key !== command.key || authorization.until <= at ||
          authorization.invitation !== room.invitation?.token) return conflict("Potwierdzenie wygasło. Sprawdź zakres ponownie.");
      const account = security(room);
      const passkey = account.passkey;
      const counter = passkey ? await authenticator.verify(account, req, authorization.key, command.assertion) : null;
      if (passkey ? counter === null : command.confirmDemo !== true) return denied();
      const confirmedAt = now();
      if (control.authorization !== authorization || account.passkey !== passkey || authorization.until <= confirmedAt ||
          sessions.get(bearer(req))?.room !== room || !activeConnection(room, authorization.invitation, confirmedAt))
        return conflict("Zakres lub połączenie się zmieniły.");
      const selection = validate(room, authorization.input, confirmedAt);
      if (!selection) return conflict("Zakres lub połączenie się zmieniły.");
      delete control.authorization;
      if (passkey) passkey.credential.counter = counter;
      if (!issue(room, selection, confirmedAt, authorization.changeId, authorization.requestId))
        return conflict("Ten zakres jest już przyznany lub sprawa ma aktywne zaproszenie.");
      sweep(confirmedAt);
      return done();
    }
    if (type === "passkey-start") {
      const account = security(room);
      const result = await authenticator?.start(account, req);
      if (!result || account.passkey || sessions.get(bearer(req))?.room !== room) return denied();
      account.registration = { ...result.registration, until: at + 120_000 };
      return done({ passkey: { options: result.options } });
    }
    if (type === "passkey-finish") {
      const account = security(room);
      const registration = account.registration;
      if (!registration || registration.until <= at || account.passkey) return denied();
      const result = await authenticator?.finish(req, registration, command.credential);
      if (account.registration !== registration || sessions.get(bearer(req))?.room !== room ||
          registration.until <= now() || account.passkey) return denied();
      delete account.registration;
      if (!result) return denied();
      for (const peer of peersOf(room, at)) delete peer.control.authorization;
      account.passkey = result;
      audit(room, at, actorName(room, role), "Dodano klucz dostępu");
      return done({ passkey: { registered: true } });
    }
    const grant = control.grants.find(({ id }) => id === command?.id);
    if (type === "formal-document" && grant?.formal) {
      const item = grant.formal;
      const current = status(room, grant, at);
      const formalStatus = {
        draft: "Szkic", awaiting: "Oczekuje na podpis demonstracyjny", "signed-demo": "Podpisano w symulacji",
        "pending-demo": "Oczekuje na weryfikację demonstracyjną", "checked-demo": "Sprawdzono w symulacji",
        "rejected-demo": "Odrzucono w symulacji", revoked: "Cofnięto", expired: "Wygasło",
      };
      const documentStatus = current === "expired" ? "expired" : current === "revoked" ? "revoked" : item.status;
      const dateTime = (date) => new Intl.DateTimeFormat("pl", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Warsaw" }).format(new Date(date));
      audit(room, at, actorName(room, role), command.download === true ? "Pobrano pełnomocnictwo" : "Otwarto pełnomocnictwo",
        item.reference, grant.resource, "Odczytano", grant.id);
      return done({ document: { title: item.reference, text: [
        "PEŁNOMOCNICTWO · WZÓR DEMONSTRACYJNY MOST", "Numer " + item.reference + " · wersja " + item.version,
        "Mocodawca: " + (item.principal ?? actorName(room, "owner")),
        "Pełnomocnik: " + (item.representative ?? actorName(room, "helper")), "Sprawa: " + grant.title,
        item.procedure, item.scope, "Forma: " + item.form, "Sporządzono: " + dateTime(item.created),
        ...(item.basis ? ["Podstawa wzoru: " + item.basis.label] : []),
        "Zakres upoważnienia w MOST: " + grant.actions.map((action) => operations[action]).join(", "),
        "Dostęp w MOST do: " + dateTime(grant.expires), "Status: " + formalStatus[documentStatus],
        ...(item.method ? ["Symulowana metoda podpisu: " + item.method] : []),
        ...(item.signedAt ? ["Potwierdzono symulację: " + dateTime(item.signedAt)] : []),
        "Dokument demonstracyjny bez skutków prawnych.",
      ].join("\n") } });
    }
    if (!grant || status(room, grant, at) !== "active") return conflict("Dostęp został już zakończony.");
    if (type === "revoke") {
      recordRevocation(room, grant, at);
      return done();
    }
    if (type === "formal-draft") {
      if (command.procedure !== formalTemplateFor(grant.resource) || !["letter", "workflow", "payment"].includes(grant.kind) ||
          grant.formal && !["draft", "rejected-demo"].includes(grant.formal.status)) return invalid("Wybierz właściwy wzór.");
      const template = legalTemplates[command.procedure];
      grant.formal = { ...template, reference: grant.formal?.reference ?? "MOST-DEMO-" + randomBytes(5).toString("hex").toUpperCase(),
        version: (grant.formal?.version ?? 0) + 1, created: time(at), status: "draft", simulation: true,
        principal: actorName(room, "owner"), representative: actorName(room, "helper") };
    } else if (type === "formal-method" && grant.formal?.status === "draft" &&
        (grant.formal.methods ?? legalTemplates[formalTemplateFor(grant.resource)].methods).includes(command.method)) {
      grant.formal.method = command.method;
      grant.formal.status = "awaiting";
    } else if (type === "formal-sign" && grant.formal?.status === "awaiting" && command.confirmDemo === true) {
      grant.formal.status = "signed-demo";
      grant.formal.signedAt = time(at);
    } else if (type === "formal-review" && grant.formal?.status === "signed-demo") {
      grant.formal.status = "pending-demo";
    } else if (type === "formal-result" && grant.formal?.status === "pending-demo" && typeof command.accept === "boolean") {
      grant.formal.status = command.accept ? "checked-demo" : "rejected-demo";
    } else return invalid("Ta zmiana statusu dokumentu jest niedostępna.");
    audit(room, at, actorName(room, role), "Zmieniono status dokumentu demonstracyjnego", grant.formal.reference, grant.resource, "Zapisano", grant.id);
    return done();
  }

  return { handler, sweep, wire, checkLetter, resolveWorkflow, workflowGrants, useGrant, ownerLetterAction, denyGrant,
    revokeLetter(key, at) {
      const entry = access(key, at);
      if (entry?.grant.kind === "letter") recordRevocation(entry.room, entry.grant, at);
    },
    join(room, id, at) {
      const control = initialize(room, at);
      control.helperProfile = profile(id) && id !== control.profile ? id : control.profile === "kacper" ? "ewa" : "kacper";
      audit(room, at, actorName(room, "helper"), "Połączono osobę zaufaną");
    },
    checkManaged: (key, at) => { const entry = access(key, at); return entry && status(entry.room, entry.grant, at); } };
}
