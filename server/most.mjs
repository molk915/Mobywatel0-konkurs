import { randomBytes } from "node:crypto";
import { formatMostDeadline, initialScope } from "../src/most/model.ts";

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
  owner: new Set(["letter", "reminder", "join", "request", "review", "accept", "revoke", "expiry"]),
  helper: new Set(["invite", "join", "share", "correction", "accept", "reject", "revoke", "expiry"]),
};

export function createMostHandler(now = Date.now, { rooms = new Set(), sessions = new Map() } = {}) {

  function event(room, role, type, at, details = {}) {
    room.history.push({ id: ++room.revision, role, type, at: new Date(at).toISOString(), ...details });
    return room.revision;
  }
  function initialize(room, at) {
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
    const complete = !!(work.address && work.reason && work.attachment);
    return {
      role, revision: room.revision, status: room.status, complete, canReview: complete && room.corrected, deadlineAt: room.deadlineAt,
      ...(owner || scope?.document ? { document: owner ? { ...letter, body } : { title, office, body, ...(scope.reference ? { reference } : {}) } } : {}),
      invitation: invitation && {
        expiresAt: invitation.expiresAt, scope, status: invitation.status,
        online: invitation.status === "active" && at - invitation.seenAt < 4000,
        ...(owner && ["waiting", "active"].includes(invitation.status) ? { token: invitation.token } : {}),
      },
      work: owner ? work : {
        ...(scope.form ? { address: work.address } : {}),
        ...(scope.response ? { reason: work.reason } : {}),
        ...(scope.attachments || scope.requestDocument ? { attachment: work.attachment, documentRequest: work.documentRequest } : {}),
        feedback: work.feedback,
      },
      files: {
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
      const room = { token, expiresAt: at + roomLifetime, helpers: new Set(), revision: 0 };
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
    if (invitation && ["waiting", "active"].includes(invitation.status) && invitation.expiresAt <= at) {
      invitation.status = "expired";
      event(room, "owner", "expiry", at);
    }
    if (!owner) {
      if (invitation?.token !== token || invitation.status === "revoked")
        return reply(410, { code: "revoked", error: "Dostęp do sprawy został zakończony." });
      if (invitation.status === "expired")
        return reply(410, { code: "expired", error: "Czas dostępu do sprawy upłynął." });
    }
    const scope = invitation?.scope;
    const active = invitation?.status === "active";
    const open = active || invitation?.status === "waiting";
    const done = () => reply(200, { view: view(room, role, at) });
    if (req.method === "GET") {
      const remaining = room.deadlineAt - at;
      if (owner && !["finished", "rejected"].includes(room.status) && remaining >= 0 &&
          remaining <= 48 * 3_600_000 && !room.history.some(({ type }) => type === "reminder"))
        event(room, role, "reminder", at);
      if (!owner) {
        invitation.seenAt = at;
        if (!active) {
          invitation.status = "active";
          event(room, role, "join", at);
        }
      }
      return done();
    }

    const denied = () => reply(403, { error: "Ta czynność wykracza poza zakres Twojego dostępu." });
    const conflict = (error) => reply(409, { error });
    const invalid = (error) => reply(400, { error });
    const work = room.work;
    const clean = (value, min, max) => typeof value === "string" && value.trim().length >= min && value.trim().length <= max ? value.trim() : null;
    const type = command?.type;
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
      if (open || room.helpers.size >= 20 || ["finished", "review"].includes(room.status))
        return conflict("Sprawdź bieżący etap sprawy przed utworzeniem zaproszenia.");
      const fields = Object.keys(initialScope);
      if (!fields.every((field) => typeof command.scope?.[field] === "boolean"))
        return invalid("Wybierz zakres dostępu.");
      const selected = Object.fromEntries(fields.map((field) => [field, command.scope[field]]));
      selected.reference = selected.document && selected.reference;
      const helperToken = makeToken();
      room.invitation = { token: helperToken, scope: selected, status: "waiting", expiresAt: at + tenMinutes, seenAt: 0, startId: room.revision + 1 };
      room.status = work.documentRequest === "pending" ? "document" : "preparing";
      room.read.helper.clear();
      room.helpers.add(helperToken);
      sessions.set(helperToken, { room, role: "helper" });
      event(room, role, "invite", at, { scope: selected });
      return done();
    }
    if (type === "reset" || type === "revoke") {
      if (!owner) return denied();
      if (type === "reset") initialize(room, at);
      else {
        if (!open) return conflict("Dostęp do tej sprawy jest już zakończony.");
        invitation.status = "revoked";
        event(room, role, "revoke", at);
      }
      return done();
    }
    if (["accept", "reject", "correction"].includes(type)) {
      if (!owner) return denied();
      if (room.status !== "review" || work.reviewId !== command.reviewId)
        return conflict("Ten pakiet nie czeka już na decyzję.");
      const feedback = type === "correction" && clean(command.text, 5, 500);
      if (type === "correction" && !feedback) return invalid("Napisz, co trzeba poprawić.");
      work.feedback = feedback || undefined;
      if (type === "correction") room.corrected = false;
      room.status = type === "accept" ? "finished" : type === "reject" ? "rejected" : "correction";
      event(room, role, type, at, feedback ? { detail: feedback } : {});
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
      return done();
    }
    if (type === "attach") {
      if (!owner && !scope.attachments) return denied();
      const source = command.source;
      if (source !== "helper" && source !== "owner") return invalid("Wybierz dostępny dokument.");
      if (source === "owner" && !owner && work.documentRequest !== "shared") return denied();
      if (work.attachment === source) return done();
      work.attachment = source;
      room.corrected = true;
      if (work.documentRequest === "pending") delete work.documentRequest;
      room.status = "preparing";
      event(room, role, "attach", at, { detail: attachments[source].name });
      return done();
    }
    if (type === "review") {
      if (!owner && !scope.form && !scope.response && !scope.attachments) return denied();
      if (!work.address || !work.reason || !work.attachment) return conflict("Uzupełnij formularz, uzasadnienie i dołącz dokument.");
      if (!room.corrected) return conflict("Wprowadź poprawkę przed ponownym przekazaniem pakietu.");
      room.status = "review";
      work.reviewId = event(room, role, "review", at);
      return done();
    }
    return invalid("Nieprawidłowa czynność.");
  };
}
