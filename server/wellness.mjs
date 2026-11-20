import { randomBytes } from "node:crypto";
import { checklistItems } from "../src/health/model.ts";

const day = 86_400_000;
const profiles = ["ewa", "aleksandra", "kacper"];
const token = () => randomBytes(24).toString("base64url");
const iso = (time) => new Date(time).toISOString();
function demoTime(date, days, hour) {
  const time = new Date(date + days * day);
  time.setUTCHours(hour, 30, 0, 0);
  return time.toISOString();
}
const allowedChecklist = new Set(checklistItems.map(([id]) => id));
const referralFixture = {
  title: "Konsultacja okulistyczna",
  place: "Poradnia rodzinna Nad Bystrzycą · demo",
  detail: "Skierowanie do poradni okulistycznej. Na pierwszą wizytę przygotuj dokument tożsamości i dane skierowania DEMO-OK-01.",
};

export function createWellnessHandler(now = Date.now, { rooms = new Set(), sessions = new Map() } = {}) {

  function event(room, label, at, actor = "System demo", referralId, detail) {
    const entry = { id: ++room.revision, label, at: iso(at), actor, referralId, detail };
    room.history.push(entry);
    return entry;
  }
  function notify(inbox, entry, title, section, id) {
    inbox.unshift({ id: entry.id, title, at: entry.at, target: { section, id }, read: false });
  }
  function addFixture(room, type, at) {
    const id = type + "-" + (room.revision + 1);
    if (type === "referral") {
      const referral = { id, ...referralFixture, date: iso(at), deadline: iso(at + 45 * day) };
      room.cases.push({ referral, status: "new" });
      notify(room.inbox, event(room, "Wystawiono skierowanie demo", at, "System demo", id), "Nowe skierowanie · " + referral.title, "referrals", id);
      return;
    }
    const prescription = type === "prescription";
    room.records.push(prescription ? {
      id, title: "Loratadyna 10 mg", date: iso(at), kind: "prescription", state: "active", code: "DEMO-RX-" + (room.revision + 1),
      place: "Poradnia rodzinna Nad Bystrzycą", detail: "Przykładowy dokument recepty.", directions: "1 tabletka raz dziennie (przykładowy zapis).",
    } : {
      id, title: "Morfologia krwi", date: iso(at), kind: "test", place: "Laboratorium Nad Bystrzycą · demo",
      specialty: "Diagnostyka laboratoryjna", detail: "Sprawozdanie laboratoryjne z fikcyjnej próbki. Szczegóły omów z personelem medycznym.",
      document: "SPRAWOZDANIE LABORATORYJNE · DEMO\nMateriał: krew żylna\nHemoglobina: 13,4 g/dl\nLeukocyty: 6,1 × 10⁹/l\nPłytki krwi: 248 × 10⁹/l\nFikcyjne wartości bez interpretacji.",
    });
    notify(room.inbox, event(room, prescription ? "Wystawiono receptę demo" : "Opublikowano wynik demo", at),
      prescription ? "Nowa recepta · Loratadyna" : "Nowy wynik · Morfologia krwi", prescription ? "prescriptions" : "results", id);
  }
  function reset(room, at) {
    for (const grant of room.grants ?? []) sessions.delete(grant.token);
    Object.assign(room, { grants: [], cases: [], history: [], inbox: [], upcoming: [], records: [], start: at });
    if (room.profile === "ewa") {
      addFixture(room, "prescription", at - 3 * day);
      addFixture(room, "result", at - day);
      addFixture(room, "referral", at);
      room.records.push(
        { id: "consult", title: "Konsultacja w poradni rodzinnej", date: iso(at - 6 * day), place: referralFixture.place, detail: "Podsumowanie wizyty demonstracyjnej. Dokumentacja jest częścią fikcyjnej historii.", kind: "consultation" },
        { id: "hospital", title: "Pobyt na oddziale jednodniowym", date: iso(at - 400 * day), place: "Szpital Miejski · demo", detail: "Fikcyjna karta pobytu jednodniowego.", kind: "hospital" },
        { id: "visit-past", title: "Wizyta kontrolna", date: iso(at - 35 * day), place: referralFixture.place, detail: "Wizyta zakończona w demonstracji.", kind: "visit" },
        { id: "rx-past", title: "Witamina D₃", date: iso(at - 62 * day), place: referralFixture.place, detail: "Fikcyjna recepta zrealizowana w scenariuszu.", kind: "prescription", state: "filled", code: "DEMO-RX-ARCH" },
        { id: "rx-archive", title: "Witamina B₁₂", date: iso(at - 385 * day), place: referralFixture.place, detail: "Przykładowa recepta przeniesiona do archiwum.", kind: "prescription", state: "archived", code: "DEMO-RX-HIST" },
        { id: "procedure", title: "Usunięcie szwów", date: iso(at - 65 * day), place: "Poradnia zabiegowa Nad Bystrzycą", detail: "Przykładowa karta zabiegu ambulatoryjnego.", kind: "procedure", specialty: "Chirurgia ogólna", document: "KARTA ZABIEGU · DANE PRZYKŁADOWE\nUsunięcie szwów. Dokument fikcyjny." },
      );
    } else if (room.profile === "aleksandra") {
      room.records.push({ id: "checkup", title: "Wizyta profilaktyczna", date: iso(at - 20 * day), place: "Przychodnia Parkowa · demo", detail: "Zakończona wizyta demonstracyjna.", kind: "visit" });
    }
  }
  function slots(room) {
    return [
      { id: "nad-rzeka", place: "Poradnia Nad Rzeką · demo", time: demoTime(room.start, 4, 9) },
      { id: "parkowa", place: "Centrum Zdrowia Parkowa · demo", time: demoTime(room.start, 8, 12) },
      { id: "miejska", place: "Poradnia Miejska · demo", time: demoTime(room.start, 12, 10) },
    ].filter((slot) => !room.upcoming.some((visit) => visit.slot === slot.id));
  }
  function sync(room, at) {
    for (const grant of room.grants) {
      if (!["active", "waiting"].includes(grant.status) || Date.parse(grant.expires) > at) continue;
      grant.status = "expired";
      releaseWork(room, grant);
      const expired = event(room, "Upoważnienie wygasło", at, "System demo", grant.referralId);
      notify(room.inbox, expired, expired.label, "access");
    }
    for (const item of room.cases) {
      if (!item.reminderAt || Date.parse(item.reminderAt) > at) continue;
      item.reminderAt = undefined;
      const reminder = event(room, "Przypomnienie o skierowaniu", at, "System demo", item.referral.id);
      notify(room.inbox, reminder, reminder.label + " · " + item.referral.title, "referrals", item.referral.id);
    }
    for (const visit of room.upcoming) {
      const remaining = Date.parse(visit.time) - at;
      if (visit.reminded || remaining < 0 || remaining > 2 * day) continue;
      visit.reminded = true;
      const reminder = event(room, "Zbliża się wizyta demo", at, "System demo", visit.referralId);
      notify(room.inbox, reminder, reminder.label + " · " + visit.title, "visits", visit.id);
    }
  }
  const openGrant = (room, id) => room.grants.find((grant) => grant.referralId === id && ["active", "waiting"].includes(grant.status));
  function resourceFor(room, resource) {
    if (resource?.section === "results") return room.records.find(({ id, kind }) => id === resource.id && kind === "test");
    if (resource?.section === "visits") return room.upcoming.find(({ id }) => id === resource.id);
  }
  function releaseWork(room, grant) {
    const item = room.cases.find(({ referral }) => referral.id === grant.referralId);
    if (item && grant.prepare && ["preparing", "correction"].includes(item.status)) item.status = "new";
  }
  function projection(room, grant) {
    const owner = !grant;
    const cases = room.cases.filter((item) => owner || item.referral.id === grant.referralId).map((item) => {
      const visit = grant?.prepare && room.upcoming.find(({ referralId }) => referralId === item.referral.id);
      return {
        referral: { ...item.referral, status: item.status, ...(!owner && !grant.details ? { place: "", detail: "" } : {}) },
        status: item.status, shared: !!openGrant(room, item.referral.id),
        ...(owner || grant.prepare ? { plan: item.plan, feedback: item.feedback, reviewId: item.reviewId } : {}),
        ...(visit ? { appointment: { place: visit.place, time: visit.time } } : {}),
        ...(owner ? { reminderAt: item.reminderAt } : {}),
      };
    });
    return {
      role: owner ? "owner" : "helper", revision: room.revision, cases,
      slots: owner || grant.prepare ? slots(room) : [],
      grants: (grant ? [grant] : room.grants).map(({ inbox, token: key, ...access }) => ({
        ...access, ...(owner && ["waiting", "active"].includes(access.status) ? { token: key } : {}),
      })),
      notifications: owner ? room.inbox : grant.inbox,
      history: owner ? room.history : [],
      ...(owner ? { profile: room.profile, records: room.records, upcoming: room.upcoming } : {}),
      ...(grant?.resource?.section === "results" ? { sharedRecord: resourceFor(room, grant.resource) } : {}),
      ...(grant?.resource?.section === "visits" ? { sharedVisit: resourceFor(room, grant.resource) } : {}),
    };
  }

  return function handle(req, reply, body) {
    const at = now();
    const error = (status, message) => reply(status, { error: message });
    if (req.url === "/api/wellness/session") {
      if (!profiles.includes(body?.profile)) return error(400, "Wybierz profil demonstracyjny.");
      for (const room of rooms) {
        if (room.expires > at) continue;
        for (const grant of room.grants) sessions.delete(grant.token);
        sessions.delete(room.token);
        rooms.delete(room);
      }
      if (rooms.size >= 256) return error(503, "Osiągnięto limit sesji demonstracyjnych.");
      const stage = body.stage === true;
      const room = { token: token(), profile: body.profile, stage, revision: 0, expires: at + (stage ? 8 * 3_600_000 : 60 * day) };
      reset(room, at);
      rooms.add(room);
      sessions.set(room.token, { room });
      return reply(201, { token: room.token, view: projection(room) });
    }
    const session = sessions.get(req.headers.authorization?.match(/^Bearer ([\w-]{32})$/)?.[1]);
    if (!session || session.room.expires <= at) return error(401, "Sesja demonstracyjna jest niedostępna.");
    const { room, grant } = session;
    const owner = !grant;
    const actor = owner ? room.profile === "ewa" ? "Ewa" : "Właściciel" : "Kacper";
    sync(room, at);
    if (grant && ["revoked", "expired"].includes(grant.status))
      return error(410, grant.status === "expired" ? "Czas dostępu upłynął." : grant.resource ? "Ewa cofnęła dostęp do dokumentu." : "Ewa cofnęła dostęp do skierowania.");
    const done = () => reply(200, { view: projection(room, grant) });
    if (req.method === "GET") {
      if (grant?.status === "waiting") {
        grant.status = "active";
        const joined = event(room, grant.resource ? "Kacper otworzył udostępniony dokument" : "Kacper otworzył skierowanie", at, actor, grant.referralId);
        notify(room.inbox, joined, joined.label, grant.resource?.section ?? "referrals", grant.resource?.id ?? grant.referralId);
      }
      return done();
    }
    const denied = () => error(403, "Ta czynność wykracza poza zakres dostępu.");
    const conflict = () => error(409, "Sprawdź aktualny stan skierowania lub wybierz inny termin.");
    if (body?.type === "read") {
      const item = (owner ? room.inbox : grant.inbox).find((item) => item.id === body.id);
      if (!item) return denied();
      if (!item.read) {
        item.read = true;
        room.revision++;
      }
      return done();
    }
    if (body?.type === "reset" || body?.type === "simulate") {
      if (!owner || !room.stage || room.profile !== "ewa") return denied();
      if (body.type === "reset") reset(room, at);
      else {
        if (!["prescription", "result", "referral"].includes(body.event)) return error(400, "Wybierz rodzaj zdarzenia.");
        if (room.records.length + room.cases.length >= 60) return error(409, "Zresetuj pokaz, aby dodać kolejne zdarzenia.");
        addFixture(room, body.event, at);
      }
      return done();
    }
    if (body?.type === "revoke") {
      if (!owner) return denied();
      const access = room.grants.find((item) => item.id === body.grant);
      if (!access || !["active", "waiting"].includes(access.status)) return conflict();
      access.status = "revoked";
      releaseWork(room, access);
      const revoked = event(room, "Cofnięto dostęp Kacpra", at, actor, access.referralId);
      notify(room.inbox, revoked, revoked.label, "access");
      return done();
    }
    if (body?.type === "share") {
      if (!owner) return denied();
      const shared = resourceFor(room, body.resource);
      if (!shared || ![5, 15, 60].includes(body.minutes)) return error(400, "Wybierz dokument i czas dostępu.");
      const resource = { section: body.resource.section, id: shared.id };
      if (room.grants.length >= 60 || room.grants.some((entry) => entry.resource?.id === resource.id &&
          entry.resource.section === resource.section && ["active", "waiting"].includes(entry.status))) return conflict();
      const entry = event(room, "Udostępniono dokument zdrowotny", at, actor, undefined, shared.title);
      const access = { id: entry.id, resource, title: shared.title, status: "waiting", expires: iso(at + body.minutes * 60_000),
        token: token(), details: true, prepare: false, inbox: [] };
      room.grants.push(access);
      sessions.set(access.token, { room, grant: access });
      notify(access.inbox, entry, "Udostępniono Ci dokument · " + shared.title, resource.section, resource.id);
      return done();
    }
    const item = room.cases.find((entry) => entry.referral.id === body?.id);
    if (!item || (!owner && grant.referralId !== body.id)) return denied();
    const id = item.referral.id;
    if (body.type === "remind") {
      if (!owner) return denied();
      if (typeof body.enabled !== "boolean" || item.status === "confirmed") return conflict();
      item.reminderAt = body.enabled ? iso(at + day) : undefined;
      event(room, body.enabled ? "Ustawiono przypomnienie o skierowaniu" : "Wyłączono przypomnienie o skierowaniu", at, actor, id);
      return done();
    }
    if (body.type === "invite") {
      if (!owner || room.profile !== "ewa") return denied();
      if (openGrant(room, id) || ["confirmed", "review"].includes(item.status) || room.grants.length >= 60) return conflict();
      if (![5, 15, 60].includes(body.minutes) || typeof body.details !== "boolean" || typeof body.prepare !== "boolean")
        return error(400, "Wybierz uprawnienia i czas dostępu.");
      const entry = event(room, "Udzielono dostępu do skierowania", at, actor, id, [body.details ? "szczegóły skierowania" : "podstawowe dane", ...(body.prepare ? ["przygotowanie wizyty"] : []), body.minutes + " min"].join(" · "));
      const fresh = { id: entry.id, referralId: id, status: "waiting", expires: iso(at + body.minutes * 60_000), token: token(), details: body.details, prepare: body.prepare, inbox: [] };
      if (body.prepare) item.status = "preparing";
      room.grants.push(fresh);
      sessions.set(fresh.token, { room, grant: fresh });
      notify(fresh.inbox, entry, "Ewa zaprosiła Cię do pomocy", "referrals", id);
      return done();
    }
    if (["save", "submit", "book"].includes(body.type)) {
      if (body.type === "book" ? !owner : owner || !grant.prepare) return denied();
      if (["confirmed", "review"].includes(item.status) || (owner && openGrant(room, id)?.prepare) ||
          (!owner && !["preparing", "correction"].includes(item.status))) return conflict();
      const plan = body.plan;
      if (!slots(room).some(({ id }) => id === plan?.slot) ||
          !["telefon-demo", "aplikacja-demo"].includes(plan?.contact) ||
          !Array.isArray(plan?.checklist) || plan.checklist.length > 3 ||
          !plan.checklist.every((key) => allowedChecklist.has(key))) return error(400, "Wybierz termin, kontakt i elementy listy.");
      const next = { slot: plan.slot, contact: plan.contact, checklist: checklistItems.map(([key]) => key).filter((key) => plan.checklist.includes(key)) };
      if (body.type === "submit" && item.status === "correction" && JSON.stringify(next) === item.previousPlan)
        return error(409, "Wprowadź poprawki przed ponownym przekazaniem.");
      item.plan = next;
      if (body.type === "book") return confirm();
      const selected = slots(room).find(({ id }) => id === next.slot);
      const summary = [selected.place, selected.time, next.contact, ...checklistItems.filter(([key]) => next.checklist.includes(key)).map(([, label]) => label)].join(" · ");
      if (body.type === "save") {
        event(room, "Zapisano plan wizyty", at, actor, id, summary);
        return done();
      }
      item.status = "review";
      const entry = event(room, "Przekazano plan do zatwierdzenia", at, actor, id, summary);
      item.reviewId = entry.id;
      notify(room.inbox, entry, "Kacper przygotował wizytę do zatwierdzenia", "review", id);
      return done();
    }
    if (["approve", "correct", "reject"].includes(body.type)) {
      if (!owner) return denied();
      if (item.status !== "review" || body.reviewId !== item.reviewId) return conflict();
      if (body.type === "approve") return confirm();
      const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
      if (!feedback || feedback.length > 240) return error(400, "Wpisz uwagę demonstracyjną do 240 znaków.");
      const correction = body.type === "correct";
      if (correction && !openGrant(room, id)) return conflict();
      item.status = correction ? "correction" : "declined";
      item.feedback = feedback;
      item.previousPlan = JSON.stringify(item.plan);
      const entry = event(room, correction ? "Poproszono o poprawki" : "Odrzucono plan wizyty", at, actor, id, feedback);
      const access = openGrant(room, id);
      if (access) notify(access.inbox, entry, correction ? "Ewa poprosiła o poprawki" : "Ewa odrzuciła plan wizyty", "referrals", id);
      return done();
    }
    return error(400, "Nieznane działanie.");

    function confirm() {
      const slot = slots(room).find(({ id }) => id === item.plan.slot);
      if (!slot) return conflict();
      item.status = "confirmed";
      item.reminderAt = undefined;
      room.upcoming.push({ ...slot, slot: slot.id, id: "visit-" + id, referralId: id, title: item.referral.title, checklist: item.plan.checklist });
      const entry = event(room, "Dodano wizytę do terminarza demo", at, actor, id, slot.place + " · " + slot.time);
      notify(room.inbox, entry, entry.label, "visits", "visit-" + id);
      const access = openGrant(room, id);
      if (access) notify(access.inbox, entry, "Ewa zatwierdziła wizytę demonstracyjną", "referrals", id);
      return done();
    }
  };
}
