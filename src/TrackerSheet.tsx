import { useLayoutEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function TrackerSheet({ title, close, busy, children }: {
  title: string; close: () => void; busy?: boolean; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const sheet = dialog.current!;
    const phone = sheet.closest(".phone");
    const align = () => {
      const rect = phone?.getBoundingClientRect();
      if (!rect) return;
      sheet.style.setProperty("--sheet-x", (rect.left + rect.width / 2) + "px");
      sheet.style.setProperty("--sheet-width", Math.min(rect.width, window.innerWidth) + "px");
      sheet.style.setProperty("--sheet-bottom", Math.max(0, window.innerHeight - rect.bottom) + "px");
    };
    align();
    sheet.showModal();
    window.addEventListener("resize", align);
    return () => {
      sheet.close();
      window.removeEventListener("resize", align);
    };
  }, []);
  return <dialog ref={dialog} className="tracker-sheet" aria-label={title}
    onCancel={(event) => { event.preventDefault(); if (!busy) close(); }}
    onClick={(event) => { if (event.target === event.currentTarget && !busy) close(); }}>
    <div className="tracker-sheet-panel">
      <div className="tracker-sheet-heading">
        <h2>{title}</h2>
        <button aria-label="Zamknij" autoFocus disabled={busy} onClick={close}><X size={21} aria-hidden="true" /></button>
      </div>
      {children}
    </div>
  </dialog>;
}
