import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import { DigitalCard,documentTitles } from "./DigitalCard";
import type { Profile } from "./domain";
function Card({
  id,
  active,
  rank,
  mode,
  spread,
  position,
  p,
  onOpen,
  gap,
}: {
  id: number;
  gap:number;
  active: number;
  rank: number;
  mode: string;
  spread: MotionValue<number>;
  position: MotionValue<number>;
  p: Profile;
  onOpen: () => void;
}) {
  const x = useTransform(position, (v) =>
    mode === "carousel"
      ? (((id - v + 6) % 4) - 2) * gap
      : id === active
        ? (v - active) * -120
        : 0,
  );
  const rawY = useTransform(spread, (v) =>
    mode === "stack" ? rank * (46 + v * 39) : 10,
  );
  const springY=useSpring(rawY,{stiffness:520,damping:45});
  const reduced=useReducedMotion();
  const scale = useTransform(position, (v) =>
    mode === "carousel" ? 1 - Math.min(Math.abs(id - v), 1) * 0.075 : .955+rank*.015,
  );
  return (
    <motion.div
      className={"gesture-card " + (id === active ? "deck-front" : "deck-rear")+(((id-active+4)%4)===3?" neighbor-before":" neighbor-after")}
      style={{
        x,
        y:reduced?rawY:springY,
        scale,
        zIndex: mode === "stack" ? rank + 1 : id === active ? 5 : 1,
      }}
    >
      <DigitalCard p={p} id={id} onOpen={onOpen} />
      {mode==="carousel"&&id!==active&&<span className="card-edge-label" aria-hidden="true">{documentTitles(p)[id]}</span>}
      {mode === "stack" && id !== active && (
        <button
          className="gesture-spine"
          aria-label={
            "Wybierz " +
            [
              "Dowód",
              "Prawo jazdy",
              "Pojazd",
              p.extra === "Karta EKUZ" ? "EKUZ" : "Studia",
            ][id]
          }
          onClick={onOpen}
        />
      )}
    </motion.div>
  );
}
export function GestureDeck({
  p,
  active,
  onSelect,
  onOpen,
  onAll,
}: {
  p: Profile;
  active: number;
  onSelect: (id: number) => void;
  onOpen: (id: number) => void;
  onAll:()=>void;
}) {
  const [mode, setMode] = useState(() => {
      try {
        return localStorage.getItem("wallet-layout") === "carousel"
          ? "carousel"
          : "stack";
      } catch {
        return "stack";
      }
    }),
    [expanded, setExpanded] = useState(false);
  const [options,setOptions]=useState(false);
  const [narrow,setNarrow]=useState(window.innerWidth<=360);
  useEffect(()=>{const resize=()=>setNarrow(window.innerWidth<=360);window.addEventListener("resize",resize);return()=>window.removeEventListener("resize",resize)},[]);
  const spread = useMotionValue(0),
    position = useMotionValue(active),
    reduced = useReducedMotion();
  const gesture = useRef<{
      x: number;
      y: number;
      axis: string;
      start: number;
      spread: number;
      pointer: number;
    } | null>(null),
    blocked = useRef(false);
  const spring = {
    type: "spring" as const,
    stiffness: 380,
    damping: 38,
    mass: 0.8,
  };
  useEffect(() => {
    const a = animate(position, active, reduced ? { duration: 0 } : spring);
    return () => a.stop();
  }, [active, mode]);
  const height = useTransform(spread, (v) =>
    mode === "stack" ? 378 + v * 120 : 252,
  );
  const order = [0, 1, 2, 3].filter((i) => i !== active).concat(active);
  function expand(next: boolean) {
    setExpanded(next);
    animate(spread, next ? 1 : 0, reduced ? { duration: 0 } : spring);
  }
  function end(cancel = false) {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    if (g.axis === "y") {
      const next = cancel ? expanded : spread.get() > 0.4;
      expand(next);
    } else {
      const target = cancel
        ? active
        : Math.max(0, Math.min(3, Math.round(position.get())));
      onSelect(target);
      animate(position, target, reduced ? { duration: 0 } : spring);
    }
    setTimeout(() => (blocked.current = false), 0);
  }
  return (
    <>
      <div className="wallet-layout-choice" aria-label="Układ portfela"><button className="wallet-view-trigger" aria-label="Opcje widoku" aria-expanded={options} onClick={()=>setOptions(!options)}>•••</button>{options&&<div className="wallet-view-menu">
        {[
          ["stack", "Stos"],
          ["carousel", "Karuzela"],
        ].map(([id, title]) => (
          <button
            key={id}
            aria-pressed={mode === id}
            onClick={() => {
              setMode(id);
              try {
                localStorage.setItem("wallet-layout", id);
              } catch {}
              expand(false);setOptions(false);
            }}
          >
            {title}
          </button>
        ))}
        {mode === "stack" && (
          <button
            className="expand-deck"
            aria-expanded={expanded}
            onClick={() => {expand(!expanded);setOptions(false)}}
          >
            {expanded ? "Zwiń" : "Rozwiń"} stos
          </button>
        )}
        <button onClick={()=>{setOptions(false);onAll()}}>Wszystkie dokumenty</button></div>}
      </div>
      <motion.div
        className={"gesture-deck portfolio-stage mode-" + mode}
        style={{ height,touchAction:expanded?'pan-y':'none' }}
        aria-label={
          mode === "stack" ? "Stos dokumentów" : "Karuzela dokumentów"
        }
        onPointerDown={(e) => {
          if(options)setOptions(false);
          if (e.button !== 0) return;
          position.stop();
          spread.stop();
          gesture.current = {
            x: e.clientX,
            y: e.clientY,
            axis: "",
            start: active,
            spread: spread.get(),
            pointer: e.pointerId,
          };
        }}
        onPointerMove={(e) => {
          const g = gesture.current;
          if (!g) return;
          const dx = e.clientX - g.x,
            dy = e.clientY - g.y;
          if (!g.axis && Math.hypot(dx, dy) > 8) {
            g.axis =
              mode === "stack" && Math.abs(dy) > Math.abs(dx) ? "y" : "x";
            blocked.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          if (g.axis === "y")
            spread.set(Math.max(0, Math.min(1, g.spread + dy / 160)));
          else if (g.axis === "x")
            position.set(Math.max(-0.15, Math.min(3.15, g.start - dx / 250)));
        }}
        onPointerUp={() => end()}
        onPointerCancel={() => end(true)}
        onLostPointerCapture={() => {
          if (gesture.current) end(true);
        }}
        onClickCapture={(e) => {
          if (blocked.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            onSelect(
              Math.max(
                0,
                Math.min(3, active + (e.key === "ArrowRight" ? 1 : -1)),
              ),
            );
          }
        }}
      >
        {[0, 1, 2, 3].map((id) => (
          <Card
            key={mode+id+narrow}
            id={id}
            gap={narrow?250:282}
            active={active}
            rank={order.indexOf(id)}
            mode={mode}
            spread={spread}
            position={position}
            p={p}
            onOpen={() => {
              onSelect(id);
              if(mode==='stack'||id===active)onOpen(id);
            }}
          />
        ))}
      </motion.div>
      <p className="wallet-gesture-hint">
        {mode === "stack"
          ? "Przeciągnij w dół, aby rozsunąć dokumenty"
          : "Przesuń kartę lub dotknij sąsiedniego dokumentu"}
      </p>
    </>
  );
}
