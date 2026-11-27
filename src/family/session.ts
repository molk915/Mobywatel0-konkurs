import { pollWhileVisible } from "../polling";
import { useEffect, useState } from "react";
import type { FamilyCommand, FamilySessionResponse } from "./model";

const sessionKey = "mobywatel-family-session";
const invitePattern = /^#rodzina=([A-Za-z0-9_-]{32})$/;

export const isFamilyInvite = () => invitePattern.test(location.hash);

export function familyInvite(token: string) {
  const url = new URL(location.pathname, location.origin);
  url.hash = "rodzina=" + token;
  return url.href;
}

function readFamilyToken() {
  const invite = location.hash.match(invitePattern)?.[1];
  try {
    return invite ?? sessionStorage.getItem(sessionKey);
  } catch {
    return invite ?? null;
  }
}

function latest(previous: FamilySessionResponse | null, response: FamilySessionResponse) {
  if (previous && (previous.view.case?.revision ?? 0) > (response.view.case?.revision ?? 0)) return previous;
  const read = new Set(previous?.notifications?.filter((item) => item.read).map((item) => item.id));
  return { ...response, notifications: response.notifications?.map((item) => ({ ...item, read: item.read || read.has(item.id) })) };
}

class FamilyApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function familyApi(
  token: string | null,
  body?: object,
  signal?: AbortSignal,
): Promise<FamilySessionResponse & { token?: string }> {
  const response = await fetch(token ? "/api/family/case" : "/api/family/session", {
    method: body ? "POST" : "GET",
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000),
  });
  if (!response.headers.get("Content-Type")?.includes("application/json"))
    throw new Error("API pokazu jest niedostępne.");
  const data = await response.json();
  if (!response.ok) throw new FamilyApiError(data.error, response.status);
  return data;
}

export function useFamilySession() {
  const [token, setToken] = useState(readFamilyToken);
  const [data, setData] = useState<FamilySessionResponse | null>(null);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      if (token) sessionStorage.setItem(sessionKey, token);
      else sessionStorage.removeItem(sessionKey);
      if (isFamilyInvite()) history.replaceState(history.state, "", location.pathname + location.search);
    } catch {
      // The active view can still function if the browser blocks storage.
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    return pollWhileVisible(async (signal) => {
      try {
        const response = await familyApi(token, undefined, signal);
        if (signal.aborted) return;
        setData((previous) => latest(previous, response));
        setConnected(true);
      } catch (cause) {
        if (signal.aborted) return;
        setConnected(false);
        if (cause instanceof FamilyApiError && cause.status === 401) {
          setError(cause.message);
          setData(null);
          setToken(null);
          return;
        }
        throw cause;
      }
    }, 5000);
  }, [token]);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await familyApi(null, {});
      if (!response.token) throw new Error("Brak poświadczenia pokazu.");
      setConnected(true);
      setData(response);
      setToken(response.token);
    } catch {
      setError("Nie można uruchomić pokazu. Sprawdź połączenie z serwerem Rodziny.");
    } finally {
      setBusy(false);
    }
  }

  async function act(command: FamilyCommand | { type: "read"; id: number }, revision = data?.view.case?.revision ?? 0) {
    if (!token || !connected || busy) return false;
    setBusy(true);
    setError("");
    try {
      const response = await familyApi(token, { ...command, revision });
      setData((previous) => latest(previous, response));
      return true;
    } catch (cause) {
      setError(cause instanceof FamilyApiError ? cause.message : "Nie udało się potwierdzić zapisu. Sprawdź stan sprawy po połączeniu.");
      if (!(cause instanceof FamilyApiError)) setConnected(false);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { data, connected, busy, error, hasSession: !!token, start, act };
}
