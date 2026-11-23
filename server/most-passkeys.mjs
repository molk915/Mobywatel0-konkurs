import { randomBytes } from "node:crypto";
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
} from "@simplewebauthn/server";

export function createMostPasskeys(configuredOrigin) {
  function relyingParty(req) {
    const origin = req.headers.origin;
    if (typeof origin !== "string") return null;
    try {
      const parsed = new URL(origin);
      const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
      if (parsed.origin !== origin || (!local && (origin !== configuredOrigin || parsed.protocol !== "https:")) ||
          !["https:", "http:"].includes(parsed.protocol)) return null;
      return { origin, rpID: parsed.hostname };
    } catch { return null; }
  }
  function sameOrigin(req, challenge) {
    const party = relyingParty(req);
    return party?.origin === challenge.origin && party?.rpID === challenge.rpID;
  }
  return {
    supported: (req) => Boolean(relyingParty(req)),
    available: (control) => Boolean(control.passkey),
    async options(control, req, key) {
      const passkey = control.passkey;
      if (!passkey || !sameOrigin(req, passkey)) return null;
      return generateAuthenticationOptions({
        rpID: passkey.rpID, challenge: Buffer.from(key, "base64url"),
        userVerification: "required", allowCredentials: [{ id: passkey.credential.id }],
        timeout: 90000,
      });
    },
    async verify(control, req, key, assertion) {
      const passkey = control.passkey;
      if (!passkey || !sameOrigin(req, passkey) || assertion?.id !== passkey.credential.id) return null;
      try {
        const result = await verifyAuthenticationResponse({
          response: assertion, expectedChallenge: key, expectedOrigin: passkey.origin,
          expectedRPID: passkey.rpID, credential: passkey.credential, requireUserVerification: true,
        });
        return result.verified ? result.authenticationInfo.newCounter : null;
      } catch { return null; }
    },
    async start(control, req) {
      const party = relyingParty(req);
      if (!party || control.passkey) return null;
      const options = await generateRegistrationOptions({
        rpName: "MOST · klucz dostępu", rpID: party.rpID, userID: randomBytes(24),
        userName: "most-" + randomBytes(8).toString("hex"), userDisplayName: "Profil demonstracyjny MOST",
        attestationType: "none", timeout: 90000,
        authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      });
      return { options, registration: { ...party, challenge: options.challenge } };
    },
    async finish(req, registration, credential) {
      if (!registration || !sameOrigin(req, registration)) return null;
      try {
        const result = await verifyRegistrationResponse({
          response: credential, expectedChallenge: registration.challenge, expectedOrigin: registration.origin,
          expectedRPID: registration.rpID, requireUserPresence: true, requireUserVerification: true,
        });
        return result.verified ? { origin: registration.origin, rpID: registration.rpID, credential: result.registrationInfo.credential } : null;
      } catch { return null; }
    },
  };
}
