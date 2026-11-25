import http from "node:http";
import { pathToFileURL } from "node:url";
import { setTimeout as wait } from "node:timers/promises";
import { respond } from "./assistant.mjs";
import { createFamilyHandler } from "./family.mjs";
import { createMostHandler, installControlledLetter } from "./most.mjs";
import { createMostControl } from "./most-control.mjs";
import { createMostPasskeys } from "./most-passkeys.mjs";
import { createWellnessHandler } from "./wellness.mjs";
import { serveBuild } from "./static.mjs";
import { collaborationState } from "./state.mjs";
import { createWorkflows } from "./workflows.mjs";
import { controlIntent, workflowReply } from "./workflow-assistant.mjs";
export function createAssistantServer(env = process.env, { clock, storageFor = (name) => collaborationState(env.MOST_STATE_DIR, name), limits = new Map() } = {}) {
  const appOrigin = env.APP_ORIGIN || env.RENDER_EXTERNAL_URL;
  function persisted(name, create, storage = storageFor(name), auditErrors = false) {
    const { state, save, restore } = storage;
    const handler = create(state);
    return (req, reply, body) => handler(req, (status, data) => {
      if (status < 400 || auditErrors) {
        try { save(); } catch {
          restore?.();
          return reply(503, { error: "Nie udało się zapisać stanu. Spróbuj ponownie." });
        }
      }
      return reply(status, data);
    }, body);
  }
  const family = persisted("family", createFamilyHandler);
  const mostStorage = storageFor("most");
  const control = createMostControl(mostStorage.state, clock);
  const workflows = createWorkflows(storageFor("workflows"), clock, mostStorage.state.sessions, control);
  const mostApi = createMostHandler(clock, mostStorage.state, workflows.assignments, control);
  const most = persisted("most", () => mostApi, mostStorage, true);
  const controlHandler = persisted("most", () => control.handler, mostStorage, true);
  control.wire({ workflows, authenticator: createMostPasskeys(appOrigin),
    assistantIntent: env.ASSISTANT_PROVIDER === "compatible" ? (text, allowed) => controlIntent(text, allowed, env) : undefined,
    installLetter: (...args) => installControlledLetter(mostStorage.state.sessions, ...args, control),
    createPeer() {
      let room;
      mostApi({ url: "/api/most/session" }, (status, data) => {
        if (status === 201) room = mostStorage.state.sessions.get(data.token)?.room;
      }, { delegation: { kind: "trusted" } });
      return room;
    },
  });
  const wellness = persisted("wellness", (state) => createWellnessHandler(clock, state));
  const staticSite = env.SERVE_DIST === "1" ? serveBuild("dist") : null;
  const server = http.createServer(async (req, res) => {
    const reply = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(data));
    };
    if (req.url === "/api/health" && req.method === "GET")
      return reply(200, {
        ok: true,
        provider: env.ASSISTANT_PROVIDER || "demo",
      });
    const familyRoute =
      (req.url === "/api/family/session" && req.method === "POST") ||
      (req.url === "/api/family/case" && ["GET", "POST"].includes(req.method));
    const mostRoute =
      (req.url === "/api/most/session" && req.method === "POST") ||
      (req.url === "/api/most/case" && ["GET", "POST"].includes(req.method));
    const controlRoute = req.url === "/api/most/control" && ["GET", "POST"].includes(req.method);
    const wellnessRoute =
      (req.url === "/api/wellness/session" && req.method === "POST") ||
      (req.url === "/api/wellness/case" && ["GET", "POST"].includes(req.method));
    const workflowRoute =
      (req.url === "/api/workflows/session" && req.method === "POST") ||
      (["/api/workflows", "/api/workflows/delegated"].includes(req.url) && ["GET", "POST"].includes(req.method));
    const workflowAssistant = req.url === "/api/workflows/assistant" && req.method === "POST";
    const collaboration = controlRoute ? controlHandler : mostRoute ? most : familyRoute ? family : wellnessRoute ? wellness : workflowRoute ? workflows.handler : null;
    if (!collaboration && !workflowAssistant && (req.url !== "/api/assistant" || req.method !== "POST")) {
      if (staticSite && await staticSite(req, res)) return;
      return reply(404, { error: "Nie znaleziono." });
    }
    const origin = req.headers.origin;
    if (
      origin &&
      ![
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:4183",
        "http://127.0.0.1:4184",
        appOrigin,
        ...(env.APP_ORIGINS?.split(",").map((value) => value.trim()) ?? []),
      ]
        .filter(Boolean)
        .includes(origin)
    )
      return reply(403, { error: "Niedozwolone źródło." });
    if (collaboration && req.method === "GET") return collaboration(req, reply);
    if (req.headers["content-type"]?.split(";")[0].trim() !== "application/json")
      return reply(415, { error: "Wymagany JSON." });
    const ip = (controlRoute ? "control:" : mostRoute ? "most:" : familyRoute ? "family:" : wellnessRoute ? "wellness:" : workflowRoute ? "workflow:" : "assistant:") + req.socket.remoteAddress,
      now = Date.now();
    if (limits.size > 1000)
      for (const [k, v] of limits) if (v.until < now) limits.delete(k);
    const limit = limits.get(ip) || { count: 0, until: now + 60000 };
    if (limit.until < now) {
      limit.count = 0;
      limit.until = now + 60000;
    }
    limit.count++;
    limits.set(ip, limit);
    if (limit.count > (collaboration ? 120 : 30))
      return reply(429, { error: "Spróbuj za minutę." });
    const chunks = [];
    let size = 0;
    try {
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 8192) {
          reply(413, { error: "Wiadomość jest za duża." });
          return;
        }
        chunks.push(chunk);
      }
    } catch {
      return reply(400, { error: "Nie odczytano wiadomości." });
    }
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return reply(400, { error: "Nieprawidłowy JSON." });
    }
    try {
      if (workflowAssistant) {
        const session = workflows.profileSession(req);
        if (!session) return reply(401, { error: "Sesja spraw wygasła." });
        const grant = session.profile === "ewa" && mostStorage.state.sessions.get(body?.letterToken);
        const letter = grant?.role === "owner" && !grant.room.delegation && grant.room.expiresAt > (clock ?? Date.now)()
          ? grant.room : null;
        return reply(200, { message: await workflowReply(body, session, letter, env) });
      }
      if (workflowRoute && req.url === "/api/workflows" && body?.type === "confirm" && workflows.profileSession(req))
        await wait(400);
      if (workflowRoute) return workflows.handler(req, (status, data) => {
        if (status === 403 || status === 410) {
          try { mostStorage.save(); } catch { mostStorage.restore?.(); }
        }
        return reply(status, data);
      }, body);
      return collaboration ? await collaboration(req, reply, body) : reply(200, await respond(body, env));
    } catch (e) {
      const invalid = /Nieprawidł|Wymagany/.test(e.message);
      return reply(invalid ? 400 : 502, {
        error: invalid ? e.message : collaboration ? "Sprawa jest chwilowo niedostępna." : "Asystent jest chwilowo niedostępny.",
      });
    }
  });
  let reminderTimer;
  server.on("listening", () => {
    reminderTimer = setInterval(() => {
      try {
        if (control.sweep()) mostStorage.save();
      } catch { mostStorage.restore?.(); }
    }, 60_000);
    reminderTimer.unref();
  });
  server.on("close", () => clearInterval(reminderTimer));
  return server;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const port = Number(process.env.PORT || process.env.ASSISTANT_PORT || 4190);
  const host = process.env.BIND_HOST || "127.0.0.1";
  createAssistantServer().listen(port, host, () =>
    console.log(
      "mObywatel backend: http://" + host + ":" +
        port +
        " · " +
        (process.env.ASSISTANT_PROVIDER || "demo"),
    ),
  );
}
