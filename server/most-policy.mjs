export const day = 86_400_000;
export const bearer = (req) => req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{32})$/)?.[1];

export function activeConnection(room, invitation, at) {
  return Boolean(room?.delegation?.kind === "trusted" && room.expiresAt > at &&
    room.invitation?.status === "active" && room.invitation.token === invitation && room.invitation.expiresAt > at);
}

export function grantStatus(room, grant, at, completed) {
  if (grant.revoked || room.invitation?.token !== grant.invitation || room.invitation?.status === "revoked") return "revoked";
  if (!activeConnection(room, grant.invitation, at) || grant.expires <= at) return "expired";
  if (grant.used || (["case", "once"].includes(grant.duration) && completed(grant))) return "completed";
  return "active";
}

export function permits(room, grant, action, resource, at, completed) {
  return grant.resource === resource && grant.actions.includes(action) && grantStatus(room, grant, at, completed) === "active";
}

const dayFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit",
});
export const warsawDate = (at) => dayFormatter.format(at);
export const isoDay = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function dayAfterInWarsaw(date) {
  const nextUtc = Date.parse(date) + day;
  for (const hours of [2, 1]) {
    const start = nextUtc - hours * 3_600_000;
    if (warsawDate(start) !== date) return start;
  }
  return nextUtc;
}
