import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deserialize, serialize } from "node:v8";

export function collaborationState(directory, name) {
  const state = { rooms: new Set(), sessions: new Map() };
  if (!directory) return { state, save() {} };
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = join(directory, name + ".v8");
  let previous;
  try {
    previous = readFileSync(file);
    Object.assign(state, deserialize(previous));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return {
    state,
    save() {
      const snapshot = serialize(state);
      if (previous?.equals(snapshot)) return;
      writeFileSync(file + ".tmp", snapshot, { mode: 0o600 });
      renameSync(file + ".tmp", file);
      previous = snapshot;
    },
  };
}
