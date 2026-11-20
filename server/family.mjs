import { randomBytes } from "node:crypto";
import { projectFamily, updateFamilyCase } from "../src/family/model.ts";

const lifetime = 8 * 60 * 60 * 1000;
const newToken = () => randomBytes(24).toString("base64url");

export function createFamilyHandler({ rooms = new Set(), sessions = new Map() } = {}) {

  function remove(room) {
    for (const token of Object.values(room.tokens)) sessions.delete(token);
    rooms.delete(room);
  }

  function sessionResponse(room, role) {
    return {
      view: projectFamily(role, room.case),
      notifications: notifications(room, role),
      ...(role === "aleksandra"
        ? { invites: { tomasz: room.tokens.tomasz, zosia: room.tokens.zosia } }
        : {}),
    };
  }
  function notifications(room, role) {
    const labels = role === "aleksandra" ? { approved: "Tomasz wyraził zgodę na przygotowanie paszportu", declined: "Tomasz odmówił zgody" }
      : role === "tomasz" ? { requested: "Aleksandra prosi o zgodę na paszport Zosi" } : {};
    return (room.case?.history ?? []).filter(({ type }) => labels[type]).map(({ revision, type, at }) => ({
      id: revision, at, title: labels[type], read: room.read[role].has(revision),
    })).reverse();
  }

  return function family(req, reply, body) {
    const now = Date.now();
    if (req.url === "/api/family/session" && req.method === "POST") {
      for (const room of rooms) if (room.expires <= now) remove(room);
      if (rooms.size >= 256)
        return reply(503, { error: "Limit aktywnych pokazów został osiągnięty." });
      const tokens = { aleksandra: newToken(), tomasz: newToken(), zosia: newToken() };
      const room = { tokens, case: null, expires: now + lifetime, read: { aleksandra: new Set(), tomasz: new Set(), zosia: new Set() } };
      rooms.add(room);
      for (const [role, token] of Object.entries(tokens))
        sessions.set(token, { room, role });
      return reply(201, { token: tokens.aleksandra, ...sessionResponse(room, "aleksandra") });
    }

    const token = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{32})$/)?.[1];
    const session = sessions.get(token);
    if (!session || session.room.expires <= now) {
      if (session) remove(session.room);
      return reply(401, { error: "Sesja pokazu wygasła lub link jest nieprawidłowy." });
    }
    const { room, role } = session;
    if (req.method === "GET") return reply(200, sessionResponse(room, role));
    if (body?.type === "read") {
      if (!notifications(room, role).some(({ id }) => id === body.id)) return reply(403, { error: "Powiadomienie jest niedostępne." });
      room.read[role].add(body.id);
      return reply(200, sessionResponse(room, role));
    }

    const { type, revision, form } = body ?? {};
    if (!["save", "request", "approve", "decline"].includes(type) ||
        !Number.isSafeInteger(revision) || revision < 0)
      return reply(400, { error: "Nieprawidłowe działanie lub wersja sprawy." });
    if (room.case?.history.length >= 150)
      return reply(409, { error: "Osiągnięto limit działań. Uruchom nowy pokaz." });
    const result = updateFamilyCase(room.case, role, { type, form }, revision, new Date(now).toISOString());
    if ("error" in result) return reply(result.status, { error: result.error });
    room.case = result.next;
    return reply(200, sessionResponse(room, role));
  };
}
