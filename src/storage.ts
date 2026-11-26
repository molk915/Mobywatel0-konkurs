import { initialCitizen, profiles, type CitizenState, type Profile } from "./domain";
import { withTrackerExamples } from "./data-tracker";
export type Store = {
  version: 1;
  profile: string;
  citizens: Record<string, CitizenState>;
  largeText: boolean;
};
const KEY = "mobywatel-next-v1";
const PROFILE_KEY = "mobywatel-profile";
export function freshStore(initialProfile: Profile["id"] = "ewa"): Store {
  return {
    version: 1,
    profile: initialProfile,
    citizens: Object.fromEntries(
      profiles.map((p) => [p.id, withTrackerExamples(initialCitizen(p), p)]),
    ),
    largeText: false,
  };
}
export function loadStore(phone?: "ewa" | "kacper", initialProfile?: Profile["id"]): Store {
  try {
    const raw = JSON.parse((phone ? sessionStorage.getItem(KEY + ":" + phone) : localStorage.getItem(KEY)) || "null");
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
        const selected = phone ?? sessionStorage.getItem(PROFILE_KEY);
        if (profiles.some((candidate) => candidate.id === selected)) profile = selected;
      } catch {
        // Local storage still provides a starting profile.
      }
      const citizens = Object.fromEntries(profiles.map((person) =>
        [person.id, withTrackerExamples(raw.citizens[person.id], person)]));
      return { ...raw, profile, citizens };
    }
  } catch {
    /* a damaged or unavailable local store starts a clean demo */
  }
  return freshStore(initialProfile);
}
export function saveStore(s: Store, phone?: "ewa" | "kacper"): boolean {
  if (phone) {
    try { sessionStorage.setItem(KEY + ":" + phone, JSON.stringify(s)); return true; }
    catch { return false; }
  }
  try { sessionStorage.setItem(PROFILE_KEY, s.profile); }
  catch { /* Store the selection with the rest of the profile data. */ }
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
