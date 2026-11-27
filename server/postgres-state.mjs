import { createHash } from "node:crypto";
import { deserialize, serialize } from "node:v8";

const emptyState = () => ({ rooms: new Set(), sessions: new Map() });

const caches = new WeakMap();
const snapshotDigest = (payload) => createHash("sha256").update(payload).digest("hex");

export async function withPostgresState(pool, names, handle) {
  const cache = caches.get(pool) ?? new Map();
  caches.set(pool, cache);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    // All four snapshots belong to the same request transaction, including cross-module updates.
    await client.query("SELECT pg_advisory_xact_lock(751060229)");
    await client.query("CREATE TABLE IF NOT EXISTS most_snapshots (name text PRIMARY KEY, payload bytea NOT NULL)");
    // Capture references after taking the lock. Another instance can write to the same database.
    const cached = names.map((name) => cache.get(name));
    const { rows } = await client.query(
      `SELECT snapshots.name, CASE WHEN encode(sha256(payload), 'hex') IS DISTINCT FROM requested.digest
                                   THEN payload END AS payload
         FROM unnest($1::text[], $2::text[]) AS requested(name, digest)
         JOIN most_snapshots snapshots USING (name)`,
      [names, cached.map((entry) => entry?.digest ?? null)],
    );
    const stored = new Map();
    for (const { name, payload } of rows) {
      const entry = payload ? { payload, digest: snapshotDigest(payload) } : cached[names.indexOf(name)];
      stored.set(name, entry);
    }
    const loaded = new Map();
    const changed = new Map();
    const response = await handle((name) => {
      if (loaded.has(name)) return loaded.get(name);
      const previous = stored.get(name)?.payload;
      const state = previous ? deserialize(previous) : emptyState();
      const storage = {
        state,
        save() {
          if (!names.includes(name)) throw new Error("Snapshot outside the request scope");
          const snapshot = serialize(state);
          if (previous?.equals(snapshot)) changed.delete(name);
          else changed.set(name, snapshot);
        },
      };
      loaded.set(name, storage);
      return storage;
    });
    for (const [name, payload] of changed) {
      await client.query(
        "INSERT INTO most_snapshots (name, payload) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET payload = EXCLUDED.payload",
        [name, payload],
      );
    }
    await client.query("COMMIT");
    for (const name of names) {
      const payload = changed.get(name);
      const entry = payload ? { payload, digest: snapshotDigest(payload) } : stored.get(name);
      if (entry) cache.set(name, entry);
      else cache.delete(name);
    }
    return response;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
