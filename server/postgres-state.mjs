import { deserialize, serialize } from "node:v8";

const emptyState = () => ({ rooms: new Set(), sessions: new Map() });

export async function withPostgresState(pool, handle) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    // All four snapshots belong to the same request transaction, including cross-module updates.
    await client.query("SELECT pg_advisory_xact_lock(751060229)");
    await client.query("CREATE TABLE IF NOT EXISTS most_snapshots (name text PRIMARY KEY, payload bytea NOT NULL)");
    const { rows } = await client.query("SELECT name, payload FROM most_snapshots");
    const stored = new Map(rows.map(({ name, payload }) => [name, payload]));
    const changed = new Map();
    const response = await handle((name) => {
      const previous = stored.get(name);
      const state = previous ? deserialize(previous) : emptyState();
      return {
        state,
        save() {
          const snapshot = serialize(state);
          if (previous?.equals(snapshot)) changed.delete(name);
          else changed.set(name, snapshot);
        },
      };
    });
    for (const [name, payload] of changed) {
      await client.query(
        "INSERT INTO most_snapshots (name, payload) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET payload = EXCLUDED.payload",
        [name, payload],
      );
    }
    await client.query("COMMIT");
    return response;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
