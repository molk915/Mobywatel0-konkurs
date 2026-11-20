import { useEffect, useRef, useState } from "react";
import type { HealthCommand, HealthProfile, HealthTarget, HealthView } from "./model";
import type { InboxItem } from "../Inbox";

const invitePattern = /^#zdrowie=([\w-]{32})$/;
const helperStorageKey = "wellness:app:helper";
export const hasWellnessInvite = () => invitePattern.test(location.hash);
export function wellnessLink(token: string) {
  return location.origin + "/?zdrowie=pomoc#zdrowie=" + token;
}

class WellnessError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request(key: string | null, body?: HealthCommand | { profile: HealthProfile; stage: boolean }, signal?: AbortSignal) {
  const deadline = AbortSignal.timeout(5000);
  const response = await fetch(key ? "/api/wellness/case" : "/api/wellness/session", {
    method: body ? "POST" : "GET",
    headers: {
      ...(key ? { Authorization: "Bearer " + key } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: signal ? AbortSignal.any([deadline, signal]) : deadline,
  });
  if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error("API niedostępne");
  const payload = await response.json();
  if (!response.ok) throw new WellnessError(payload.error, response.status);
  return payload as { view: HealthView; token?: string };
}

export function useWellnessSession(profile: HealthProfile | null, enabled = true) {
  const storageKey = profile ? "wellness:app:" + profile : helperStorageKey;
  const [token, setToken] = useState(() => {
    const invite = !profile && location.hash.match(invitePattern)?.[1];
    try { return invite || sessionStorage.getItem(storageKey); }
    catch { return invite || null; }
  });
  const [view, setView] = useState<HealthView | null>(null);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState("");
  const [ended, setEnded] = useState("");
  const running = useRef(false);
  const terminal = useRef(false);

  function update(next: HealthView) {
    if (terminal.current) return;
    setView((previous) => !previous || next.revision > previous.revision ? next : previous);
    setOnline(true);
  }

  async function start() {
    if (!profile || running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await request(null, { profile, stage: false });
      if (!result.token) throw new Error();
      terminal.current = false;
      setEnded("");
      setView(null);
      update(result.view);
      setToken(result.token);
    } catch {
      setError("Zdrowie jest chwilowo niedostępne. Sprawdź połączenie i spróbuj ponownie.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (enabled && profile && !token && !ended) void start();
  }, [profile, enabled, token, ended]);
  useEffect(() => {
    if (!token || !enabled) return;
    try {
      sessionStorage.setItem(storageKey, token);
      if (!profile && hasWellnessInvite()) {
        const url = new URL(location.href);
        url.searchParams.set("zdrowie", "pomoc");
        url.hash = "";
        history.replaceState(history.state, "", url);
      }
    } catch { /* The current tab still has the token. */ }
  }, [token, profile, storageKey, enabled]);

  function onFailure(cause: unknown, action: boolean) {
    if (cause instanceof WellnessError && [401, 410].includes(cause.status)) {
      terminal.current = true;
      setView(null);
      setOnline(false);
      setEnded(cause.message);
      return;
    }
    if (!(cause instanceof WellnessError) || !action) setOnline(false);
    if (action) setError(cause instanceof WellnessError ? cause.message : "Brak połączenia. Sprawdź stan przed ponowieniem zapisu.");
  }
  useEffect(() => {
    if (!token || !enabled) return;
    const controller = new AbortController();
    let timer: number;
    const poll = async () => {
      try {
        const result = await request(token, undefined, controller.signal);
        if (!controller.signal.aborted) update(result.view);
      } catch (cause) {
        if (!controller.signal.aborted) onFailure(cause, false);
      }
      if (!controller.signal.aborted && !terminal.current) timer = window.setTimeout(poll, 1000);
    };
    void poll();
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [token, enabled]);

  async function act(command: HealthCommand) {
    if (!token || !online || terminal.current || running.current) return false;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await request(token, command);
      if (terminal.current) return false;
      update(response.view);
      return true;
    } catch (cause) {
      onFailure(cause, true);
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  function leave() {
    if (profile) return;
    terminal.current = true;
    setToken(null);
    setView(null);
    setEnded("");
    setError("");
    setOnline(false);
    try { sessionStorage.removeItem(helperStorageKey); } catch { /* Access in memory is already cleared. */ }
  }
  return { view, online, busy, ended, error, act, start, leave, hasToken: !!token };
}

export type WellnessSession = ReturnType<typeof useWellnessSession>;

export function healthInbox(session: WellnessSession, open: (target: HealthTarget) => void): InboxItem[] {
  return (session.view?.notifications ?? []).map((item) => ({
    ...item, key: (session.view?.role === "helper" ? "health-help-" : "health-") + item.id,
    context: session.view?.role === "helper" ? "Pomoc dla Ewy" : "Zdrowie",
    markRead: () => session.act({ type: "read", id: item.id }),
    open: () => open(item.target),
  }));
}
