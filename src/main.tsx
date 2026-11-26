import React, { lazy, Suspense } from "react";
import { MotionConfig } from "motion/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { DelegatedWorkflow } from "./workflows/Workspace";
import { ErrorBoundary } from "./ErrorBoundary";
import "./styles.css";
import "./redesign.css";
import "./portfolio.css";
import "./outcomes.css";
import "./native.css";
import "./experience.css";
import "./wallet-art.css";
import "./approved-design.css";
import "./most/most.css";
import "./civic-system.css";
import "./health/health.css";
import "./product-system.css";
import "./civic-dashboard.css";
import "./data-tracker.css";
import "./most/inline-showcase.css";

const MostRoutes = lazy(() => import("./most/MostRoutes"));
const MostDashboardShowcase = lazy(() => import("./most/MostDashboardShowcase"));

function Prototype() {
  const grant = location.hash.match(/^#workflow=([a-zA-Z0-9_-]{32})$/)?.[1];
  if (grant) return <DelegatedWorkflow token={grant} />;
  const params = new URLSearchParams(location.search);
  if (params.get("pokaz") === "most3") return <Suspense fallback={<p className="most-loading" role="status">Otwieramy pokaz MOST…</p>}><MostDashboardShowcase /></Suspense>;
  const mode = params.get("pokaz") === "most" ? "stage" : params.get("ramka") === "1" && parent !== window ? params.get("most") : null;
  if (mode !== "stage" && mode !== "ewa" && mode !== "pomoc" && mode !== "czeka") return <App />;
  return (
    <Suspense fallback={<p className="most-loading" role="status">Otwieramy MOST…</p>}>
      <MostRoutes mode={mode} />
    </Suspense>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user"><Prototype /></MotionConfig>
    </ErrorBoundary>
  </React.StrictMode>,
);
if (import.meta.env.PROD) {
  const hadController = !!navigator.serviceWorker?.controller;
  let refreshing = false;
  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    if (hadController && !refreshing) {
      refreshing = true;
      location.reload();
    }
  });
  document.documentElement.dataset.pwaStatus =
    "serviceWorker" in navigator ? "preparing" : "unsupported";
  const register = () => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.update().catch(() => {});
        return navigator.serviceWorker.ready;
      })
      .then(() => {
        document.documentElement.dataset.pwaStatus = "ready";
      })
      .catch(() => {
        document.documentElement.dataset.pwaStatus = "unavailable";
      });
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(
        registrations
          .filter((r) => r.active?.scriptURL === location.origin + "/sw.js")
          .map((r) => r.unregister()),
      ),
    )
    .catch(() => {});
}
