import pg from "pg";
import { createAssistantServer } from "../server/index.mjs";
import { withPostgresState } from "../server/postgres-state.mjs";

const limits = new Map();
let pool;

function snapshotNames(path) {
  if (path.startsWith("family/")) return ["family"];
  if (path.startsWith("wellness/")) return ["wellness"];
  if (path.startsWith("most/") || path === "workflows" || path.startsWith("workflows/"))
    return ["most", "workflows"];
  return [];
}

const jsonError = (res, status, error) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  return res.end(JSON.stringify({ error }));
};

export default async function dispatch(req, res) {
  const connectionString = process.env.DATABASE_URL;
  res.setHeader("Cache-Control", "no-store");
  if (!connectionString) return jsonError(res, 503, "Baza spraw jest chwilowo niedostępna.");

  const url = new URL(req.url, "http://localhost");
  const path = url.pathname === "/api/dispatch" ? url.searchParams.get("mostPath") : url.pathname.slice(5);
  if (!path || !/^[a-z-]+(?:\/[a-z-]+)*$/.test(path)) return jsonError(res, 404, "Nie znaleziono.");
  req.url = "/api/" + path;

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const deployment = process.env.VERCEL_URL;
  const origin = process.env.APP_ORIGIN || (production && "https://" + production);
  const extraOrigins = [process.env.APP_ORIGINS, deployment && "https://" + deployment].filter(Boolean).join(",");
  const env = { ...process.env, APP_ORIGIN: origin, APP_ORIGINS: extraOrigins, SERVE_DIST: "0" };

  try {
    if (!pool) {
      pool = new pg.Pool({ connectionString, max: 4, connectionTimeoutMillis: 5000, idleTimeoutMillis: 5000 });
      pool.on("error", (error) => {
        console.error("MOST API idle database connection failure", error.code ?? error.name);
      });
    }
    if (path === "health" && req.method === "GET") await pool.query("SELECT 1");
    const run = async (storageFor) => {
      const server = createAssistantServer(env, { storageFor, limits });
      const [handle] = server.listeners("request");
      let status;
      let headers;
      let body;
      await handle(req, {
        writeHead(code, fields) { status = code; headers = fields; },
        end(value) { body = value; },
      });
      if (!status) throw new Error("Brak odpowiedzi z API.");
      return { status, headers, body };
    };
    const names = snapshotNames(path);
    const result = names.length
      ? await withPostgresState(pool, names, run)
      : await run(() => ({ state: { rooms: new Set(), sessions: new Map() }, save() {} }));
    res.writeHead(result.status, result.headers);
    return res.end(result.body);
  } catch (error) {
    console.error("MOST API storage or handler failure", error.code ?? error.name);
    return jsonError(res, 503, "Nie udało się odczytać lub zapisać sprawy. Spróbuj ponownie.");
  }
}
