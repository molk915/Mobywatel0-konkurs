import { motion, useReducedMotion } from "motion/react";
import { Car, GraduationCap, Heart, IdCard, ShieldCheck } from "lucide-react";
import { VehicleArt } from "./VehicleArt";
import type { Profile } from "./domain";
export const documentTitles = (p: Profile) => [
  "mDowód",
  "mPrawo jazdy",
  "Moje pojazdy",
  p.extra,
  "Karta Dużej Rodziny",
];
export function DigitalCard({
  p,
  id,
  onOpen,
}: {
  p: Profile;
  id: number;
  onOpen?: () => void;
}) {
  const reduced = useReducedMotion(),
    titles = documentTitles(p),
    student = p.extra !== "Karta EKUZ";
  const Icon =
    id === 1 ? IdCard : id === 2 ? Car : id===4?GraduationCap:student ? GraduationCap : Heart;
  const body = (
    <>
      <div className="digital-card-head">
        <span>
          <small>
            {id === 0
              ? "RZECZPOSPOLITA POLSKA"
              : id === 1
                ? "UPRAWNIENIA KIEROWCY"
                : id === 2
                  ? "TWÓJ POJAZD"
                  : "DOKUMENT OSOBISTY"}
          </small>
          <strong>{titles[id]}</strong>
        </span>
        {id === 0 ? (
          <span className="digital-country">
            <i />
            PL
          </span>
        ) : (
          <Icon size={29} strokeWidth={1.5} />
        )}
      </div>
      {id === 2 ? (
        <div className="digital-car">
          <VehicleArt />
          <div>
            <strong>WX DEMO</strong>
            <span>Toyota Corolla · 2021</span>
          </div>
        </div>
      ) : (
        <div className="digital-person">
          <img
            src={"/portraits/" + p.id + ".png"}
            alt={"Fikcyjny portret: " + p.name}
            width={100}
            height={126}
            decoding="async"
          />
          <span>
            <small>{id === 0 ? "Imię i nazwisko" : "POSIADACZ"}</small>
            <strong>
              {p.first}
              <br />
              {p.name.split(" ").slice(1).join(" ")}
            </strong>
            {id === 1 ? (
              <b className="licence-category">
                B <span>Kategoria</span>
              </b>
            ) : (
              <span className="digital-person-note">
                {id === 3
                  ? student
                    ? "Politechnika Gdańska"
                    : "Ubezpieczenie zdrowotne"
                  : "Urodz. "+p.birth}
              </span>
            )}
          </span>
        </div>
      )}
      <div className="digital-card-data">
        <span>
          <small>
            {id === 2
              ? "BADANIE DO"
              : id === 1
                ? "NUMER BLANKIETU"
                : id === 3
                  ? "NUMER KARTY"
                  : "NUMER DOKUMENTU"}
          </small>
          <b>
            {id === 2
              ? "01.12.2026"
              : id === 0
                ? p.number
                : id === 1
                  ? "DEMO 026/2026"
                  : "DEMO 2026 004"}
          </b>
        </span>
        <span>
          <small>{id === 2 ? "POLISA OC DO" : "WAŻNOŚĆ"}</small>
          <b>
            {id === 2
              ? "12.04.2027"
              : id === 3
                ? student
                  ? "31.03.2027"
                  : "12.06.2028"
                : "12.06.2034"}
          </b>
        </span>
      </div>
      <div className="digital-card-foot">
        <span>
          <ShieldCheck size={12} />
          Dokument demonstracyjny
        </span>
        <b>{id===2?'BADANIE 1 GRU · DEMO':'DEMO'}</b>
      </div>
    </>
  );
  const props = {
    className: "digital-card digital-card-" + id,
    layoutId: "digital-document-" + p.id + "-" + id,
    transition: reduced
      ? { duration: 0 }
      : { type: "spring" as const, stiffness: 390, damping: 38, mass: 0.8 },
  };
  return onOpen ? (
    <motion.button
      {...props}
      aria-label={"Otwórz " + titles[id]}
      onClick={onOpen}
    >
      {body}
    </motion.button>
  ) : (
    <motion.div {...props}>{body}</motion.div>
  );
}
