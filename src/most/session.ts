import { useEffect, useRef, useState } from "react";
import type { DelegationContext, MostCommand, MostRole, MostView } from "./model";

export type MostContext = "app" | "stage" | `delegation-${string}`;
export function delegationToken(key: string) {
  try { return sessionStorage.getItem(storageKey("owner", `delegation-${key}`)); }
  catch { return null; }
}
const invitePattern = /^#most=([A-Za-z0-9_-]{32})$/;
export const hasMostInvite = () => invitePattern.test(location.hash);
const storageKey = (role: MostRole, context: MostContext) => "mobywatel-most-" + context + "-" + role;
const trustedHelperKey = "most-trusted-helper-return";
export const helperDashboardUrl = "/?most=pomoc&powrot=most";
export function storedTrustedHelperToken() {
  try { return sessionStorage.getItem(trustedHelperKey); }
  catch { return null; }
}
export function demoHelperToken(profile: string) {
  try { return sessionStorage.getItem("most-demo-helper:" + profile); } catch { return null; }
}
export function rememberDemoHelper(profile: string, token: string) {
  sessionStorage.setItem("most-demo-helper:" + profile, token);
}

export function routeForMost(role: MostRole, context: MostContext, token?: string) {
  const url = new URL("/", location.origin);
  url.searchParams.set("most", role === "owner" ? "ewa" : "pomoc");
  if (context === "stage") url.searchParams.set("ramka", "1");
  if (token) url.hash = "most=" + token;
  return url.href;
}

function storedToken(role: MostRole, context: MostContext) {
  if (context === "delegation-inline-help") return null;
  if (role === "helper" && location.hash.startsWith("#most="))
    return location.hash.match(invitePattern)?.[1] ?? null;
  try {
    if (role === "helper" && new URLSearchParams(location.search).get("powrot") === "most")
      return sessionStorage.getItem(trustedHelperKey);
    return sessionStorage.getItem(storageKey(role, context));
  } catch {
    return null;
  }
}

class MostApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

async function request(token: string | null, body?: object, signal?: AbortSignal): Promise<{ view: MostView; token?: string; challenge?: string }> {
  const deadline = AbortSignal.timeout(4500);
  const response = await fetch(token ? "/api/most/case" : "/api/most/session", {
    method: body ? "POST" : "GET",
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
  });
  if (!response.headers.get("Content-Type")?.includes("application/json"))
    throw new Error("API sprawy jest niedostępne.");
  const payload = await response.json();
  if (!response.ok) throw new MostApiError(payload.error, response.status, payload.code);
  return payload;
}

export function useMostSession(role: MostRole, context: MostContext, autoStart = false, enabled = true, delegation?: DelegationContext, initialToken?: string) {
  const [token, setToken] = useState(() => initialToken ?? storedToken(role, context));
  const [view, setView] = useState<MostView | null>(null);
  const [connected, setConnected] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ended, setEnded] = useState<"revoked" | "expired" | "invalid" | null>(null);
  const [retryNumber, setRetryNumber] = useState(0);
  const blocked = useRef(false);
  const working = useRef(false);
  const autoStarted = useRef(false);

  const update = (next: MostView) => {
    if (blocked.current || next.role !== role) return;
    if (role === "helper" && context !== "delegation-profile-help" && context !== "delegation-showcase-help" && context !== "delegation-inline-help" &&
        token && next.delegation?.kind === "trusted" && next.invitation?.status === "active") {
      try { sessionStorage.setItem(trustedHelperKey, token); } catch { /* Optional session storage. */ }
    }
    setView((previous) => {
      if (!previous) return next;
      if (previous.revision > next.revision) return previous;
      if (previous.revision === next.revision && previous.invitation?.online === next.invitation?.online &&
          previous.invitation?.maySubmit === next.invitation?.maySubmit &&
          previous.assignments?.map(({ token }) => token).join() === next.assignments?.map(({ token }) => token).join())
        return previous;
      return next;
    });
    setConnected(true);
  };

  function fail(cause: unknown, action: boolean) {
    if (cause instanceof MostApiError) {
      if (cause.status === 401 || cause.status === 410) {
        blocked.current = true;
        setEnded(cause.code === "expired" ? "expired" : cause.code === "revoked" ? "revoked" : "invalid");
        setView(null);
        setConnected(false);
      } else if (action) setError(cause.message);
      else setConnected(false);
    } else {
      setConnected(false);
      if (action) setError("Nie można potwierdzić zapisu. Sprawdź stan po ponownym połączeniu.");
    }
  }

  async function start() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await request(null, delegation ? { delegation } : {});
      if (!result.token) throw new Error("Brak sesji właścicielki.");
      try {
        sessionStorage.setItem(storageKey(role, context), result.token);
      } catch {
        // An active session can still run without browser storage.
      }
      blocked.current = false;
      setEnded(null);
      setToken(result.token);
      setView(result.view);
      setConnected(true);
    } catch {
      setError("Nie udało się połączyć z MOST. Spróbuj ponownie.");
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (enabled && autoStart && role === "owner" && !token && !autoStarted.current) {
      autoStarted.current = true;
      void start();
    }
  }, [autoStart, enabled, role, token]);

  useEffect(() => {
    if (!initialToken || initialToken === token || !["delegation-showcase-help", "delegation-inline-help"].includes(context)) return;
    blocked.current = false;
    setView(null);
    setConnected(false);
    setAttempted(false);
    setEnded(null);
    setError("");
    setToken(initialToken);
  }, [initialToken, token, context]);

  useEffect(() => {
    if (role !== "helper" || !token || !enabled) return;
    try {
      sessionStorage.setItem(storageKey(role, context), token);
      if (hasMostInvite()) {
        const url = new URL(location.href);
        url.searchParams.set("most", "pomoc");
        url.hash = "";
        history.replaceState(history.state, "", url);
      }
    } catch {
      // Keep the link intact when the browser blocks session storage.
    }
  }, [context, role, token, enabled]);

  useEffect(() => {
    if (!token || !enabled) return;
    const controller = new AbortController();
    let timer: number;
    const poll = async () => {
      try {
        const response = await request(token, undefined, controller.signal);
        if (!controller.signal.aborted) {
          setAttempted(true);
          update(response.view);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setAttempted(true);
          fail(cause, false);
        }
      }
      if (!controller.signal.aborted && !blocked.current) timer = window.setTimeout(poll, 850);
    };
    void poll();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [token, retryNumber, enabled]);

  async function commandResult(command: MostCommand) {
    if (working.current || !token || !connected || blocked.current) return false;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await request(token, command);
      if (blocked.current) return false;
      update(result.view);
      return result;
    } catch (cause) {
      fail(cause, true);
      return false;
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  async function act(command: MostCommand) { return Boolean(await commandResult(command)); }

  return {
    view, connected, attempted, busy, error, ended, hasSession: !!token, token, start, act, commandResult,
    leave: () => {
      if (role !== "helper") return;
      blocked.current = true;
      setView(null);
      setToken(null);
      setConnected(false);
      try {
        sessionStorage.removeItem(storageKey(role, context));
        if (sessionStorage.getItem(trustedHelperKey) === token) sessionStorage.removeItem(trustedHelperKey);
      } catch { /* The current view is cleared. */ }
    },
    retry: () => {
      setError("");
      setRetryNumber((previous) => previous + 1);
    },
    clearError: () => setError(""),
  };
}
