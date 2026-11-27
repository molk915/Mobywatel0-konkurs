import { pollWhileVisible } from "../polling";
import { useEffect, useRef, useState } from "react";
import type { WorkflowAction, WorkflowCase, WorkflowInput, WorkflowKind } from "./model";

class WorkflowError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}
type Snapshot = { items: WorkflowCase[]; token?: string; applicant?: string; challenge?: string; permissions?: { prepare: boolean; confirm: boolean; mode: "owner" | "independent" | "confirm" } };
export type WorkflowReply = { text: string; workflowAction: WorkflowAction; fallback: boolean; suggestedData?: { city?: string } };
type Command =
  | { type: "prepare"; id: WorkflowKind; revision: number; input: WorkflowInput }
  | { type: "confirm"; id: WorkflowKind; revision: number; challenge?: string }
  | { type: "review"; id: WorkflowKind; revision: number }
  | { type: "grant"; id: WorkflowKind; trustedToken: string }
  | { type: "revoke"; id: WorkflowKind }
  | { type: "read"; id: WorkflowKind; index: number };

async function request<T>(path: string, key: string | null, body?: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch("/api/workflows" + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(key && { Authorization: "Bearer " + key }),
      ...(body && { "Content-Type": "application/json" }),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.any([AbortSignal.timeout(path === "/assistant" ? 28_000 : 6000), ...(signal ? [signal] : [])]),
  });
  if (!response.headers.get("Content-Type")?.includes("application/json"))
    throw new Error("API spraw jest niedostępne.");
  const payload = await response.json();
  if (!response.ok) throw new WorkflowError(response.status, payload.error);
  return payload;
}

const pendingSessions = new Map<string, Promise<Snapshot>>();
function connect(profile: string) {
  const pending = pendingSessions.get(profile);
  if (pending) return pending;
  const storageKey = "most-workflows:" + profile;
  const connection = (async () => {
    const key = localStorage.getItem(storageKey);
    if (key) {
      try {
        return { ...await request<Snapshot>("", key), token: key };
      } catch (error) {
        if (!(error instanceof WorkflowError && error.status === 401)) throw error;
      }
    }
    const snapshot = await request<Snapshot>("/session", null, { profile });
    if (snapshot.token) localStorage.setItem(storageKey, snapshot.token);
    return snapshot;
  })();
  pendingSessions.set(profile, connection);
  void connection.finally(() => pendingSessions.delete(profile)).catch(() => {});
  return connection;
}

export function useWorkflows(profile: string, delegatedToken?: string) {
  const [connection, setConnection] = useState<{ profile: string; snapshot?: Snapshot; error?: string }>();
  const [attempt, retry] = useState(0);
  const currentProfile = useRef(profile);
  currentProfile.current = profile;
  const current = connection?.profile === profile ? connection : undefined;
  const snapshot = current?.snapshot;
  const key = snapshot?.token ?? null;
  const path = delegatedToken ? "/delegated" : "";
  const sequence = useRef(0);
  useEffect(() => {
    let cancelled = false;
    const connection = delegatedToken
      ? request<Snapshot>(path, delegatedToken).then((next) => ({ ...next, token: delegatedToken }))
      : connect(profile);
    void connection.then(
      (next) => { if (!cancelled) setConnection({ profile, snapshot: next }); },
      (error) => { if (!cancelled) setConnection({ profile, error: error instanceof WorkflowError ? error.message : "Sprawy online są niedostępne." }); },
    );
    return () => { cancelled = true; };
  }, [profile, attempt, delegatedToken, path]);

  useEffect(() => {
    if (!key) return;
    return pollWhileVisible(async (signal) => {
      const revision = ++sequence.current;
      try {
        const next = await request<Snapshot>(path, key, undefined, signal);
        if (!signal.aborted && sequence.current === revision) setConnection({ profile, snapshot: { ...next, token: key } });
      } catch (error) {
        if (delegatedToken && !signal.aborted && sequence.current === revision && error instanceof WorkflowError && [401, 410].includes(error.status))
          setConnection({ profile, error: error.message });
        throw error;
      }
    }, 4000, undefined, false);
  }, [key, profile, path, delegatedToken]);

  function update(next: Snapshot) {
    sequence.current++;
    if (currentProfile.current === profile)
      setConnection({ profile, snapshot: { ...next, token: key ?? undefined } });
  }

  async function act(command: Command) {
    if (!key) throw new Error("Połącz się z systemem demonstracyjnym.");
    try {
      const next = await request<Snapshot>(path, key, command);
      update(next);
      return next.items.find(({ id }) => id === command.id);
    } catch (error) {
      if (error instanceof WorkflowError) {
        if (error.status === 409) update(await request<Snapshot>(path, key));
        if (delegatedToken && [401, 410].includes(error.status)) setConnection({ profile, error: error.message });
        throw error;
      }
      throw new Error("Nie udało się potwierdzić zapisu. Sprawdź połączenie i ponów czynność.");
    }
  }

  async function ask(text: string, context?: WorkflowAction, letterToken?: string, signal?: AbortSignal) {
    if (!key) return null;
    return (await request<{ message: WorkflowReply | null }>(
      "/assistant", key, { text, context, letterToken }, signal,
    )).message;
  }
  async function authorize(id: WorkflowKind, revision: number) {
    if (!key || !delegatedToken) return;
    return (await request<Snapshot>(path, key, { type: "authorize", id, revision })).challenge;
  }

  return { items: snapshot?.items ?? [], applicant: snapshot?.applicant, token: key, permissions: snapshot?.permissions, ready: Boolean(key), loading: !current, error: current?.error, retry: () => retry((n) => n + 1), act, ask, authorize };
}
