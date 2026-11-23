import { randomBytes } from "node:crypto";
import { delegationScope, delegationTitles, formatMostDeadline, initialScope } from "../src/most/model.ts";
import { caseMeta } from "../src/domain.ts";
import { activeConnection } from "./most-policy.mjs";

const tenMinutes = 600_000;
const roomLifetime = 14 * 86_400_000;
const makeToken = () => randomBytes(24).toString("base64url");
const attachments = {
  helper: { name: "Umowa najmu — kopia demonstracyjna.txt", text: "Fikcyjna kopia umowy najmu. Na potrzeby pokazu potwierdza prawo Ewy do lokalu przy ul. Lipowej 12/4 w Lublinie." },
  owner: { name: "Umowa najmu z dokumentów Ewy — demo.txt", text: "Fikcyjna kopia umowy udostępniona przez Ewę. Na potrzeby pokazu potwierdza prawo do lokalu przy ul. Lipowej 12/4 w Lublinie." },
};
const letter = {
  title: "Wezwanie do uzupełnienia wniosku",
  office: "Urząd Miasta Lublin",
  body: "Prosimy o uzupełnienie wniosku o dokument potwierdzający tytuł prawny do lokalu. Można dołączyć kopię umowy najmu.",
  reference: "LUB/DEMO/062",
  pesel: "00000000000",
};
const inboxTypes = {
  owner: new Set(["letter", "reminder", "join", "request", "review", "accept", "revoke", "expiry", "send"]),
  helper: new Set(["invite", "join", "share", "correction", "accept", "reject", "revoke", "expiry", "send"]),
};
const validAddress = (value) => typeof value === "string" && value.trim().length >= 8 && /\d/.test(value);
const validReason = (value) => typeof value === "string" && value.trim().length >= 15;
const completeLetter = (work) => validAddress(work.address) && validReason(work.reason) && !!work.attachment;
const hasDraft = (work, scope) => Boolean(
  scope.form && work.address || scope.response && work.reason || scope.attachments && work.attachment,
);

export function installControlledLetter(sessions, paper, trusted, grant, at, previous, control) {
  if (!paper || paper.sentAt || paper.helpers.size >= 50) return false;
  const current = paper.invitation;
  const active = current && ["active", "waiting"].includes(current.status) && current.expiresAt > at &&
    (!current.control || control.checkManaged(current.token, at) === "active");
  if (active && current.token !== previous) return false;
  const prepares = grant.actions.includes("prepare");
  paper.invitation = {
    token: grant.token, trustedRoom: trusted.token, trustedInvitation: grant.invitation, control: true,
    scope: { document: true, reference: true, form: prepares, response: prepares,
      attachments: grant.actions.includes("attach"), requestDocument: false, comments: false },
    status: "active", expiresAt: grant.expires, startedAt: at, startId: paper.revision + 1, seenAt: 0,
    maySubmit: grant.actions.includes("submit"), confirmationMode: grant.mode,
  };
  if (paper.status === "new") paper.status = "preparing";
  paper.helpers.add(grant.token);
  paper.read.helper.clear();
  sessions.set(grant.token, { room: paper, role: "helper" });
  paper.history.push({ id: ++paper.revision, role: "owner", type: "invite", at: new Date(at).toISOString() });
  return true;
}

export function createMostHandler(now = Date.now, state = {}, workflowAssignments = () => [], control) {
  const { rooms = new Set(), sessions = new Map() } = state;

  function event(room, role, type, at, details = {}) {
    room.history.push({ id: ++room.revision, role, type, at: new Date(at).toISOString(), ...details });
    return room.revision;
  }
  function initialize(room, at) {
    delete room.submittedPackage;
    delete room.previousPackage;
    delete room.sentAt;
    delete room.receipt;
    room.deadlineAt = at + 7 * 86_400_000;
    for (const token of room.helpers) sessions.delete(token);
    room.helpers.clear();
    Object.assign(room, { invitation: null, work: {}, comments: [], history: [], read: { owner: new Set(), helper: new Set() }, status: "new", corrected: true });
    event(room, "owner", "letter", at);
  }
  function notifications(room, role) {
    return room.history
      .filter(({ type, id }) => inboxTypes[role].has(type) && (role === "owner" || id >= room.invitation.startId))
      .map(({ id, at, type }) => ({ id, at, type, read: room.read[role].has(id) }))
      .reverse();
  }
  function view(room, role, at) {
    const owner = role === "owner";
    const { invitation, work } = room;
    const scope = invitation?.scope;
    const { title, office, reference } = letter;
    const body = letter.body + " Termin odpowiedzi: " + formatMostDeadline(room.deadlineAt) + ".";
    const complete = room.delegation ? !!work.reason : completeLetter(work);
    const maySubmit = Boolean(invitation?.maySubmit && (!invitation.control || control.checkLetter(invitation.token, at, "submit")));
    const partial = !owner && !room.delegation && !maySubmit && scope && hasDraft(work, scope);
    return {
      role, revision: room.revision, status: room.status, complete, canReview: (complete || !!partial) && room.corrected, deadlineAt: room.deadlineAt,
      ...(room.sentAt && { sentAt: room.sentAt }),
      ...(room.receipt && { receipt: room.receipt }),
      ...(room.delegation ? { delegation: room.delegation } : owner || scope?.document ? { document: owner ? { ...letter, body } : { title, office, body, ...(scope.reference ? { reference } : {}) } } : {}),
      ...(!owner && room.delegation?.kind === "trusted" && invitation.status === "active" ? {
        assignments: [...workflowAssignments(room, at), ...[...rooms].flatMap((candidate) => {
          const grant = candidate.invitation;
          return !grant?.control && grant?.trustedRoom === room.token && grant.trustedInvitation === invitation.token &&
            ["waiting", "active"].includes(grant.status) && grant.expiresAt > at
            ? [{ title: candidate.delegation ? delegationTitles[candidate.delegation.kind] : letter.title, token: grant.token, ...(candidate.delegation && { legacy: true }) }] : [];
        })],
      } : {}),
      invitation: invitation && {
        expiresAt: invitation.expiresAt, scope, status: invitation.status,
        online: invitation.status === "active" && at - invitation.seenAt < 4000,
        maySubmit,
        ...(invitation.control && { managed: true, confirmationMode: invitation.confirmationMode }),
        ...(owner && ["waiting", "active"].includes(invitation.status) ? { token: invitation.token } : {}),
      },
      ...(owner && room.status === "review" && room.previousPackage ? { previousPackage: room.previousPackage } : {}),
      work: owner ? work : {
        ...(scope.form ? { address: work.address } : {}),
        ...(scope.response ? { reason: work.reason } : {}),
        ...(scope.attachments || scope.requestDocument ? { attachment: work.attachment, documentRequest: work.documentRequest } : {}),
        ...(scope.attachments && work.upload && { upload: work.upload }),
        ...(invitation.maySubmit && { reviewId: work.reviewId }),
        feedback: work.feedback,
      },
      files: room.delegation ? {} : {
        ...(owner || scope.attachments ? { helper: attachments.helper } : {}),
        ...(owner || ((scope.attachments || scope.requestDocument) && work.documentRequest === "shared")
          ? { owner: attachments.owner } : {}),
      },
      comments: owner || scope?.comments ? room.comments : [],
      history: owner ? room.history : [],
      notifications: notifications(room, role),
    };
  }

  return function handler(req, reply, command) {
    const at = now();
    if (req.url === "/api/most/session") {
      for (const room of rooms) {
        if (room.expiresAt > at) continue;
        for (const token of room.helpers) sessions.delete(token);
        sessions.delete(room.token);
        rooms.delete(room);
      }
      if (rooms.size >= 256) return reply(503, { error: "Limit aktywnych pokazów został osiągnięty." });
      const token = makeToken();
      let delegation;
      if (command?.delegation) {
        const { kind, step } = command.delegation;
        if (typeof kind !== "string" || !Object.hasOwn(delegationTitles, kind))
          return reply(400, { error: "Nieznany rodzaj sprawy." });
        delegation = { kind };
        if (Number.isInteger(step) && caseMeta[kind]?.steps[step]) delegation.step = step;
      }
      const room = { token, expiresAt: at + roomLifetime, helpers: new Set(), revision: 0, delegation };
      initialize(room, at);
      rooms.add(room);
      sessions.set(token, { room, role: "owner" });
      return reply(201, { token, view: view(room, "owner", at) });
    }

    const token = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{32})$/)?.[1];
    const session = sessions.get(token);
    if (!session || session.room.expiresAt <= at)
      return reply(401, { code: "invalid", error: "Sesja demonstracyjna wygasła lub link jest nieprawidłowy." });

    const { room, role } = session;
    const owner = role === "owner";
    const invitation = room.invitation;
    const trustedRoom = invitation?.trustedRoom && sessions.get(invitation.trustedRoom)?.room;
    if (invitation && ["waiting", "active"].includes(invitation.status)) {
      const managed = invitation.control && control?.checkManaged(invitation.token, at);
      if (invitation.trustedRoom && (!activeConnection(trustedRoom, invitation.trustedInvitation, at) ||
          invitation.control && managed !== "active" && managed !== "expired")) {
        invitation.status = "revoked";
        event(room, "owner", "revoke", at);
      } else if (invitation.expiresAt <= at) {
        invitation.status = "expired";
        event(room, "owner", "expiry", at);
      }
    }
    if (!owner) {
      if (invitation?.token !== token || invitation.status === "revoked") {
        if (req.method === "POST") control?.denyGrant(token, at, "Obsługa pisma");
        return reply(410, { code: "revoked", error: "Dostęp do sprawy został zakończony." });
      }
      if (invitation.status === "expired") {
        if (req.method === "POST") control?.denyGrant(token, at, "Obsługa pisma");
        return reply(410, { code: "expired", error: "Czas dostępu do sprawy upłynął." });
      }
    }
    const scope = invitation?.scope;
    const active = invitation?.status === "active";
    const open = active || invitation?.status === "waiting";
    const done = () => reply(200, { view: view(room, role, at) });
    if (req.method === "GET") {
      const remaining = room.deadlineAt - at;
      if (owner && !room.delegation && !["finished", "rejected"].includes(room.status) && remaining >= 0 &&
          remaining <= 48 * 3_600_000 && !room.history.some(({ type }) => type === "reminder"))
        event(room, role, "reminder", at);
      if (!owner) {
        invitation.seenAt = at;
        if (!active && room.delegation?.kind !== "trusted") {
          invitation.status = "active";
          event(room, role, "join", at);
        }
      }
      return done();
    }

    const denied = () => {
      if (!owner && invitation?.control) control?.denyGrant(token, at, "Obsługa pisma");
      return reply(403, { error: "Ta czynność wykracza poza zakres Twojego dostępu." });
    };
    const conflict = (error) => reply(409, { error });
    const invalid = (error) => reply(400, { error });
    const work = room.work;
    const clean = (value, min, max) => typeof value === "string" && value.trim().length >= min && value.trim().length <= max ? value.trim() : null;
    const type = command?.type;
    if (!owner && invitation?.control) {
      const permission = { openDocument: "view", form: "prepare", response: "prepare", review: "prepare",
        attach: "attach", upload: "attach", saveDraft: "prepare", send: "submit", authorizeSend: "submit", read: "view" }[type];
      if (!permission || !control.checkLetter(token, at, permission)) return denied();
      if (type === "openDocument") {
        control.useGrant(token, "Otwarto pismo", at, letter.title);
        return done();
      }
    }
    if (type === "authorizeSend") {
      if (owner || !invitation?.control || invitation.confirmationMode !== "confirm") return denied();
      if (room.status !== "review" || !completeLetter(work) || command.reviewId !== work.reviewId)
        return conflict("Sprawdź aktualną wersję odpowiedzi.");
      const key = makeToken();
      invitation.confirmation = { key, reviewId: work.reviewId, until: at + 90_000 };
      return reply(200, { view: view(room, role, at), challenge: key });
    }
    if (type === "send") {
      if (room.delegation || (!owner && (!active || !invitation.maySubmit))) return denied();
      const canSend = owner ? room.status === "finished" : room.status === "review" || !!room.sentAt;
      if (!canSend || !completeLetter(work) || ((!owner || command.reviewId !== undefined) && command.reviewId !== work.reviewId))
        return conflict("Najpierw zatwierdź aktualną wersję pakietu.");
      if (!room.sentAt) {
        if (!owner && invitation.confirmationMode === "confirm") {
          const confirmation = invitation.confirmation;
          if (!confirmation || confirmation.until <= at || confirmation.reviewId !== work.reviewId || confirmation.key !== command.challenge)
            return denied();
          delete invitation.confirmation;
        }
        room.status = "finished";
        room.sentAt = new Date(at).toISOString();
        room.receipt = { number: "DEMO-UP-" + randomBytes(5).toString("hex").toUpperCase(), at: room.sentAt,
          version: work.reviewId, performedBy: role };
        const detail = [room.receipt.number, "wersja " + work.reviewId, work.upload?.name ?? attachments[work.attachment]?.name].filter(Boolean).join(" · ");
        event(room, role, "send", at, { detail });
        if (!owner && invitation?.control) control.useGrant(token, "submit", at, detail);
        else if (owner && invitation?.control) control.ownerLetterAction(invitation.token, at, "Wysłano odpowiedź w pokazie", detail);
      }
      return done();
    }
    if (type === "join" && room.delegation?.kind === "trusted" && !owner) {
      if (!active) {
        invitation.status = "active";
        invitation.expiresAt = room.expiresAt;
        invitation.seenAt = at;
        invitation.joinedAt = at;
        control?.join(room, command.profile, at);
        event(room, role, "join", at);
      }
      return done();
    }
    if (type === "read") {
      if (!notifications(room, role).some(({ id }) => id === command.id)) return denied();
      if (!room.read[role].has(command.id)) {
        room.read[role].add(command.id);
        room.revision++;
      }
      return done();
    }
    if (type === "invite") {
      if (!owner) return denied();
      const sameTab = command.demoHelper === "kacper" && room.delegation?.kind === "trusted" && room.control?.profile === "ewa";
      if (command.demoHelper && !sameTab) return denied();
      if ((open && !(sameTab && invitation.status === "waiting")) || room.helpers.size >= 20 || ["finished", "review"].includes(room.status))
        return conflict("Sprawdź bieżący etap sprawy przed utworzeniem zaproszenia.");
      const fields = Object.keys(initialScope);
      if (!fields.every((field) => typeof command.scope?.[field] === "boolean"))
        return invalid("Wybierz zakres dostępu.");
      const selected = room.delegation ? { ...delegationScope, response: room.delegation.kind !== "trusted" }
        : Object.fromEntries(fields.map((field) => [field, command.scope[field]]));
      const trusted = command.trustedOwnerToken && sessions.get(command.trustedOwnerToken);
      if (command.trustedOwnerToken && (room.delegation?.kind === "trusted" ||
          trusted?.role !== "owner" || trusted.room.delegation?.kind !== "trusted" ||
          trusted.room.expiresAt <= at || trusted.room.invitation?.status !== "active"))
        return conflict("Osoba zaufana nie jest już połączona.");
      selected.reference = selected.document && selected.reference;
      const helperToken = makeToken();
      if (room.delegation && Number.isInteger(command.step) && caseMeta[room.delegation.kind]?.steps[command.step]) {
        room.delegation.step = command.step;
      }
      room.invitation = { token: helperToken, scope: selected, status: "waiting", expiresAt: trusted ? Math.min(trusted.room.invitation.expiresAt, at + 7 * 86_400_000) : at + tenMinutes, seenAt: 0, startId: room.revision + 1,
        maySubmit: !room.delegation && Boolean(trusted) && command.maySubmit === true &&
          selected.document && selected.form && selected.response && selected.attachments,
        ...(trusted && { trustedRoom: trusted.room.token, trustedInvitation: trusted.room.invitation.token }) };
      if (trusted) trusted.room.revision++;
      room.status = work.documentRequest === "pending" ? "document" : "preparing";
      room.read.helper.clear();
      room.helpers.add(helperToken);
      sessions.set(helperToken, { room, role: "helper" });
      event(room, role, "invite", at, { scope: selected });
      if (sameTab) {
        Object.assign(room.invitation, { status: "active", expiresAt: room.expiresAt, joinedAt: at });
        control.join(room, "kacper", at);
        event(room, "helper", "join", at);
      }
      return done();
    }
    if (room.delegation?.kind === "trusted" && !["read", "revoke", "reset"].includes(type)) return denied();
    if (room.delegation && ["form", "attach", "upload", "request", "share", "comment"].includes(type)) return denied();
    if (type === "reset" || type === "revoke") {
      if (!owner) return denied();
      if (type === "reset") {
        if (invitation?.control) control.revokeLetter(invitation.token, at);
        initialize(room, at);
      }
      else {
        if (!open) return conflict("Dostęp do tej sprawy jest już zakończony.");
        if (invitation.control) control.revokeLetter(invitation.token, at);
        invitation.status = "revoked";
        event(room, role, "revoke", at);
      }
      return done();
    }
    if (["accept", "reject", "correction", "resumeDraft"].includes(type)) {
      if (!owner) return denied();
      if (room.status !== "review" || work.reviewId !== command.reviewId)
        return conflict("Ten pakiet nie czeka już na decyzję.");
      if (type === "resumeDraft") {
        if (room.delegation || completeLetter(work)) return conflict("Pakiet jest kompletny. Przejdź do zatwierdzenia.");
        room.status = "preparing";
        event(room, role, "resumeDraft", at);
        if (invitation?.control) control.ownerLetterAction(invitation.token, at, "Ewa przejęła szkic do uzupełnienia");
        return done();
      }
      if (type === "accept" && !room.delegation && !completeLetter(work))
        return conflict("Uzupełnij brakujące dane i załącznik przed zatwierdzeniem.");
      const feedback = type === "correction" && clean(command.text, 5, 500);
      if (type === "correction" && !feedback) return invalid("Napisz, co trzeba poprawić.");
      work.feedback = feedback || undefined;
      if (type === "correction") room.corrected = false;
      room.status = type === "accept" ? "finished" : type === "reject" ? "rejected" : "correction";
      event(room, role, type, at, feedback ? { detail: feedback } : {});
      if (invitation?.control) control.ownerLetterAction(invitation.token, at,
        type === "accept" ? "Zatwierdzono pakiet" : type === "reject" ? "Odrzucono pakiet" : "Poproszono o poprawki");
      return done();
    }
    if (!active && (!owner || ["share", "comment"].includes(type))) return denied();
    if (room.history.length >= 150 && !["review", "share"].includes(type))
      return conflict("Limit działań w pokazie został osiągnięty.");
    if (type === "comment") {
      if (!scope.comments) return denied();
      const text = clean(command.text, 1, 500);
      if (!text) return invalid("Wpisz komentarz w podanym limicie znaków.");
      const id = event(room, role, "comment", at);
      room.comments.push({ id, role, text });
      return done();
    }
    if (["review", "finished", "rejected"].includes(room.status))
      return conflict("Pakiet jest zablokowany na tym etapie.");
    if (type === "share") {
      if (!owner) return denied();
      if (work.documentRequest !== "pending") return conflict("Nie ma oczekującej prośby.");
      work.documentRequest = "shared";
      room.status = "preparing";
      event(room, role, "share", at, { detail: attachments.owner.name });
      return done();
    }
    if (type === "request") {
      if (owner || !scope.requestDocument) return denied();
      if (work.attachment || work.documentRequest) return conflict("Dokument jest już dostępny lub prośba została wysłana.");
      work.documentRequest = "pending";
      room.status = "document";
      event(room, role, "request", at);
      return done();
    }
    if (type === "form" || type === "response") {
      if (!owner && !scope[type]) return denied();
      const address = type === "form";
      const value = clean(address ? command.address : command.reason, address ? 8 : 15, address ? 120 : 1400);
      if (!value || (address && !/\d/.test(value))) return invalid(address ? "Podaj adres lokalu z numerem." : "Uzupełnij uzasadnienie.");
      const key = address ? "address" : "reason";
      if (work[key] === value) return done();
      work[key] = value;
      room.corrected = true;
      if (room.status === "new") room.status = "preparing";
      event(room, role, type, at, { detail: value });
      if (!owner && invitation?.control) control.useGrant(token, "Zapisano dane odpowiedzi", at, letter.title);
      return done();
    }
    if (type === "attach" || type === "upload") {
      if (!owner && !scope.attachments) return denied();
      const source = type === "upload" ? "upload" : command.source;
      if (type === "upload") {
        const { name, mime, size, digest } = command.file ?? {};
        const extension = typeof name === "string" && name.match(/\.(pdf|png|jpe?g)$/i)?.[1].toLowerCase();
        const allowed = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };
        if (!extension || name.length > 120 || /[\\/<>:\x00-\x1f]/.test(name) || mime !== allowed[extension] ||
            !Number.isInteger(size) || size < 1 || size > 5 * 1024 * 1024 || typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest))
          return invalid("Wybierz przykładowy plik PDF, PNG lub JPG do 5 MB.");
        if (work.attachment === "upload" && work.upload?.digest === digest && work.upload.name === name) return done();
        work.upload = { name, mime, size, digest };
      } else if (source !== "helper" && source !== "owner") return invalid("Wybierz dostępny dokument.");
      if (source === "owner" && !owner && work.documentRequest !== "shared") return denied();
      if (source !== "upload" && work.attachment === source) return done();
      if (source !== "upload") delete work.upload;
      work.attachment = source;
      room.corrected = true;
      if (work.documentRequest === "pending") delete work.documentRequest;
      room.status = "preparing";
      event(room, role, "attach", at, { detail: work.upload?.name ?? attachments[source].name });
      if (!owner && invitation?.control) control.useGrant(token, "Dołączono dokument", at, work.upload?.name ?? attachments[source].name);
      return done();
    }
    if (type === "review" || type === "saveDraft") {
      if (!owner && !scope.form && !scope.response && !scope.attachments) return denied();
      const values = {};
      if (command.draft !== undefined) {
        if (room.delegation || !command.draft || Array.isArray(command.draft) || typeof command.draft !== "object" ||
            Object.keys(command.draft).some((key) => !["address", "reason"].includes(key))) return invalid("Nieprawidłowe dane szkicu.");
        for (const [key, value] of Object.entries(command.draft)) {
          if (!owner && !scope[key === "address" ? "form" : "response"]) return denied();
          if (typeof value !== "string" || value.length > (key === "address" ? 120 : 1400)) return invalid("Sprawdź długość tekstu szkicu.");
          if (command.expectedDraft && Object.hasOwn(command.expectedDraft, key) &&
              (work[key] ?? "") !== command.expectedDraft[key] && (work[key] ?? "") !== value.trim())
            return conflict("Pole zmieniło się na drugim telefonie. Otwórz aktualny szkic przed ponownym zapisem.");
          if ((work[key] ?? "") !== value.trim()) values[key] = value.trim();
        }
      }
      const candidate = { ...work, ...values };
      const changed = Object.keys(values).length > 0;
      const maySubmit = !owner && invitation?.maySubmit && (!invitation.control || control.checkLetter(token, at, "submit"));
      if (type === "review") {
        const ready = room.delegation ? !!work.reason : completeLetter(candidate);
        if (!ready && (room.delegation || owner || maySubmit || !invitation.control && command.draft === undefined || !hasDraft(candidate, scope)))
          return conflict(room.delegation ? "Zapisz propozycję przed przekazaniem." : owner || maySubmit
            ? "Uzupełnij adres, uzasadnienie i załącznik przed wysyłką." : "Wpisz treść szkicu lub dodaj załącznik przed przekazaniem Ewie.");
        if (!room.corrected && !changed) return conflict("Wprowadź poprawkę przed ponownym przekazaniem pakietu.");
      } else if (room.delegation || !changed && !hasDraft(candidate, owner ? initialScope : scope)) {
        return conflict("Wpisz przynajmniej część szkicu.");
      }
      if (changed) {
        Object.assign(work, values);
        room.corrected = true;
        if (room.status === "new") room.status = "preparing";
        event(room, role, "saveDraft", at);
        if (!owner && invitation?.control) control.useGrant(token, "Zapisano szkic", at, letter.title);
      }
      if (type === "saveDraft") return done();
      room.status = "review";
      room.previousPackage = room.submittedPackage;
      room.submittedPackage = { address: work.address, reason: work.reason, attachment: work.attachment, upload: work.upload };
      work.reviewId = event(room, role, "review", at);
      if (!owner && invitation?.control) control.useGrant(token, "Przekazano do zatwierdzenia", at, "Wersja " + work.reviewId, !maySubmit);
      return done();
    }
    return invalid("Nieprawidłowa czynność.");
  };
}
