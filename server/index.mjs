import http from "node:http";
import { pathToFileURL } from "node:url";
import { respond } from "./assistant.mjs";
import { createFamilyHandler } from "./family.mjs";
import { createMostHandler } from "./most.mjs";
import { createWellnessHandler } from "./wellness.mjs";
import { serveBuild } from "./static.mjs";
import { collaborationState } from "./state.mjs";
export function createAssistantServer(env = process.env, { clock } = {}) {
  const limits = new Map();
  function persisted(name, create) {
    const { state, save } = collaborationState(env.MOST_STATE_DIR, name);
    const handler = create(state);
    return (req, reply, body) => handler(req, (status, data) => {
      if (status < 400) {
        try { save(); } catch { return reply(503, { error: "Nie udało się zapisać stanu. Spróbuj ponownie." }); }
      }
      return reply(status, data);
    }, body);
  }
  const family = persisted("family", createFamilyHandler);
  const most = persisted("most", (state) => createMostHandler(clock, state));
  const wellness = persisted("wellness", (state) => createWellnessHandler(clock, state));
  const staticSite = env.SERVE_DIST === "1" ? serveBuild("dist") : null;
  return http.createServer(async (req, res) => {
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
    const wellnessRoute =
      (req.url === "/api/wellness/session" && req.method === "POST") ||
      (req.url === "/api/wellness/case" && ["GET", "POST"].includes(req.method));
    const collaboration = mostRoute ? most : familyRoute ? family : wellnessRoute ? wellness : null;
    if (!collaboration && (req.url !== "/api/assistant" || req.method !== "POST")) {
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
        env.APP_ORIGIN,
      ]
        .filter(Boolean)
        .includes(origin)
    )
      return reply(403, { error: "Niedozwolone źródło." });
    if (collaboration && req.method === "GET") return collaboration(req, reply);
    if (req.headers["content-type"]?.split(";")[0].trim() !== "application/json")
      return reply(415, { error: "Wymagany JSON." });
    const ip = (mostRoute ? "most:" : familyRoute ? "family:" : wellnessRoute ? "wellness:" : "assistant:") + req.socket.remoteAddress,
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
      return collaboration ? collaboration(req, reply, body) : reply(200, await respond(body, env));
    } catch (e) {
      const invalid = /Nieprawidł|Wymagany/.test(e.message);
      return reply(invalid ? 400 : 502, {
        error: invalid ? e.message : collaboration ? "Sprawa jest chwilowo niedostępna." : "Asystent jest chwilowo niedostępny.",
      });
    }
  });
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
