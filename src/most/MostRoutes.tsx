import { MostHelper } from "./MostHelper";
import { MostOwner } from "./MostOwner";
import { MostPresentation } from "./MostPresentation";
import { WaitingForEwa } from "./components";

export default function MostRoutes({ mode }: { mode: "stage" | "ewa" | "pomoc" | "czeka" }) {
  if (mode === "stage") return <MostPresentation />;
  const framed = new URLSearchParams(location.search).get("ramka") === "1" && parent !== window;
  const context = framed ? "stage" : "app";
  return (
    <main className={"most-standalone" + (framed ? " most-framed" : "")}>
      {mode === "ewa" ? <MostOwner context={context} /> :
        mode === "pomoc" ? <MostHelper context={context} /> : <WaitingForEwa />}
    </main>
  );
}
