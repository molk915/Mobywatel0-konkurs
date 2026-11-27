import { pollWhileVisible } from "../polling";
import { useEffect, useRef, useState } from "react";
import type { ControlView } from "./control-model";

export type ControlData = {
  view: ControlView;
  answer?: { text: string; links: { title: string; href: string }[]; provider?: "model" | "demo" };
  document?: { title: string; text: string };
  peer?: string;
  resource?: string;
  authorization?: { key: string; method: "demo" | "passkey"; options?: PublicKeyCredentialRequestOptionsJSON };
  passkey?: { registered?: boolean; options?: PublicKeyCredentialCreationOptionsJSON };
};

class ControlError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function controlRequest(token: string, command?: object, signal?: AbortSignal): Promise<ControlData> {
  const response = await fetch("/api/most/control", {
    method: command ? "POST" : "GET",
    headers: { Authorization: "Bearer " + token, ...(command && { "Content-Type": "application/json" }) },
    body: command ? JSON.stringify(command) : undefined,
    cache: "no-store",
    signal: AbortSignal.any([AbortSignal.timeout(command && "type" in command && command.type === "assistant" ? 28000 : 6500), ...(signal ? [signal] : [])]),
  });
  if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error("Centrum kontroli jest niedostępne.");
  const data = await response.json();
  if (!response.ok) throw new ControlError(data.error, response.status);
  return data;
}

export function useControl(token: string | null, enabled: boolean, workflowKey?: string | null, letterKey?: string | null) {
  const [snapshot, setView] = useState<{ token: string; view: ControlView }>();
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const generation = useRef(0);
  const currentToken = useRef(token);
  currentToken.current = token;
  useEffect(() => {
    setView(undefined);
    setError("");
    setRefreshError("");
    if (!token || !enabled) return;
    let binding = !!workflowKey;
    return pollWhileVisible(async (signal) => {
      const version = generation.current;
      try {
        const data = await controlRequest(token!, binding ? { type: "bind", workflowKey, letterKey } : undefined, signal);
        binding = false;
        if (!signal.aborted && generation.current === version && !working.current) {
          setView({ token: token!, view: data.view });
          setRefreshError("");
        }
      } catch (cause) {
        if (cause instanceof ControlError && [400, 401, 403, 410].includes(cause.status)) binding = false;
        if (!signal.aborted && generation.current === version) {
          if (cause instanceof ControlError && [401, 410].includes(cause.status)) setView(undefined);
          setRefreshError(cause instanceof ControlError ? cause.message : "Nie można odświeżyć spraw. Trwa ponawianie.");
        }
        throw cause;
      }
    }, 5000);
  }, [token, enabled, workflowKey, letterKey]);

  async function send(command: object) {
    if (!token || working.current || !enabled) return;
    working.current = true;
    generation.current++;
    setBusy(true);
    setError("");
    try {
      const data = await controlRequest(token, command);
      if (currentToken.current !== token) return;
      setView({ token, view: data.view });
      return data;
    } catch (cause) {
      if (currentToken.current !== token) return;
      if (cause instanceof ControlError && [401, 410].includes(cause.status)) setView(undefined);
      setError(cause instanceof Error ? cause.message : "Nie udało się zapisać zmiany.");
    } finally {
      generation.current++;
      working.current = false;
      setBusy(false);
    }
  }
  return { view: enabled && snapshot?.token === token ? snapshot.view : undefined, busy, error: error || refreshError, send };
}

const base64url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function credentialFields(credential: PublicKeyCredential) {
  return { id: credential.id, rawId: base64url(credential.rawId), type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults() };
}

export async function getPasskey(options: PublicKeyCredentialRequestOptionsJSON) {
  const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(options);
  const assertion = await navigator.credentials.get({ publicKey });
  if (!(assertion instanceof PublicKeyCredential) || !(assertion.response instanceof AuthenticatorAssertionResponse))
    throw new Error("Brak potwierdzenia kluczem dostępu.");
  const { clientDataJSON, authenticatorData, signature, userHandle } = assertion.response;
  return { ...credentialFields(assertion), response: {
    clientDataJSON: base64url(clientDataJSON), authenticatorData: base64url(authenticatorData),
    signature: base64url(signature), ...(userHandle && { userHandle: base64url(userHandle) }),
  } };
}

export async function createPasskey(options: PublicKeyCredentialCreationOptionsJSON) {
  const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(options);
  const credential = await navigator.credentials.create({ publicKey });
  if (!(credential instanceof PublicKeyCredential) || !(credential.response instanceof AuthenticatorAttestationResponse))
    throw new Error("Brak klucza dostępu.");
  const { clientDataJSON, attestationObject } = credential.response;
  return { ...credentialFields(credential), response: {
    clientDataJSON: base64url(clientDataJSON), attestationObject: base64url(attestationObject),
    transports: credential.response.getTransports(),
  } };
}

export function canUsePasskey() {
  return window.isSecureContext && typeof PublicKeyCredential !== "undefined" &&
    typeof PublicKeyCredential.parseCreationOptionsFromJSON === "function" &&
    typeof PublicKeyCredential.parseRequestOptionsFromJSON === "function";
}
