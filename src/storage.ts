import { initialCitizen, profiles, type CitizenState } from "./domain";
export type Store = {
  version: 1;
  profile: string;
  citizens: Record<string, CitizenState>;
  largeText: boolean;
};
const KEY = "mobywatel-next-v1";
const PROFILE_KEY = "mobywatel-profile";
export function freshStore(): Store {
  return {
    version: 1,
    profile: profiles[0].id,
    citizens: Object.fromEntries(
      profiles.map((p) => [p.id, initialCitizen(p)]),
    ),
    largeText: false,
  };
}
export function loadStore(): Store {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      raw?.version === 1 &&
      profiles.some((p) => p.id === raw.profile) &&
      profiles.every(
        (p) =>
          raw.citizens?.[p.id]?.drafts &&
          Array.isArray(raw.citizens[p.id].receipts) &&
          Array.isArray(raw.citizens[p.id].access) &&
          Array.isArray(raw.citizens[p.id].messages) &&
          Array.isArray(raw.citizens[p.id].tasks),
      )
    ) {
      let profile = raw.profile;
      try {
        const selected = sessionStorage.getItem(PROFILE_KEY);
        if (profiles.some((candidate) => candidate.id === selected)) profile = selected;
      } catch {
        // Local storage still provides a starting profile.
      }
      return { ...raw, profile };
    }
  } catch {
    /* a damaged or unavailable local store starts a clean demo */
  }
  return freshStore();
}
export function saveStore(s: Store): boolean {
  try { sessionStorage.setItem(PROFILE_KEY, s.profile); }
  catch { /* Store the selection with the rest of the profile data. */ }
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
