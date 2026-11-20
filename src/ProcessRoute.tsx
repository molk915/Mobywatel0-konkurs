import { Check, Download } from "lucide-react";
import { useReducedMotion } from "motion/react";
import type { Receipt } from "./domain";
export function ProcessRoute({ receipt: r }: { receipt: Receipt }) {
  const reduced = useReducedMotion();
  if (!r.operations) return null;
  const arrival = new Date(r.data.date + "T12:00:00Z");
  const due = new Date(arrival);
  due.setUTCDate(due.getUTCDate() + 30);
  function focusOperation(id: string) {
    document.getElementById("operation-" + id)?.scrollIntoView({
      behavior: reduced ? "instant" : "smooth",
      block: "start",
    });
  }
  function download() {
    const text = [
      "SZKIC DEMONSTRACYJNY — nie jest formularzem urzędowym",
      r.id,
      "Adres: " + r.data.city + ", " + r.data.street + ", " + r.data.postal,
      "Data pobytu: " + r.data.date,
      ...r.operations!.map(
        (o) => o.title + " | " + o.recipient + " | " + o.scope,
      ),
      "Nic nie zostało wysłane.",
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "Plan_przeprowadzki_DEMO.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="process-route">
      <h2>Twój plan przeprowadzki</h2>
      <p>
        Każda formalność ma własny wynik. Dotknij etapu, aby przejść do
        działania.
      </p>
      <div className="process-arrival">
        <span>Początek pobytu</span>
        <strong>
          {arrival.toLocaleDateString("pl-PL", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Europe/Warsaw",
          })}
        </strong>
      </div>
      <ol>
        {r.operations.map((o, i) => {
          const ready = o.status === "accepted" || o.status === "manual-done";
          return (
            <li key={o.id} className={ready ? "ready" : ""}>
              <i>{ready ? <Check size={14} /> : i + 1}</i>
              <button onClick={() => focusOperation(o.id)}>
                <strong>{o.title}</strong>
                <small>
                  {o.id === "meldunek"
                    ? "Najpierw dokument do lokalu → potem wynik zameldowania"
                    : o.id === "tax"
                      ? "Osobna formalność · zakres zatwierdzony w planie"
                      : "Działanie poza aplikacją · potwierdzasz samodzielnie"}
                </small>
                <b>
                  {o.status === "needs-document"
                    ? "Dołącz brakujący dokument →"
                    : o.status === "manual"
                      ? "Sprawdź następny krok →"
                      : o.status === "manual-done"
                        ? "Potwierdzone przez Ciebie"
                        : "Gotowe w symulacji"}
                </b>
                {o.id === "meldunek" && r.data.type === "stały" && (
                  <small>
                    Termin w przykładzie: do{" "}
                    {due.toLocaleDateString("pl-PL", {
                      timeZone: "Europe/Warsaw",
                    })}{" "}
                    · 30 dni od przybycia
                  </small>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <details className="simulation-sources">
        <summary>Założenia terminów</summary>
        <p>
          Przykład dla pełnoletniego obywatela Polski i pobytu stałego. Termin
          liczony od podanej daty przybycia. Właściwą procedurę i dokumenty
          sprawdź przed rzeczywistym działaniem.
        </p>
        <a
          href="https://www.gov.pl/web/gov/zamelduj-sie-na-pobyt-staly-lub-czasowy-dluzszy-niz-3-miesiace"
          target="_blank"
          rel="noreferrer"
        >
          Zameldowanie — gov.pl ↗
        </a>
      </details>
      <button className="text-button" onClick={download}>
        <Download size={16} />
        Pobierz szkic danych · TXT
      </button>
    </section>
  );
}
