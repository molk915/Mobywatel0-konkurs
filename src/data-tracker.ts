import type { Access, CitizenState, Profile } from "./domain";
import type { ControlEvent } from "./most/control-model";
import type { MostEvent } from "./most/model";
import { eventLabels } from "./most/model";

export function withTrackerExamples(citizen: CitizenState, profile: Profile): CitizenState {
  const examples: Access[] = [
    {
      id: "tracker-demo-age",
      who: "Żabka · przykład",
      purpose: "Potwierdzenie pełnoletności",
      scope: "Wyłącznie potwierdzenie ukończenia 18 lat. Sklep nie otrzymał imienia, nazwiska, dokładnej daty urodzenia ani numeru PESEL.",
      at: "2026-11-24T16:23:00+01:00",
      source: "share",
      sourceLabel: "Demonstracyjny ślad udostępnienia z mDowodu",
      basis: "Potwierdzenie przez użytkownika w pokazie",
      active: false,
      revocable: false,
    },
    {
      id: "tracker-demo-residence",
      who: "Urząd Miasta Warszawy",
      purpose: "Sprawdzenie adresu w celu rozpatrzenia wniosku",
      registry: "Rejestr PESEL",
      scope: "Imię, nazwisko i adres zameldowania",
      at: "2026-11-23T09:42:00+01:00",
      source: "registry",
      basis: "Realizacja zadania publicznego w przykładowym scenariuszu",
      active: false,
      revocable: false,
    },
    {
      id: "tracker-demo-identity",
      who: "ZUS",
      purpose: "Weryfikacja danych przy rozpatrywaniu świadczenia",
      registry: "Rejestr PESEL",
      scope: "Imię, nazwisko i dane identyfikacyjne",
      at: "2026-11-20T11:07:00+01:00",
      source: "registry",
      active: false,
      revocable: false,
    },
    {
      id: "tracker-demo-bank",
      who: "Bank · przykład",
      purpose: "Sprawdzenie statusu zastrzeżenia PESEL przed zawarciem umowy",
      registry: "Rejestr zastrzeżeń numerów PESEL",
      scope: "Wyłącznie status zastrzeżenia",
      at: "2026-11-22T14:05:00+01:00",
      source: "pesel",
      basis: "Weryfikacja przed zawarciem umowy w przykładowym scenariuszu",
      active: false,
      revocable: false,
    },
    {
      id: "tracker-demo-bank-identity",
      who: "Bank · przykład",
      purpose: "Potwierdzenie tożsamości przy otwieraniu rachunku",
      scope: "Imię, nazwisko i potwierdzenie ważności dokumentu",
      at: "2026-11-19T14:52:00+01:00",
      source: "bank",
      sourceLabel: "Przykładowe potwierdzenie przekazane przez bank",
      active: false,
      revocable: false,
    },
    ...(profile.id === "ewa" ? [{
      id: "tracker-demo-most",
      who: "Kacper Zieliński",
      purpose: "Otwarcie pisma, aby pomóc w przygotowaniu odpowiedzi",
      scope: "Treść jednego udostępnionego pisma",
      at: "2026-11-21T12:10:00+01:00",
      source: "most" as const,
      sourceLabel: "Przykładowa historia MOST",
      basis: "Zakres dostępu przyznany przez właścicielkę w pokazie",
      active: false,
      revocable: false,
    }] : []),
  ];
  const missing = examples.filter(({ id }) => !citizen.access.some((entry) => entry.id === id));
  return missing.length ? { ...citizen, access: [...citizen.access, ...missing] } : citizen;
}

export const trackerDate = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Warsaw",
});

export const trackerExactDate = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Warsaw",
});

export function accessStatus(access: Access) {
  if (access.source && access.source !== "share") return "Operacja zapisana";
  if (access.active) return access.revocable ? "Dostęp aktywny" : "Zdarzenie zapisane";
  if (!access.revocable) return "Udostępniono";
  return access.inactiveReason === "expired" ? "Dostęp wygasł" : "Zgoda wycofana";
}

export function trackedMostEvents(history: ControlEvent[]): Access[] {
  return history.filter(({ grant, result, resource }) =>
    resource && (grant || result === "Wykonano") && ["Odczytano", "Wykonano"].includes(result ?? ""))
    .map((event) => ({
      id: "most:" + event.id, who: event.actor, purpose: event.label, scope: event.scope ?? event.detail ?? "Udostępniona sprawa w MOST",
      at: event.at, source: "most", sourceLabel: "Dziennik operacji MOST", basis: "Dostęp przyznany w MOST",
      active: false, revocable: false,
    }));
}

const letterOperations: Partial<Record<MostEvent["type"], string>> = {
  join: "Udostępnione pismo i zakres sprawy zatwierdzony przez Ewę",
  form: "Formularz odpowiedzi na udostępnione pismo",
  response: "Uzasadnienie w odpowiedzi na udostępnione pismo",
  attach: "Załącznik w odpowiedzi na udostępnione pismo",
  saveDraft: "Szkic odpowiedzi na udostępnione pismo",
  review: "Pakiet odpowiedzi na udostępnione pismo",
  send: "Pakiet wysłany w symulacji",
};

export function trackedLetterEvents(history: MostEvent[]): Access[] {
  return history.flatMap((event) => {
    const scope = letterOperations[event.type];
    if (event.role !== "helper" || !scope) return [];
    return [{
      id: "most-letter:" + event.id, who: "Kacper Zieliński", purpose: eventLabels[event.type], scope,
      at: event.at, source: "most" as const, sourceLabel: "Historia pisma w MOST",
      basis: "Dostęp przyznany w MOST", active: false, revocable: false,
    }];
  });
}

export function trackerSource(entry: Access) {
  return entry.sourceLabel ?? entry.registry ??
    (entry.source === "share" || entry.expiresAt ? "Historia udostępnień mObywatela" : "Przykładowa historia aplikacji");
}
