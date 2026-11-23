import { eventLabels, statusLabels as mostCaption } from "./most/model";
import { MostRow } from "./most/components";
import { Inbox, type InboxItem } from "./Inbox";
import { healthCaption, type HealthTarget } from "./health/model";
import { hasWellnessInvite, healthInbox, useWellnessSession } from "./health/session";
import { delegationToken, demoHelperToken, hasMostInvite, helperDashboardUrl, routeForMost, storedTrustedHelperToken, useMostSession } from "./most/session";
import { useControl } from "./most/control-session";
import { DocumentSelection, ApprovedDocument } from "./ApprovedDocuments";
import { CivicHeader, CivicNav, WavePattern } from "./CivicChrome";
import { FamilyEntry, FamilyWorkspace } from "./family/FamilyWorkspace";
import { isFamilyInvite, useFamilySession } from "./family/session";
import { MostEntry } from "./most/MostEntry";
import { delegationTitles, type DelegationContext } from "./most/model";
import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Car,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock3,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  Fingerprint,
  GraduationCap,
  Heart,
  HeartPulse,
  Home,
  House,
  IdCard,
  Info,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Plus,
  ScanLine,
  Search,
  Send,
  Settings2,
  Shield,
  ShieldCheck,
  Signal,
  Sparkles,
  Wifi,
  UsersRound,
  X,
} from "lucide-react";
import {
  analyzeLetter,
  caseMeta,
  completeCase,
  demoTax,
  DemoAssistant,
  ServerAssistant,
  freshDraft,
  profiles,
  sampleLetter,
  validateStep,
  type Access,
  type CaseKind,
  type CitizenState,
  type Draft,
  type Message,
  type Profile,
  type Receipt,
  type Tab,
} from "./domain";
import { freshStore, loadStore, saveStore } from "./storage";
import { Wallet } from "./DeckWallet";
import { DigitalCard, documentTitles } from "./DigitalCard";
import { PrivacyHub } from "./PrivacyHub";
import { ServiceDirectory } from "./ServiceDirectory";
import { ProcessRoute } from "./ProcessRoute";
import { Cases, type CaseCard } from "./CaseHub";
import { MovePicker, WorkflowCard, WorkflowWorkspace } from "./workflows/Workspace";
import { useWorkflows, type WorkflowReply } from "./workflows/session";
import { workflowDetails, workflowStatus, type WorkflowAction, type WorkflowCase, type WorkflowKind } from "./workflows/model";
import { VehicleArt } from "./VehicleArt";
import { MovePlan, MoveOutcomes } from "./MoveOutcomes";
import { sendMovingDocument, supplyMovingDocument } from "./domain";
import {
  receiptNextStep,
  confirmManualOperation,
} from "./domain";
import { conversationFor, openConversation, restoreNavigation, searchDocuments, type Layer } from "./navigation";
import { MostTasks, type MostSession } from "./most/MostWork";
import {
  clearAttachments,
  downloadAttachment,
  saveAttachment,
} from "./attachments";

const serverAI = import.meta.env.VITE_ASSISTANT_MODE === "server";
const previewScale = () => window.innerWidth <= 600 ? 1 : Math.min(1, (window.innerHeight - 112) / 862);
const demoAssistant = new DemoAssistant();
const assistant = serverAI ? new ServerAssistant() : demoAssistant;
const iconFor = (k: CaseKind) =>
  k === "move" ? House : k === "wallet" ? ShieldCheck : FileText;
const dateLabel = (s: string) =>
  new Date(s).toLocaleString("pl-PL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const docNames = ["mDowód", "mPrawo jazdy", "Moje pojazdy", "Karta EKUZ"];
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
function IconBox({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"icon-box " + tone}>{children}</span>;
}
function Row({
  icon,
  title,
  subtitle,
  onClick,
  trailing,
  tone,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
  trailing?: ReactNode;
  tone?: string;
}) {
  return (
    <button className="row" onClick={onClick}>
      <IconBox tone={tone}>{icon}</IconBox>
      <span className="row-copy">
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </span>
      {trailing || <ChevronRight size={17} className="muted" />}
    </button>
  );
}
function SectionTitle({
  title,
  action,
  onClick,
}: {
  title: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action && (
        <button className="text-button" onClick={onClick}>
          {action}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
function Brand() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <img src="/icon.svg" alt="" width={28} height={28}/>
    </span>
  );
}
function IdentityCard({
  p,
  onClick,
  detail = false,
}: {
  p: Profile;
  onClick?: () => void;
  detail?: boolean;
}) {
  return <DigitalCard p={p} id={0} onOpen={onClick} />;
}

const MostOwner = lazy(() => import("./most/MostOwner").then(({ MostOwner }) => ({ default: MostOwner })));
const HealthWorkspace = lazy(() => import("./health/HealthWorkspace"));
const MostHelperWorkspace = lazy(() => import("./most/MostHelper").then(({ MostHelperWorkspace }) => ({ default: MostHelperWorkspace })));
const DelegationOwner = lazy(() => import("./most/DelegationPanel").then(({ DelegationOwner }) => ({ default: DelegationOwner })));
const MostHub = lazy(() => import("./most/MostHub"));

export default function App() {
  const [showcasePhone] = useState<"ewa" | "kacper" | undefined>(() => {
    const role = new URLSearchParams(location.search).get("telefon-most");
    return window.parent !== window && (role === "ewa" || role === "kacper") ? role : undefined;
  });
  const [contestEntry] = useState(() => !history.state?.prototype &&
    ["most", "centrum", "most-hub"].includes(new URLSearchParams(location.search).get("start") ?? "") &&
    !hasMostInvite() && !hasWellnessInvite() && !isFamilyInvite());
  const [store, setStore] = useState(() => {
    const saved = loadStore(showcasePhone);
    if (showcasePhone) return { ...saved, profile: showcasePhone };
    return contestEntry ? { ...saved, profile: "ewa" } : saved;
  });
  const [healthHelpEnabled, setHealthHelpEnabled] = useState(() =>
    hasWellnessInvite() || new URLSearchParams(location.search).get("zdrowie") === "pomoc");
  const [mostHelpEnabled, setMostHelpEnabled] = useState(() =>
    hasMostInvite() || new URLSearchParams(location.search).get("most") === "pomoc");
  const [showcaseInvite, setShowcaseInvite] = useState<string>();
  const [initialNavigation] = useState<{ tab: Tab; layer: Layer | null }>(() => {
    if (isFamilyInvite()) return { tab: "cases", layer: { type: "family" } };
    if (hasMostInvite() || (mostHelpEnabled && (showcasePhone === "kacper" || !history.state?.prototype)))
      return { tab: "cases", layer: { type: "most-help" } };
    if (showcasePhone) return history.state?.prototype ? restoreNavigation(history.state, store) : { tab: "cases", layer: null };
    if (hasWellnessInvite() || (healthHelpEnabled && !history.state?.prototype))
      return { tab: "cases", layer: { type: "health", helper: true, target: { section: "referrals" } } };
    if (new URLSearchParams(location.search).get("pokaz") === "zdrowie" && !history.state?.prototype)
      return { tab: "cases", layer: { type: "health", target: { section: "home" } } };
    if (contestEntry && new URLSearchParams(location.search).get("start") === "most-hub")
      return { tab: "cases", layer: { type: "most-hub" } };
    if (contestEntry) return new URLSearchParams(location.search).get("start") === "centrum"
      ? { tab: "privacy", layer: { type: "delegation", kind: "trusted" } }
      : { tab: "cases", layer: { type: "most" } };
    return restoreNavigation(history.state, store);
  });
  const [tab, setTab] = useState<Tab>(initialNavigation.tab);
  const [layer, setLayer] = useState<Layer | null>(initialNavigation.layer);
  const [inboxOpen, setInboxOpen] = useState(() => history.state?.inboxOpen === true);
  const [notificationVisit, setNotificationVisit] = useState(0);
  const inboxTrigger = useRef<HTMLElement | null>(null);
  const inboxRef = useRef<HTMLDivElement>(null);
  const replaceNotificationEntry = useRef(false);
  const [closing, setClosing] = useState(false);
  const [fitPreference, setFitPreference] = useState<boolean | null>(null);
  const [documentQuery, setDocumentQuery] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(0);
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [saveFailed, setSaveFailed] = useState(false);
  const [deviceScale, setDeviceScale] = useState(previewScale);
  const fitPreview = fitPreference ?? deviceScale < .98;
  const historyReady = useRef(false);
  const historyPop = useRef(false);
  const storeRef = useRef(store);
  storeRef.current = store;
  const p = profiles.find((p) => p.id === store.profile)!;
  const c = store.citizens[p.id];
  const isEwa = p.id === "ewa";
  const workflows = useWorkflows(p.id);
  const ownHealthOpen = layer?.type === "health" && !layer.helper;
  const healthEwa = useWellnessSession("ewa", isEwa && (!healthHelpEnabled || ownHealthOpen));
  const healthAleksandra = useWellnessSession("aleksandra", p.id === "aleksandra" && ownHealthOpen);
  const healthKacper = useWellnessSession("kacper", p.id === "kacper" && ownHealthOpen);
  const healthHelper = useWellnessSession(null, healthHelpEnabled);
  const mostHelper = useMostSession("helper", showcasePhone === "kacper" ? "delegation-showcase-help" : "app",
    false, mostHelpEnabled || showcasePhone === "kacper", undefined, showcaseInvite);
  useEffect(() => {
    if (showcasePhone !== "kacper") return;
    function receive(event: MessageEvent) {
      if (event.source !== window.parent || event.origin !== location.origin || event.data?.type !== "most-showcase-invitation" ||
          typeof event.data.token !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(event.data.token)) return;
      setShowcaseInvite(event.data.token);
      setMostHelpEnabled(true);
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "most-showcase-ready" }, location.origin);
    return () => window.removeEventListener("message", receive);
  }, [showcasePhone]);
  const [controlTab, setControlTab] = useState<"access" | "inbox">("access");
  const [requestedMostCase, setRequestedMostCase] = useState<string>();
  const trustOwnerKey = delegationToken(p.id + "-trusted");
  const ownerControl = useControl(trustOwnerKey, !!trustOwnerKey);
  const trustedHelper = mostHelpEnabled && mostHelper.view?.delegation?.kind === "trusted" && mostHelper.view.invitation?.status === "active";
  const helperControl = useControl(mostHelper.token, !!trustedHelper);
  const health = isEwa ? healthEwa : p.id === "aleksandra" ? healthAleksandra : healthKacper;
  const familySession = useFamilySession();
  const familyVisible = p.id === "aleksandra" || familySession.data?.view.role === "tomasz" || familySession.data?.view.role === "zosia";
  const familyCase = familyVisible ? familySession.data?.view.case : null;
  function openFamily(decision = false) {
    if (!familyVisible) { setLayer({ type: "profile", service: "family" }); return; }
    if (tab !== "services" || decision) setTab("cases");
    setLayer({ type: "family", decision });
  }
  function openHealth(target: HealthTarget = { section: "home" }) {
    if (tab !== "services" && tab !== "privacy") setTab("cases");
    setLayer({ type: "health", target });
  }
  function openHealthHelp(target: HealthTarget = { section: "referrals" }) {
    setTab("cases");
    setLayer({ type: "health", helper: true, target });
  }
  function leaveHealthHelp() {
    if (healthHelpEnabled) { healthHelper.leave(); setHealthHelpEnabled(false); }
    if (mostHelpEnabled) { mostHelper.leave(); setMostHelpEnabled(false); }
    const url = new URL(location.href);
    url.searchParams.delete("zdrowie");
    url.searchParams.delete("most");
    url.searchParams.delete("ramka");
    if (hasWellnessInvite() || hasMostInvite()) url.hash = "";
    history.replaceState(history.state, "", url);
  }
  const mostSession = useMostSession("owner", "app", isEwa, isEwa);
  const [mostTarget, setMostTarget] = useState<"work" | "review" | "end" | "access" | "tasks">();
  const mostView = isEwa ? mostSession.view : null;
  const mostStatus = mostView?.status ?? "new";
  function openMost(target: "work" | "review" | "end" | "access" | "tasks" = "work") {
    setMostTarget(target);
    if (target !== "end" || tab !== "privacy") setTab("cases");
    setLayer({ type: "most" });
  }
  function openMostHelp(href?: string) {
    setRequestedMostCase(href);
    if (href) setControlTab("access");
    setTab("cases");
    setLayer({ type: "most-help" });
  }
  function openWorkflow(kind: WorkflowKind, city?: string) {
    setLayer({ type: "workflow", kind, city });
    setTab("cases");
  }
  function openWorkflowAction(action: WorkflowAction, data?: Record<string, string>) {
    if (action === "fine" || action === "tax") openWorkflow(action);
    else if (action === "move") { setTab("cases"); setLayer({ type: "moving", city: data?.city }); }
    else if (isEwa && action === "letter") openMost(mostStatus === "review" ? "review" : "work");
    else if (isEwa && action === "help") openMost(!mostView?.invitation && mostStatus !== "finished" ? "access" : "work");
    else go("cases");
  }
  function openDelegation(kind: DelegationContext["kind"], receiptId?: string) {
    if (kind === "trusted") setControlTab("access");
    setLayer({ type: "delegation", kind, receiptId });
  }
  const screenRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const lastTab = useRef(tab);
  const tabDirection =
    ["home", "documents", "cases", "services", "privacy"].indexOf(tab) <
    ["home", "documents", "cases", "services", "privacy"].indexOf(lastTab.current)
      ? "back"
      : "forward";
  useLayoutEffect(() => {
    lastTab.current = tab;
  }, [tab]);
  const closeLayer = () => setClosing(true);
  function dismissWorkspace() {
    if (layer?.type === "profile" && layer.returnToMost) {
      setLayer({ type: "most-hub", mode: layer.returnToMost });
      return;
    }
    if (layer?.type === "delegation") {
      const receipt = c.receipts.find((item) => item.id === layer.receiptId && item.kind === layer.kind);
      if (receipt) { setLayer({ type: "receipt", receipt }); return; }
      if (["move", "wallet", "letter"].includes(layer.kind) && c.drafts[layer.kind as CaseKind]) {
        setLayer({ type: "flow", kind: layer.kind as CaseKind }); return;
      }
    }
    if (layer?.type === "assistant") {
      if (layer.returnWorkflow) { openWorkflow(layer.returnWorkflow); return; }
      if (isEwa && (layer.workflow === "letter" || layer.workflow === "help")) { openMost(); return; }
      const receipt = c.receipts.find((item) => item.id === layer.caseId);
      if (receipt) { setLayer({ type: "receipt", receipt }); return; }
      if (layer.documentId !== undefined) { setLayer({ type: "document", id: layer.documentId }); return; }
    }
    if (layer?.type === "share" && layer.returnTo !== undefined) {
      setLayer({ type: "document", id: layer.returnTo });
      return;
    }
    closeLayer();
  }
  function openInbox() {
    inboxTrigger.current = document.activeElement as HTMLElement;
    history.pushState({ ...history.state, inboxOpen: true }, "");
    setInboxOpen(true);
  }
  function dismissInbox() {
    if (history.state?.inboxOpen) history.back();
    else setInboxOpen(false);
  }
  function followNotification() {
    replaceNotificationEntry.current = true;
    inboxTrigger.current = null;
    setInboxOpen(false);
    setNotificationVisit((visit) => visit + 1);
  }
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(
      () => {
        setLayer(null);
        setClosing(false);
      },
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 170,
    );
    return () => clearTimeout(timer);
  }, [closing]);
  const update = (fn: (c: CitizenState) => CitizenState) =>
    setStore((s) => ({
      ...s,
      citizens: { ...s.citizens, [p.id]: fn(s.citizens[p.id]) },
    }));
  function announceWorkflow(item: WorkflowCase, conversation = "workflow:" + item.kind) {
    const workflowAction = item.kind === "registration" || item.kind === "tax-address" ? "move" : item.kind;
    const receipt = item.receipt;
    if (!receipt) return;
    update((citizen) => {
      const history = citizen.messages.filter((message) => (message.conversation ?? "general") === conversation);
      const previous = history.filter(({ role }) => role === "assistant").at(-1);
      if (previous?.workflowAction !== workflowAction || history.some(({ text }) => text.includes(receipt.number)))
        return citizen;
      const text = workflowDetails[item.kind].title + ". " + workflowStatus[item.status] +
        ". Potwierdzenie demonstracyjne " + receipt.number + " znajdziesz w Sprawach.";
      return { ...citizen, messages: [...citizen.messages, { role: "assistant", text, workflowAction, conversation }] };
    });
  }
  useEffect(() => {
    setSaveFailed(!saveStore(store, showcasePhone));
  }, [store, showcasePhone]);
  useEffect(() => {
    const resize = () => setDeviceScale(previewScale());
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    const timer = setInterval(
      () =>
        setStore((s) => {
          let changed = false;
          const citizens = Object.fromEntries(
            Object.entries(s.citizens).map(([id, c]) => [
              id,
              {
                ...c,
                access: c.access.map((a) => {
                  if (
                    a.active &&
                    a.expiresAt &&
                    Date.parse(a.expiresAt) <= Date.now()
                  ) {
                    changed = true;
                    return { ...a, active: false, inactiveReason: "expired" as const };
                  }
                  return a;
                }),
              },
            ]),
          );
          return changed ? { ...s, citizens } : s;
        }),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const openInvite = () => { if (hasWellnessInvite() || hasMostInvite()) location.reload(); };
    window.addEventListener("hashchange", openInvite);
    return () => window.removeEventListener("hashchange", openInvite);
  }, []);
  useEffect(() => {
    if (!historyReady.current) {
      const previous = history.state;
      const mostNavigation = layer?.type === "most" && previous?.layer?.type === "most" && previous.profile === store.profile
        ? { mostPane: previous.mostPane, mostHistoryReturn: previous.mostHistoryReturn }
        : {};
      history.replaceState(
        { prototype: true, profile: store.profile, tab, layer, ...mostNavigation, ...(previous?.inboxOpen && { inboxOpen: true }) },
        "",
      );
      historyReady.current = true;
    } else if (historyPop.current) {
      historyPop.current = false;
    } else {
      const route = { prototype: true, profile: store.profile, tab, layer, ...(layer?.type === "most" && { mostPane: mostTarget }) };
      if (replaceNotificationEntry.current) {
        replaceNotificationEntry.current = false;
        history.replaceState(route, "");
      } else history.pushState(route, "");
    }
  }, [tab, layer, store.profile, notificationVisit, mostTarget]);
  useEffect(() => {
    const pop = (e: PopStateEvent) => {
      setInboxOpen(e.state?.inboxOpen === true);
      if (e.state?.prototype) {
        const next = restoreNavigation(e.state, storeRef.current);
        if (tab === next.tab && !layer && !next.layer) return;
        historyPop.current = true;
        setClosing(false);
        setTab(next.tab);
        const inaccessible = next.layer?.type === "health" && next.layer.helper && !healthHelpEnabled ||
          next.layer?.type === "most-help" && !mostHelpEnabled;
        setLayer(inaccessible ? null : next.layer);
      }
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [healthHelpEnabled, mostHelpEnabled, layer, tab]);
  useEffect(() => {
    const a = () => setOnline(navigator.onLine);
    window.addEventListener("online", a);
    window.addEventListener("offline", a);
    return () => {
      window.removeEventListener("online", a);
      window.removeEventListener("offline", a);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    screenRef.current?.scrollTo({ top: 0 });
  }, [tab]);
  useLayoutEffect(() => {
    if (layer) {
      previousFocus.current = document.activeElement as HTMLElement;
      document
        .querySelector<HTMLElement>(".layer h1,.layer h2")
        ?.focus({ preventScroll: true });
    } else previousFocus.current?.focus({ preventScroll: true });
  }, [layer?.type]);
  useLayoutEffect(() => {
    if (inboxOpen) inboxRef.current?.querySelector("h2")?.focus();
    else inboxTrigger.current?.focus({ preventScroll: true });
  }, [inboxOpen]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (inboxOpen) { e.preventDefault(); dismissInbox(); }
        else if (layer) dismissWorkspace();
      }
      if (e.key === "Tab" && (layer || inboxOpen)) {
        const dialog = inboxOpen ? inboxRef.current : document.querySelector(".app-workspace");
        if (!dialog) return;
        const nodes = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]',
          ),
        ).filter((el) => el.offsetParent !== null);
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && (document.activeElement === first || !nodes.includes(document.activeElement as HTMLElement))) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [layer, inboxOpen, c.receipts]);
  const start = (kind: CaseKind, suggestedData?: Record<string, string>) => {
    if (kind === "move") {
      setTab("cases");
      setLayer({ type: "moving", city: suggestedData?.city });
      return;
    }
    if (kind === "letter") {
      if (isEwa) openMost(mostStatus === "review" ? "review" : "work");
      else setLayer({ type: "profile" });
      return;
    }
    if (!c.drafts[kind] || suggestedData)
      update((c) => {
        const draft = c.drafts[kind] || freshDraft(kind);
        return {
          ...c,
          drafts: {
            ...c.drafts,
            [kind]: {
              ...draft,
              data: { ...draft.data, ...suggestedData, consent: "false" },
            },
          },
        };
      });
    setLayer({ type: "flow", kind });
  };
  const openDoc = (id: number) => setLayer({ type: "document", id });
  const go = (t: Tab) => {
    setTab(t);
    if (layer) closeLayer();
  };
  function openMostTab() {
    if (showcasePhone === "kacper" && mostHelper.hasSession) {
      if (layer?.type === "most-help") return;
      setControlTab("access");
      openMostHelp();
    } else if (layer?.type !== "most-hub") setLayer({ type: "most-hub" });
  }
  const mostNav = showcasePhone ? <CivicNav tab="most" onGo={go} onMost={openMostTab}
    onAssistant={() => setLayer({ type: "assistant", screen: tab })} /> : undefined;
  const drafts = Object.values(c.drafts) as Draft[];
  const draft = drafts[0];
  const inbox: InboxItem[] = [
    ...[ownerControl, helperControl].flatMap((control, index) => (control.view?.notifications ?? []).map((item): InboxItem => ({
      ...item, key: "control-" + item.id, context: "Centrum kontroli MOST",
      markRead: async () => Boolean(await control.send({ type: "read", id: item.id })),
      open: () => {
        setControlTab("inbox");
        if (index === 0) { setTab("privacy"); setLayer({ type: "delegation", kind: "trusted" }); }
        else openMostHelp();
      },
    }))),
    ...workflows.items.flatMap((item): InboxItem[] => {
      const { title } = workflowDetails[item.kind];
      const notifications = item.history.flatMap(({ status, at }, index) =>
        status === "prepared" ? [] : [{ index, at, text: title + " · " + workflowStatus[status] }]);
      if (item.kind === "fine") notifications.unshift({ index: -1, at: item.createdAt, text: "Mandat drogowy · " + (item.paymentAmount ?? workflowDetails.fine.amount) });
      return notifications.map(({ index, at, text }) => ({
        key: "workflow-" + item.id + "-" + index, title: text, at, context: "Sprawy · demo",
        read: item.read.includes(index),
        markRead: async () => !!await workflows.act({ type: "read", id: item.kind, index }),
        open: () => openWorkflow(item.kind),
      }));
    }),
    ...healthInbox(health, openHealth),
    ...(healthHelpEnabled ? healthInbox(healthHelper, openHealthHelp) : []),
    ...(mostHelpEnabled ? mostHelper.view?.notifications ?? [] : []).map((item) => ({
      ...item, key: "most-helper-" + item.id, title: eventLabels[item.type], context: "Pomoc w sprawie urzędowej",
      markRead: () => mostHelper.act({ type: "read", id: item.id }),
      open: openMostHelp,
    })),
    ...(mostView?.notifications ?? []).map((item) => ({
      ...item, key: "most-" + item.id, title: eventLabels[item.type], context: "MOST",
      markRead: () => mostSession.act({ type: "read", id: item.id }),
      open: () => openMost(item.type === "review" && mostView?.status === "review" ? "review" : "work"),
    })),
    ...(familyVisible ? familySession.data?.notifications ?? [] : []).map((item) => ({
      ...item, key: "family-" + item.id, context: "Rodzina",
      markRead: () => familySession.act({ type: "read", id: item.id }),
      open: () => openFamily(true),
    })),
  ];
  const inboxCount = inbox.filter((item) => !item.read).length;
  const mostCard = <MostEntry isEwa={isEwa} view={mostView} onOpen={() => openMost(mostStatus === "review" ? "review" : "work")} />;
  const collaboration: CaseCard[] = workflows.items.map((item): CaseCard => ({
    id: "workflow-" + item.id, shared: false, section: item.receipt ? "done" : item.status === "prepared" ? "active" : "todo",
    content: <WorkflowCard item={item} open={() => openWorkflow(item.kind)} />,
  }));
  collaboration.push(...(health.view?.cases ?? []).map(({ referral, status }): CaseCard => ({
    id: referral.id, shared: false,
    section: status === "confirmed" || status === "declined" ? "done" : status === "new" || status === "review" ? "todo" : "active",
    content: <Row icon={<Heart size={20} />} title={referral.title} subtitle={"Zdrowie · " + healthCaption[status]}
      onClick={() => openHealth({ section: status === "review" ? "review" : "referrals", id: referral.id })} />,
  })));
  if (healthHelpEnabled && healthHelper.hasToken) {
    const assignment = healthHelper.view?.cases[0];
    const sharedDocument = healthHelper.view?.sharedRecord ?? healthHelper.view?.sharedVisit;
    const status = assignment?.status;
    const detail = healthHelper.ended || (status === "review" ? "Czeka na decyzję Ewy"
      : status === "preparing" ? "Uzupełnij propozycję terminu" : status ? healthCaption[status] : "Sprawdź zaproszenie");
    collaboration.unshift({
      id: "health-help", shared: true,
      section: healthHelper.ended || status === "confirmed" || status === "declined" ? "done" : status === "review" ? "active" : "todo",
      content: <Row icon={<Heart size={20} />} title={sharedDocument ? "Udostępniony dokument" : "Pomoc dla Ewy"}
        subtitle={sharedDocument?.title ?? (assignment ? assignment.referral.title + " · " + detail : detail)} onClick={() => openHealthHelp()} />,
    });
  }
  if (mostHelpEnabled && mostHelper.hasSession && (!mostHelper.view?.delegation || mostHelper.view.delegation.kind === "trusted")) {
    const status = mostHelper.view?.status;
    collaboration.unshift({
      id: "most-help", shared: true,
      section: mostHelper.ended || status === "finished" || status === "rejected" ? "done" : status === "review" ? "active" : "todo",
      content: <Row icon={<FileText size={20} />} title={helperControl.view ? "Sprawy · " + helperControl.view.owner : mostHelper.view?.delegation ? delegationTitles[mostHelper.view.delegation.kind] : "Pismo Ewy z urzędu"}
        subtitle={mostHelper.ended ? "Dostęp zakończony" : mostHelper.view?.delegation ? "Sprawdź przekazaną sprawę" : status === "review" ? "Czeka na decyzję Ewy" : status ? mostCaption[status] : "Sprawdź zaproszenie"}
        onClick={() => { setControlTab("access"); openMostHelp(); }} />,
    });
    for (const assignment of mostHelper.view?.assignments ?? []) {
      if (assignment.legacy) continue;
      const href = assignment.workflow ? "/#workflow=" + assignment.token : routeForMost("helper", "app", assignment.token);
      collaboration.unshift({
        id: assignment.token, shared: true, section: "todo",
        content: <button className="inbox-item" onClick={() => openMostHelp(href)}><strong>{assignment.title}</strong><ArrowRight size={17} /></button>,
      });
    }
    for (const grant of helperControl.view?.grants ?? []) {
      const href = grant.href;
      if (!href) continue;
      collaboration.unshift({ id: grant.id, shared: true, section: "todo",
        content: <button className="inbox-item" onClick={() => openMostHelp(href)}><strong>{grant.title}</strong><ArrowRight size={17} /></button> });
    }
  }
  if (isEwa) collaboration.unshift({
    id: "most-letter", shared: false,
    section: mostStatus === "rejected" || mostView?.sentAt ? "done"
      : ["new", "review", "document", "finished"].includes(mostStatus) ? "todo" : "active",
    content: mostCard,
  });
  if (familyCase) collaboration.push({
    id: "family-passport", shared: familySession.data?.view.role === "tomasz",
    section: familyCase.status === "ready" ? "done" :
      familyCase.status === "pending" && familySession.data?.view.role === "aleksandra" ? "active" : "todo",
    content: <FamilyEntry status={familyCase.status} onOpen={() => openFamily(true)} />,
  });
  const toggleTask = (id: string) =>
    update((c) => ({
      ...c,
      tasks: c.tasks.includes(id)
        ? c.tasks.filter((x) => x !== id)
        : [...c.tasks, id],
    }));
  const extra = p.extra;
  const visibleDocuments = searchDocuments(documentQuery, extra);
  const access = layer?.type === "access" ? c.access.find(({ id }) => id === layer.access.id) ?? layer.access : undefined;
  return (
    <div className={"presentation " + (store.largeText ? "large-text" : "")}>
      <header className="presentation-header" inert={!!layer || inboxOpen}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
        >
          <Brand />
          <strong>mObywatel</strong>
          <span>Po Twojej stronie</span>
        </a>
        <div className="presentation-actions">
          <button
            onClick={() => setFitPreference(!fitPreview)}
            aria-pressed={fitPreview}
          >
            {fitPreview ? "Rozmiar 100%" : "Dopasuj do okna"}
          </button>
          <button onClick={() => setLayer({ type: "about" })}>
            <span className="status-dot" />
            Koncepcja 2026
            <ArrowUpRight size={15} />
          </button>
        </div>
      </header>
      <div
        className="phone-shell"
        style={{ zoom: fitPreview ? Math.max(0.4, deviceScale) : 1 }}
      >
        <span className="hardware-button volume-one" />
        <span className="hardware-button volume-two" />
        <span className="hardware-button power" />
        <div className="phone" data-testid="phone" data-showcase-phone={showcasePhone}>
          <div className="status-bar" aria-hidden="true">
            <b>9:41</b>
            <span className="dynamic-island" />
            <span className="status-icons">
              <Signal size={15} />
              <Wifi size={15} />
              <span className="battery" />
            </span>
          </div>
          <div className="base" inert={!!layer || inboxOpen} aria-hidden={!!layer || inboxOpen}>
            <CivicHeader
              profile={p}
              unreadCount={inboxCount}
              onHome={() => go("home")}
              onNotifications={openInbox}
              onProfile={() => setLayer({ type: "profile" })}
            />
            {(!online || saveFailed) && (
              <div className="connection-note" role="status">
                {saveFailed
                  ? "Zapis lokalny niedostępny. Postęp zachowa się tylko do odświeżenia."
                  : "Jesteś offline. Prototyp nadal działa lokalnie."}
              </div>
            )}
            {showcasePhone === "kacper" && mostHelper.view?.delegation?.kind === "trusted" && mostHelper.view.invitation?.status === "waiting" &&
              <button className="showcase-invitation" onClick={openMostTab}>Odbierz zaproszenie od Ewy w MOST <ArrowRight size={17} /></button>}
            <main className="screen-content" ref={screenRef} id="main-content">
              <div
                className={"view view-" + tab}
                key={tab}
                data-direction={tabDirection}
              >
                {tab === "home" && (
                  <DocumentSelection
                    p={p}
                    ids={c.documentIds}
                    onOpen={openDoc}
                    onSave={(documentIds) => update((citizen) => ({ ...citizen, documentIds }))}
                    overview={isEwa && !["finished", "rejected"].includes(mostStatus) ? (
                      <MostEntry isEwa view={mostView} compact onOpen={() => openMost(mostStatus === "review" ? "review" : "work")} />
                    ) : undefined}
                  />

                )}
                {tab === "documents" && (
                  <>
                    <div className="page-heading">
                      <div className="eyebrow">TWÓJ CYFROWY PORTFEL</div>
                      <h1>
                        Dokumenty<span className="red-dot">.</span>
                      </h1>
                      <p>Wszystkie dokumenty w jednym miejscu.</p>
                    </div>
                    <label className="search-field">
                      <Search size={20} />
                      <input
                        aria-label="Szukaj dokumentu"
                        placeholder="Szukaj dokumentu…"
                        value={documentQuery}
                        onChange={(e) => setDocumentQuery(e.target.value)}
                      />
                      {documentQuery && (
                        <button
                          type="button"
                          aria-label="Wyczyść wyszukiwanie"
                          onClick={() => setDocumentQuery("")}
                        >
                          <X size={18} />
                        </button>
                      )}
                    </label>
                    {visibleDocuments.includes(0) && (
                      <IdentityCard p={p} onClick={() => openDoc(0)} />
                    )}
                    {!visibleDocuments.length && (
                      <div className="empty-state" role="status">
                        <Search size={28} />
                        <strong>Nie ma takiego dokumentu</strong>
                        <p>Spróbuj „dowód”, „prawo jazdy” albo „auto”.</p>
                        <button
                          className="text-button"
                          onClick={() => setDocumentQuery("")}
                        >
                          Pokaż wszystkie dokumenty
                        </button>
                      </div>
                    )}
                    <div className="document-list">
                      <button
                        className="document-row violet"
                        hidden={!visibleDocuments.includes(1)}
                        onClick={() => openDoc(1)}
                      >
                        <div>
                          <IdCard size={26} />
                          <span className="tiny-caps">PL · DEMO</span>
                        </div>
                        <strong>mPrawo jazdy</strong>
                        <span>
                          Kategoria B<ChevronRight size={20} />
                        </span>
                      </button>
                      <button
                        className="document-row sand"
                        hidden={!visibleDocuments.includes(2)}
                        onClick={() => openDoc(2)}
                      >
                        <div>
                          <Car size={26} />
                          <span className="tiny-caps">PL · DEMO</span>
                        </div>
                        <strong>Moje pojazdy</strong>
                        <span>
                          1 pojazd · WX DEMO
                          <ChevronRight size={20} />
                        </span>
                      </button>
                      <button
                        className="document-row mint"
                        hidden={!visibleDocuments.includes(3)}
                        onClick={() => openDoc(3)}
                      >
                        <div>
                          {extra === "Karta EKUZ" ? (
                            <Heart size={26} />
                          ) : (
                            <GraduationCap size={26} />
                          )}
                          <span className="tiny-caps">DEMO</span>
                        </div>
                        <strong>{extra}</strong>
                        <span>
                          {extra === "Karta EKUZ"
                            ? "Ważna do 12.06.2028"
                            : "Ważna do 31.03.2027"}
                          <ChevronRight size={20} />
                        </span>
                      </button>
                    </div>
                    <Row
                      icon={<Plus size={21} />}
                      title="O dokumentach w pokazie"
                      subtitle="Zakres i możliwości tej koncepcji"
                      onClick={() => setLayer({ type: "about" })}
                    />
                    <p className="footnote">
                      <LockKeyhole size={13} />
                      Wszystkie dokumenty są fikcyjne i nie potwierdzają
                      tożsamości.
                    </p>
                  </>
                )}
                {tab === "services" && (
                  <ServiceDirectory
                    open={(id) => id === "health" ? openHealth() : id === "family" ? openFamily() : start("move")}
                    onAssistant={() => setLayer({ type: "assistant", screen: "services" })}
                  />
                )}
                {tab === "cases" && (
                  <Cases
                    key={p.id}
                    onMove={() => start("move")}
                    collaboration={collaboration}
                    initialShared={healthHelpEnabled || (mostHelpEnabled && !showcasePhone)}
                    offline={Boolean(workflows.error)}
                    onMost={(shared) => {
                      if (!shared) setLayer({ type: "most-hub", mode: "own" });
                      else if (!showcasePhone && demoHelperToken(p.id)) setLayer({ type: "most-hub", mode: "help" });
                      else if (mostHelpEnabled && mostHelper.hasSession) { setControlTab("access"); openMostHelp(); }
                      else if (!showcasePhone && storedTrustedHelperToken()) location.assign(helperDashboardUrl);
                      else setLayer({ type: "most-hub", mode: "help" });
                    }}
                    onAssistant={() => setLayer({ type: "assistant", screen: "cases" })}
                  />
                )}
                {tab === "privacy" && (
                  <PrivacyHub
                    p={p}
                    c={c}
                    onShare={(initialScope) =>
                      setLayer({ type: "share", id: 0, initialScope })
                    }
                    onAccess={(access) => setLayer({ type: "access", access })}
                    onProtect={() => start("wallet")}
                    onTrusted={() => openDelegation("trusted")}
                    collaboration={isEwa && (mostView?.invitation?.token || health.view?.grants.some((grant) => grant.token)) ? <>
                      {mostView?.invitation?.token && <MostRow icon={<ShieldCheck size={20} />} title="Dostęp do pisma" detail={"Kacper · ważny do " + new Date(mostView.invitation.expiresAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} onClick={() => openMost("end")} />}
                      {health.view?.grants.some((grant) => grant.token) && <MostRow icon={<HeartPulse size={20} />} title="Upoważnienia zdrowotne" detail="Sprawdź zakres i odbiorców" onClick={() => openHealth({ section: "access" })} />}
                    </> : undefined}
                  />
                )}
                <div className="demo-caption">
                  Prototyp · dane przykładowe
                </div>
              </div>
            </main>
            <CivicNav tab={tab} onGo={go} onMost={openMostTab} onAssistant={() => setLayer({ type: "assistant", screen: tab })} />

          </div>
          {layer && (
            <div
              key={notificationVisit}
              inert={inboxOpen}
              aria-hidden={inboxOpen}
              className={
                "layer app-workspace " +
                (layer.type === "flow" ||
                layer.type === "assistant" ||
                layer.type === "document" ||
                layer.type === "family" ||
                layer.type === "health" ||
                layer.type === "most" ||
                layer.type === "most-help" ||
                layer.type === "most-hub" ||
                layer.type === "delegation" ||
                layer.type === "tax-payment" ||
                layer.type === "workflow" ||
                layer.type === "moving" ||
                layer.type === "services" ||
                layer.type === "receipt"
                  ? "full-layer"
                  : "sheet-layer") +
                (closing ? " is-closing" : "")
              }
              role="dialog"
              aria-modal="true"
              aria-label={
                layer.type === "flow"
                  ? caseMeta[layer.kind].short
                  : layer.type === "assistant"
                    ? "Asystent demonstracyjny"
                    : layer.type === "family" ? "mObywatel Rodzina"
                      : layer.type === "most" || layer.type === "most-hub" ? "mObywatel MOST" : layer.type === "most-help" ? mostHelper.view?.delegation ? delegationTitles[mostHelper.view.delegation.kind] : "Pismo Ewy z urzędu"
                        : layer.type === "delegation" ? delegationTitles[layer.kind]
                        : layer.type === "tax-payment" ? demoTax.title
                        : layer.type === "workflow" ? workflowDetails[layer.kind].title
                        : layer.type === "moving" ? "Przeprowadzam się"
                        : layer.type === "services" ? "Usługi" : layer.type === "health" ? layer.helper ? "Pomoc dla Ewy" : "Zdrowie"
                          : layer.type === "notifications" ? "Powiadomienia" : "Szczegóły"
              }
            >
              {layer.type === "most-hub" && <Suspense fallback={<p role="status">Otwieramy MOST…</p>}>
                <MostHub key={p.id} profile={p} onBack={closeLayer} workflowKey={workflows.token} letterKey={isEwa ? mostSession.token : undefined}
                  initialMode={layer.mode} nav={mostNav} onOpenShared={showcasePhone === "kacper" && mostHelper.hasSession ? openMostTab : undefined}
                  onSwitchProfile={(mode) => setLayer({ type: "profile", returnToMost: mode })} />
              </Suspense>}
              {layer.type === "workflow" && <>
                <LayerHeader title={workflowDetails[layer.kind].title} subtitle="Sprawy" onClose={closeLayer} />
                <WorkflowWorkspace key={p.id + layer.kind} kind={layer.kind} applicant={p.name} city={layer.city} session={workflows}
                  trustedToken={delegationToken(p.id + "-trusted")} onTrust={() => openDelegation("trusted")}
                  onBack={closeLayer} onResult={announceWorkflow} onAssistant={() => setLayer({ type: "assistant", screen: "cases",
                    workflow: layer.kind === "registration" || layer.kind === "tax-address" ? "move" : layer.kind,
                    returnWorkflow: layer.kind,
                  })} />
              </>}
              {layer.type === "moving" && <>
                <LayerHeader title="Przeprowadzka" subtitle="Sprawy" onClose={closeLayer} />
                <MovePicker items={workflows.items} open={(kind) => openWorkflow(kind, layer.city)} />
              </>}
              {layer.type === "tax-payment" && <>
                <LayerHeader title={demoTax.title} subtitle="Ćwiczenie lokalne" onClose={closeLayer} />
                <div className="layer-body flow-body">
                  <h1>{c.demoTaxPaidAt ? "Opłacono w pokazie" : "Zapłać podatek"}</h1>
                  <dl className="data-list">
                    <div><dt>Kwota</dt><dd>{demoTax.amount}</dd></div>
                    <div><dt>Odbiorca</dt><dd>{demoTax.recipient}</dd></div>
                    <div><dt>Numer sprawy</dt><dd>{demoTax.reference}</dd></div>
                    {c.demoTaxPaidAt && <div><dt>Kiedy</dt><dd>{dateLabel(c.demoTaxPaidAt)}</dd></div>}
                  </dl>
                  <p className="lead">{c.demoTaxPaidAt ? "Potwierdzenie jest zapisane w Zakończonych." : "Płatność zapisze wynik pokazu. Żadne pieniądze nie zostaną pobrane."}</p>
                </div>
                <div className="flow-footer">
                  {c.demoTaxPaidAt ? <button className="primary" onClick={closeLayer}>Wróć do spraw</button>
                    : <button className="primary" onClick={() => {
                      const at = new Date().toISOString();
                      update((citizen) => citizen.demoTaxPaidAt ? citizen : { ...citizen, demoTaxPaidAt: at });
                    }}>Zapłać {demoTax.amount} (demo)</button>}
                </div>
              </>}
              {layer.type === "delegation" && <Suspense fallback={<p role="status">Otwieramy pomoc…</p>}>
                <DelegationOwner key={p.id + "-" + (layer.receiptId ?? layer.kind) + "-" + controlTab} profile={p.id} initialTab={controlTab}
                  workflowKey={workflows.token} letterKey={isEwa ? mostSession.token : undefined}
                  storageId={p.id + "-" + (layer.receiptId ?? layer.kind)} context={{ kind: layer.kind,
                    step: layer.receiptId ? undefined : c.drafts[layer.kind as CaseKind]?.step }} onBack={dismissWorkspace}
                  onStarted={!["move", "wallet", "letter", "trusted"].includes(layer.kind) ? () => {
                    const id = "example-active:" + layer.kind;
                    update((citizen) => citizen.tasks.includes(id) ? citizen : { ...citizen, tasks: [...citizen.tasks, id] });
                  } : undefined}
                  onApproved={!["move", "wallet", "letter", "trusted"].includes(layer.kind) ? () => {
                    const id = "example-done:" + layer.kind;
                    update((citizen) => citizen.tasks.includes(id) ? citizen : { ...citizen, tasks: [...citizen.tasks, id] });
                  } : undefined} />
              </Suspense>}
              {layer.type === "most" && (
                <Suspense fallback={<p className="most-loading" role="status">Otwieramy sprawę…</p>}>
                  <MostOwner
                    session={mostSession}
                    trustedToken={delegationToken(p.id + "-trusted")}
                    activeTab={tab}
                    initialPane={mostTarget}
                    onClose={closeLayer}
                    onGo={go}
                    onInbox={openInbox}
                    notifications={inboxCount}
                    onAssistant={() => setLayer({ type: "assistant", screen: "cases", workflow: "letter" })}
                  />
                </Suspense>
              )}
              {layer.type === "most-help" && <Suspense fallback={<p className="most-loading" role="status">Otwieramy zadanie…</p>}>
                <MostHelperWorkspace key={controlTab + (requestedMostCase ?? "")} session={mostHelper} notifications={inboxCount} controlTab={controlTab}
                  requestedCaseHref={requestedMostCase} close={() => {
                    if (mostHelper.view?.document && storedTrustedHelperToken()) location.assign(helperDashboardUrl);
                    else closeLayer();
                  }}
                  personal={showcasePhone === "kacper" ? { profile: p.id, items: workflows.items, ready: workflows.ready, error: workflows.error } : undefined}
                  onInbox={openInbox}
                  nav={mostNav ?? <CivicNav tab="cases" onGo={go} onAssistant={() => setLayer({ type: "assistant", screen: "cases" })} />} />
              </Suspense>}
              {layer.type === "family" && (
                <FamilyWorkspace
                  session={familySession}
                  activeTab={tab}
                  decision={layer.decision}
                  unread={inboxCount}
                  onInbox={openInbox}
                  onClose={closeLayer}
                  onGo={go}
                  onAssistant={() => setLayer({ type: "assistant", screen: "cases" })}
                />
              )}
              {layer.type === "health" && <Suspense fallback={<p className="most-loading" role="status">Otwieramy Zdrowie…</p>}>
                <HealthWorkspace key={layer.helper ? "helper" : p.id} session={layer.helper ? healthHelper : health}
                  helper={layer.helper} identity={layer.helper ? undefined : p} target={layer.target}
                  navigate={layer.helper ? openHealthHelp : openHealth} close={closeLayer}
                  nav={<CivicNav tab={tab} onGo={go}
                    onAssistant={() => layer.helper ? setLayer({ type: "assistant", screen: "cases" }) : openHealth({ section: "assistant", id: layer.target.id })} />}
                  unreadCount={inboxCount} onInbox={openInbox} />
              </Suspense>}
              {layer.type === "flow" && (
                <Flow
                  draft={c.drafts[layer.kind] || freshDraft(layer.kind)}
                  p={p}
                  onSave={(d) =>
                    update((c) => ({
                      ...c,
                      drafts: { ...c.drafts, [d.kind]: d },
                    }))
                  }
                  onClose={() => {
                    closeLayer();
                    setToast("Postęp sprawy zapisany na tym urządzeniu");
                  }}
                  onComplete={(d) => {
                    const next = completeCase(c, d);
                    update(() => next);
                    setLayer({ type: "receipt", receipt: next.receipts[0] });
                  }}
                />
              )}
              {layer.type === "assistant" && (
                <>
                <Assistant
                  key={p.id + ":" + conversationFor(layer)}
                  p={p}
                  c={c}
                  conversation={conversationFor(layer)}
                  onNew={() => setLayer(openConversation("chat-" + (crypto.randomUUID?.() ?? Date.now().toString(36)), c, layer.screen || tab))}
                  onConversation={(id) => setLayer(openConversation(id, c, layer.screen || tab))}
                  update={update}
                  onClose={dismissWorkspace}
                  onStart={start}
                  process={c.receipts.find((r) => r.id === layer.caseId)}
                  screen={layer.screen || tab}
                  documentId={layer.documentId}
                  onDocument={openDoc}
                  onShare={(id) => setLayer({ type: "share", id, returnTo: layer.documentId })}
                  onPrivacy={() => go("privacy")}
                  workflow={layer.workflow}
                  workflowKind={layer.returnWorkflow}
                  workflowSession={workflows}
                  onWorkflowResult={announceWorkflow}
                  onTrust={() => openDelegation("trusted")}
                  workflowOnline={workflows.ready}
                  waitingForContext={Boolean(layer.workflow) && (workflows.loading ||
                    (layer.workflow === "letter" && isEwa && !mostSession.view && !mostSession.ended && !mostSession.error))}
                  letterSession={isEwa ? mostSession : undefined}
                  onReviewLetter={() => openMost("review")}
                  askWorkflows={(text, context, signal) =>
                    workflows.ask(text, context, isEwa ? mostSession.token ?? undefined : undefined, signal)}
                  onWorkflow={openWorkflowAction}
                  onReceipt={(receipt) =>
                    setLayer({ type: "receipt", receipt })
                  }
                />
                <CivicNav tab={layer.screen || tab} onGo={go}
                  onAssistant={() => document.querySelector<HTMLInputElement>(".chat-composer input")?.focus()} />
                </>
              )}
              {layer.type === "document" && (
                <ApprovedDocument
                  p={p}
                  unreadCount={inboxCount}
                  id={layer.id}
                  protectedPesel={c.protected}
                  address={c.address}
                  onGo={go}
                  onProfile={()=>setLayer({type:"profile"})}
                  onNotifications={openInbox}
                  onClose={() => closeLayer()}
                  onShare={() =>
                    setLayer({
                      type: "share",
                      id: layer.id,
                      returnTo: layer.id,
                    })
                  }
                  onWallet={() => start("wallet")}
                  onAssistant={() =>
                    setLayer({
                      type: "assistant",
                      screen: "documents",
                      documentId: layer.id,
                    })
                  }
                />
              )}
              {layer.type === "receipt" && (
                <ReceiptView
                  onSend={() => update((citizen) => sendMovingDocument(citizen, layer.receipt.id))}
                  receipt={
                    c.receipts.find((r) => r.id === layer.receipt.id) ||
                    layer.receipt
                  }
                  onSupply={(key, name) =>
                    update((c) =>
                      supplyMovingDocument(c, layer.receipt.id, key, name),
                    )
                  }
                  onManual={(operationId) =>
                    update((c) =>
                      confirmManualOperation(c, layer.receipt.id, operationId),
                    )
                  }
                  tasks={c.tasks}
                  onAssistant={() =>
                    setLayer({ type: "assistant", caseId: layer.receipt.id })
                  }
                  onTask={toggleTask}
                  onClose={() => go("cases")}
                  onPrivacy={() => go("privacy")}
                  onCopy={() => {
                    navigator.clipboard
                      ?.writeText(
                        JSON.stringify(
                          c.receipts.find((r) => r.id === layer.receipt.id) ||
                            layer.receipt,
                          null,
                          2,
                        ),
                      )
                      .then(() => setToast("Skopiowano potwierdzenie demo"))
                      .catch(() =>
                        setToast("Kopiowanie niedostępne w tej przeglądarce"),
                      );
                  }}
                />
              )}
              {[
                "profile",
                "notifications",
                "about",
                "install",
                "reset",
                "access",
                "share",
              ].includes(layer.type) && (
                <div className="sheet-backdrop" onClick={dismissWorkspace} />
              )}
              {layer.type === "share" ? (
                <Share
                  p={p}
                  id={layer.id}
                  initialScope={layer.initialScope}
                  onClose={dismissWorkspace}
                  onShare={(scope, purpose, who) => {
                    const a: Access = {
                      id: "share-" + Date.now(),
                      who,
                      purpose,
                      scope,
                      at: new Date().toISOString(),
                      expiresAt: new Date(Date.now() + 60000).toISOString(),
                      revocable: true,
                      active: true,
                    };
                    update((c) => ({ ...c, access: [a, ...c.access] }));
                    return a.id;
                  }}
                  onRevoke={(id) =>
                    update((c) => ({
                      ...c,
                      access: c.access.map((a) =>
                        a.id === id ? { ...a, active: false } : a,
                      ),
                    }))
                  }
                />
              ) : null}
              {layer.type === "profile" && (
                <Sheet title={layer.service === "family" ? "Wybierz profil do Rodziny" : layer.returnToMost ? "Zmień profil w MOST" : "Po Twojej stronie"} onClose={dismissWorkspace}>
                  {layer.service === "family" ? <>
                    <p className="sheet-lead">Sprawy rodzinne w tym prototypie są dostępne na profilu Aleksandry Nowak.</p>
                    {showcasePhone && <a className="secondary" href="/" target="_top">Otwórz wybór profilu w aplikacji</a>}
                  </> : <>
                  <div className="profile-intro">
                    <span className="avatar large">
                      <img src={"/portraits/" + p.id + ".png"} alt="" />
                    </span>
                    <strong>{p.name}</strong>
                    <Badge>Profil demonstracyjny</Badge>
                  </div>
                  {!showcasePhone && <SectionTitle title="Wypróbuj inną perspektywę" />}
                  </>}
                  {profiles.filter((pr) => !showcasePhone && (!layer.service || pr.id === "aleksandra")).map((pr) => (
                    <button
                      className={
                        "profile-option " + (pr.id === p.id ? "chosen" : "")
                      }
                      key={pr.id}
                      onClick={() => {
                        if (pr.id !== p.id && pr.id !== "kacper") leaveHealthHelp();
                        setStore((s) => ({ ...s, profile: pr.id }));
                        if (layer.service === "family") setLayer({ type: "family" });
                        else if (layer.returnToMost || demoHelperToken(pr.id))
                          setLayer({ type: "most-hub", mode: pr.id === p.id ? layer.returnToMost : undefined });
                        else {
                          closeLayer();
                          if (pr.id !== p.id) setToast("Zmieniono profil. Każdy ma osobny postęp.");
                        }
                      }}
                    >
                      <span className="avatar">
                        <img src={"/portraits/" + pr.id + ".png"} alt="" />
                      </span>
                      <span>
                        <strong>{pr.name}</strong>
                        <small>{pr.subtitle}</small>
                      </span>
                      {pr.id === p.id && <Check size={20} />}
                    </button>
                  ))}
                  {!layer.service && <>
                  <div className="setting-row">
                    <span>
                      <Settings2 size={20} />
                      Większy tekst
                    </span>
                    <button
                      role="switch"
                      aria-label="Większy tekst"
                      aria-checked={store.largeText}
                      className={"switch " + (store.largeText ? "on" : "")}
                      onClick={() =>
                        setStore((s) => ({ ...s, largeText: !s.largeText }))
                      }
                    >
                      <i />
                    </button>
                  </div>
                  <Row
                    icon={<Download size={20} />}
                    title="Dodaj do ekranu głównego"
                    onClick={() => setLayer({ type: "install" })}
                  />
                  <Row
                    icon={<Info size={20} />}
                    title="O koncepcji"
                    onClick={() => setLayer({ type: "about" })}
                  />
                  {new URLSearchParams(location.search).get("narzedzia") === "1" && <button
                    className="text-button danger reset-button"
                    onClick={() => setLayer({ type: "reset" })}
                  >
                    Przywróć dane przykładowe
                  </button>}
                  </>}
                </Sheet>
              )}
              {layer.type === "notifications" && (
                <Sheet title="Powiadomienia" onClose={() => closeLayer()}>
                  <Inbox items={inbox} busy={health.busy || healthHelper.busy || mostSession.busy || mostHelper.busy || familySession.busy} />
                  <div className="info-note">
                    <Bell size={18} />
                    <p>
                      To przypomnienia w aplikacji. Prototyp nie wysyła
                      powiadomień systemowych.
                    </p>
                  </div>
                </Sheet>
              )}
              {layer.type === "about" && (
                <Sheet
                  title="Mniej urzędu. Więcej życia."
                  onClose={() => closeLayer()}
                >
                  <Badge tone="red">Koncepcja konkursowa 2026</Badge>
                  <p className="sheet-lead">mObywatel · Po Twojej stronie</p>
                  <p>
                    Sprawy zaczynają się od Twojej sytuacji. Asystent pomaga
                    przygotować plan, a Ty decydujesz o każdym działaniu i
                    zakresie danych.
                  </p>
                  <div className="about-points">
                    <span>
                      <House />3 kompletne scenariusze
                    </span>
                    <span>
                      <IdCard />4 dokumenty w każdym profilu
                    </span>
                    <span>
                      <ShieldCheck />
                      Minimalny zakres danych i ślad zgód
                    </span>
                  </div>
                  <div className="info-note">
                    <Info size={20} />
                    <p>
                      Niezależny prototyp. Nie jest oficjalną aplikacją
                      mObywatel. Dokumenty są fikcyjne. Nie wykonujemy czynności
                      urzędowych ani biometrii.{" "}
                      {serverAI
                        ? "Backend asystenta działa w środowisku demonstracyjnym."
                        : "Domyślny asystent korzysta z reguł, bez modelu AI."}
                    </p>
                  </div>
                  <p className="footnote">
                    Postęp zapisujemy wyłącznie w tej przeglądarce. Nie wpisuj
                    prawdziwych danych osobowych. Dokumentów nie można dodawać z
                    rejestrów w tej wersji.
                  </p>
                  <button className="primary" onClick={() => start("move")}>
                    Wypróbuj przeprowadzkę
                    <ArrowRight size={18} />
                  </button>
                </Sheet>
              )}
              {layer.type === "install" && (
                <Sheet title="Zawsze pod ręką" onClose={() => closeLayer()}>
                  <IconBox tone="red">
                    <Download size={26} />
                  </IconBox>
                  <p className="sheet-lead">Zainstaluj jako aplikację PWA.</p>
                  <ol className="instruction-list">
                    <li>
                      Otwórz publiczny link HTTPS w Safari lub Chrome na
                      telefonie.
                    </li>
                    <li>
                      iPhone: Udostępnij → Do ekranu początkowego. Android: menu
                      przeglądarki → Zainstaluj aplikację.
                    </li>
                    <li>
                      Uruchom ikonę. Aplikacja zajmie cały ekran, a zapisany
                      pokaz będzie dostępny offline.
                    </li>
                  </ol>
                  <p className="footnote">
                    Na localhost instalacja zależy od przeglądarki. Na innym
                    urządzeniu potrzebny jest adres HTTPS hostingu.
                  </p>
                </Sheet>
              )}
              {layer.type === "reset" && (
                <Sheet
                  title="Nowy początek pokazu?"
                  onClose={() => closeLayer()}
                >
                  <p className="sheet-lead">
                    Usuniemy lokalne sprawy, rozmowy i zgody wszystkich trzech
                    profili demonstracyjnych.
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      clearAttachments().catch(() => {});
                      leaveHealthHelp();
                      const resetStore = freshStore();
                      setStore(showcasePhone ? { ...resetStore, profile: showcasePhone } : resetStore);
                      go("home");
                      setToast("Przywrócono początek pokazu");
                    }}
                  >
                    Przywróć dane demonstracyjne
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setLayer({ type: "profile" })}
                  >
                    Zachowaj mój postęp
                  </button>
                </Sheet>
              )}
              {access && (
                <Sheet title="Ślad użycia danych" onClose={() => closeLayer()}>
                  <Badge tone={access.active ? "green" : "neutral"}>
                    {access.active
                      ? "Zdarzenie demonstracyjne"
                      : access.inactiveReason === "expired" ? "Dostęp wygasł" : "Zgoda wycofana"}
                  </Badge>
                  <h3>{access.who}</h3>
                  <dl className="data-list">
                    <div>
                      <dt>Cel dostępu</dt>
                      <dd>{access.purpose}</dd>
                    </div>
                    <div>
                      <dt>Zakres danych</dt>
                      <dd>{access.scope}</dd>
                    </div>
                    <div>
                      <dt>Kiedy</dt>
                      <dd>{dateLabel(access.at)}</dd>
                    </div>
                    {access.expiresAt && <div><dt>Ważność kodu</dt><dd>{dateLabel(access.expiresAt)}</dd></div>}
                    <div>
                      <dt>Podstawa w pokazie</dt>
                      <dd>
                        {access.revocable
                          ? "Twoja zgoda demonstracyjna"
                          : "Symulowane działanie lub przykładowy odczyt"}
                      </dd>
                    </div>
                  </dl>
                  {access.revocable && access.active ? (
                    <button
                      className="primary"
                      onClick={() => {
                        const id = access.id;
                        update((c) => ({
                          ...c,
                          access: c.access.map((a) =>
                            a.id === id ? { ...a, active: false } : a,
                          ),
                        }));
                        closeLayer();
                        setToast("Zgoda demonstracyjna została wycofana");
                      }}
                    >
                      Wycofaj zgodę
                    </button>
                  ) : (
                    <p className="footnote">
                      Historia zdarzenia pozostaje widoczna. Nie oznacza
                      rzeczywistego połączenia z tą instytucją.
                    </p>
                  )}
                </Sheet>
              )}
            </div>
          )}
          {inboxOpen && <div ref={inboxRef} className="layer sheet-layer app-inbox" role="dialog" aria-modal="true" aria-label="Powiadomienia">
            <div className="sheet-backdrop" onClick={dismissInbox} />
            <Sheet title="Powiadomienia" onClose={dismissInbox}>
              <Inbox items={inbox} filter onOpen={followNotification} />
            </Sheet>
          </div>}
          {toast && (
            <div className="toast" role="status">
              <CircleCheck size={18} />
              {toast}
            </div>
          )}
          <div className="home-indicator" aria-hidden="true" />
        </div>
      </div>
      <footer className="presentation-footer" inert={!!layer || inboxOpen}>
        <button onClick={() => setLayer({ type: "about" })}>
          O koncepcji
          <ArrowUpRight size={12} />
        </button>
      </footer>
    </div>
  );
}

function DownloadFile({ fileKey, name }: { fileKey: string; name: string }) {
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="secondary"
        onClick={() =>
          downloadAttachment(fileKey, name).catch((e) => setError(e.message))
        }
      >
        <Download size={17} />
        Pobierz: {name}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
function AttachmentEditor({
  draft,
  onSave,
}: {
  draft: Draft;
  onSave: (d: Draft) => void;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function add(file?: File) {
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      const key = await saveAttachment(file);
      onSave({
        ...draft,
        data: {
          ...draft.data,
          attachment: "true",
          attachmentKey: key,
          attachmentName: file.name,
          consent: "false",
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się zapisać pliku.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="attachment-editor">
      <h3>Załącznik</h3>
      {draft.data.attachmentKey ? (
        <>
          <div className="plan-item">
            <IconBox tone="green">
              <FileCheck2 size={22} />
            </IconBox>
            <span>
              <strong>{draft.data.attachmentName}</strong>
              <small>Zapisano lokalnie na tym urządzeniu</small>
            </span>
            <button
              className="icon-button"
              aria-label="Odłącz załącznik"
              onClick={() =>
                onSave({
                  ...draft,
                  data: {
                    ...draft.data,
                    attachment: "false",
                    attachmentKey: "",
                    attachmentName: "",
                    consent: "false",
                  },
                })
              }
            >
              <X size={17} />
            </button>
          </div>
          <DownloadFile
            fileKey={draft.data.attachmentKey}
            name={draft.data.attachmentName}
          />
        </>
      ) : (
        <>
          <label className="secondary upload-label">
            <Plus size={17} />
            Dodaj plik lokalnie
            <input
              type="file"
              accept=".pdf,.txt,.jpg,.jpeg,.png"
              disabled={saving}
              onChange={(e) => {
                add(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button
            className="text-button"
            disabled={saving}
            onClick={() =>
              add(
                new File(
                  [
                    "DOKUMENT DEMONSTRACYJNY\nTo fikcyjne potwierdzenie przygotowane do pokazu mObywatel Challenge.\nNie jest umową i nie wywołuje skutków prawnych.",
                  ],
                  "Potwierdzenie_DEMO.txt",
                  { type: "text/plain" },
                ),
              )
            }
          >
            Użyj pliku demonstracyjnego
          </button>
          <p className="footnote">
            PDF, TXT, JPG lub PNG · do 5 MB. Bez wysyłania.
          </p>
        </>
      )}
      {saving && <p role="status">Zapisuję plik na urządzeniu…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
function LayerHeader({
  title,
  subtitle,
  onClose,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
}) {
  return (
    <header className="layer-header">
      <button
        className="icon-button"
        onClick={onBack || onClose}
        aria-label="Wstecz"
      >
        <ArrowLeft size={22} />
      </button>
      <div>
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </div>
      <button className="icon-button" onClick={onClose} aria-label="Zamknij">
        <X size={21} />
      </button>
    </header>
  );
}
function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="sheet">
      <span className="sheet-handle" />
      <div className="sheet-title">
        <h2 tabIndex={-1}>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Zamknij">
          <X size={21} />
        </button>
      </div>
      <div className="sheet-body">{children}</div>
    </div>
  );
}
function CheckOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className={"check-option " + (checked ? "checked" : "")}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="custom-check">{checked && <Check size={15} />}</span>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
    </label>
  );
}
function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        inputMode={label === "Kod pocztowy" ? "numeric" : undefined}
        autoComplete="off"
        aria-invalid={!!error}
        aria-describedby={error ? "err-" + label : undefined}
      />
      {error && (
        <small id={"err-" + label} className="error">
          {error}
        </small>
      )}
    </label>
  );
}
function Flow({
  draft: d,
  p,
  onSave,
  onClose,
  onComplete,
}: {
  draft: Draft;
  p: Profile;
  onSave: (d: Draft) => void;
  onClose: () => void;
  onComplete: (d: Draft) => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const ref = useRef<HTMLDivElement>(null);
  const meta = caseMeta[d.kind];
  const last = d.step === meta.steps.length - 1;
  const directReply = d.kind === "letter" && d.data.directReply === "true";
  const canSendDirectly = directReply && d.step === 2;
  const analysis = analyzeLetter(d.data.text || "");
  const lastStep = useRef(d.step);
  const direction = d.step < lastStep.current ? "back" : "forward";
  useLayoutEffect(() => {
    lastStep.current = d.step;
    ref.current?.scrollTo({ top: 0 });
    ref.current
      ?.querySelector<HTMLElement>("h1")
      ?.focus({ preventScroll: true });
  }, [d.step]);
  const set = (key: string, value: string) => {
    onSave({ ...d, data: { ...d.data, [key]: value, consent: "false" } });
    setErrors({});
  };
  const toggle = (key: string) =>
    set(key, d.data[key] === "true" ? "false" : "true");
  const advance = () => {
    const e = validateStep(d);
    setErrors(e);
    if (Object.keys(e).length) {
      setTimeout(
        () =>
          ref.current
            ?.querySelector<HTMLElement>('[aria-invalid="true"],.error-summary')
            ?.focus(),
        0,
      );
      return;
    }
    if (canSendDirectly) onComplete({ ...d, step: meta.steps.length - 1, data: { ...d.data, consent: "true" } });
    else if (last) onComplete(d);
    else {
      onSave({ ...d, step: d.step + 1 });
      ref.current?.scrollTo({ top: 0 });
    }
  };
  const back = () => {
    if (canSendDirectly) { onClose(); return; }
    if (d.step > 0) {
      onSave({ ...d, step: d.step - 1, data: { ...d.data, consent: "false" } });
      setErrors({});
      ref.current?.scrollTo({ top: 0 });
    } else onClose();
  };
  return (
    <>
      <LayerHeader
        title={directReply ? "Odpowiedz na wezwanie" : meta.short}
        subtitle="Sprawa demonstracyjna"
        onClose={onClose}
        onBack={back}
      />
      {!directReply && <div
        className="flow-progress"
        aria-label={`Krok ${d.step + 1} z ${meta.steps.length}`}
      >
        {meta.steps.map((_, i) => (
          <span key={i} className={i <= d.step ? "filled" : ""} />
        ))}
      </div>}
      <div
        className="layer-body flow-body"
        data-direction={direction}
        ref={ref}
        key={d.kind + "-" + d.step}
      >
        {!directReply && <div className="eyebrow">
          KROK {d.step + 1} Z {meta.steps.length} ·{" "}
          {meta.steps[d.step].toUpperCase()}
        </div>}
        <h1 tabIndex={-1}>
          {canSendDirectly ? "Dołącz dokument i wyślij" : last
            ? "Ty decydujesz."
            : d.step === 0
              ? meta.title
              : meta.steps[d.step]}
          <span className="red-dot">{d.step > 0 && !last ? "." : ""}</span>
        </h1>
        {d.kind === "move" && d.step === 0 && (
          <>
            <p className="lead">
              Przygotuj nowy adres raz. Potem wybierz, gdzie ma trafić w Twoim
              planie.
            </p>
            <div className="journey-illustration">
              <House size={64} strokeWidth={1} />
              <span />
              <MapPin size={35} strokeWidth={1.3} />
            </div>
            <label className="field">
              <span>Jak się przeprowadzasz?</span>
              <select
                value={d.data.household}
                onChange={(e) => set("household", e.target.value)}
              >
                <option value="samodzielnie">Samodzielnie</option>
                <option value="z rodziną">Z rodziną</option>
              </select>
            </label>
            <div className="plain-plan">
              <span>
                <Check />
                Nowy adres i termin
              </span>
              <span>
                <Check />
                Plan wybranych formalności
              </span>
              <span>
                <Check />
                Zakres danych przed potwierdzeniem
              </span>
            </div>
            <div className="info-note">
              <Info size={18} />
              <p>
                {d.data.household === "z rodziną"
                  ? "Plan dotyczy Twoich danych. Dla bliskich dodamy krok do wykonania osobno."
                  : "Plan zapisze się automatycznie. Możesz wrócić później."}
              </p>
            </div>
          </>
        )}
        {d.kind === "move" && d.step === 1 && (
          <>
            <p className="lead">
              Użyj przykładowego adresu. To dane do symulacji.
            </p>
            <Field
              label="Miejscowość"
              value={d.data.city}
              placeholder="np. Warszawa"
              onChange={(v) => set("city", v)}
              error={errors.city}
            />
            <Field
              label="Ulica, numer domu i mieszkania"
              value={d.data.street}
              placeholder="np. Jasna 8/12"
              onChange={(v) => set("street", v)}
              error={errors.street}
            />
            <Field
              label="Kod pocztowy"
              value={d.data.postal}
              placeholder="00-013"
              onChange={(v) => set("postal", v)}
              error={errors.postal}
            />
            <Field
              label="Data przeprowadzki"
              type="date"
              value={d.data.date}
              onChange={(v) => set("date", v)}
              error={errors.date}
            />
            <label className="field">
              <span>Rodzaj pobytu</span>
              <select
                value={d.data.type}
                onChange={(e) => set("type", e.target.value)}
              >
                <option value="stały">Stały</option>
                <option value="czasowy">Czasowy</option>
              </select>
            </label>
          </>
        )}
        {d.kind === "move" && d.step === 2 && (
          <>
            <p className="lead">
              Twój adres:{" "}
              <b>
                {d.data.city}, {d.data.street}
              </b>
              . Wybierz, co przygotować.
            </p>
            <CheckOption
              label="Zameldowanie"
              description={`Plan zgłoszenia pobytu: ${d.data.type}. Potrzebny tytuł prawny do lokalu.`}
              checked={d.data.meldunek === "true"}
              onChange={() => toggle("meldunek")}
            />
            <CheckOption
              label="Adres dla urzędu skarbowego"
              description="Przygotujemy dane do aktualizacji. Właściwy formularz trzeba zweryfikować."
              checked={d.data.tax === "true"}
              onChange={() => toggle("tax")}
            />
            <CheckOption
              label="Dane właściciela pojazdu"
              description="Dodaj sprawdzenie danych w wydziale komunikacji do planu."
              checked={d.data.car === "true"}
              onChange={() => toggle("car")}
            />
            <div className="info-note">
              <LockKeyhole size={18} />
              <p>
                W pokazie żadna instytucja nie otrzyma danych. Każde działanie
                trafi do lokalnego potwierdzenia.
              </p>
            </div>
            {d.data.household === "z rodziną" && (
              <p className="footnote">
                Dla rodziny: sprawdź osobno uprawnienie do reprezentacji i
                wymagania dla każdej osoby.
              </p>
            )}
          </>
        )}
        {d.kind === "wallet" && d.step === 0 && (
          <>
            <p className="lead">
              Co było w portfelu? Wybierz utracone rzeczy, a ułożymy dalsze
              kroki.
            </p>
            <div className="journey-illustration small">
              <ShieldCheck size={58} strokeWidth={1} />
              <LockKeyhole size={28} />
            </div>
            <CheckOption
              label="Dowód osobisty"
              description="Przygotuj zgłoszenie utraty dokumentu."
              checked={d.data.id === "true"}
              onChange={() => toggle("id")}
            />
            <CheckOption
              label="Karty płatnicze"
              description="Blokadę wykonasz bezpośrednio w swoim banku."
              checked={d.data.cards === "true"}
              onChange={() => toggle("cards")}
            />
            <CheckOption
              label="Prawo jazdy"
              description="Dodaj sprawdzenie procedury wydania nowego dokumentu."
              checked={d.data.license === "true"}
              onChange={() => toggle("license")}
            />
          </>
        )}
        {d.kind === "wallet" && d.step === 1 && (
          <>
            <p className="lead">
              Oddzielamy ochronę danych od utraty dokumentów. Sprawdź, co chcesz
              zasymulować.
            </p>
            <CheckOption
              label="Włącz ochronę PESEL w pokazie"
              description="Zmieni wyłącznie status tego profilu demonstracyjnego."
              checked={d.data.pesel === "true"}
              onChange={() => toggle("pesel")}
            />
            {d.data.id === "true" && (
              <CheckOption
                label="Przygotuj zgłoszenie utraty dowodu"
                description="W rzeczywistości zgłoszenie utraty może prowadzić do unieważnienia dokumentu. Tutaj zapisujemy jedynie plan."
                checked={d.data.report === "true"}
                onChange={() => toggle("report")}
              />
            )}
            {d.data.cards === "true" && (
              <div className="plan-item">
                <IconBox tone="sand">
                  <LockKeyhole size={23} />
                </IconBox>
                <span>
                  <strong>Blokada kart w Twoim banku</strong>
                  <small>
                    Krok do samodzielnego wykonania. Ten prototyp nie blokuje
                    kart.
                  </small>
                </span>
              </div>
            )}
            {d.data.license === "true" && (
              <div className="plan-item">
                <IconBox>
                  <IdCard size={23} />
                </IconBox>
                <span>
                  <strong>Sprawdź utratę prawa jazdy</strong>
                  <small>Po potwierdzeniu dodamy ten krok do listy.</small>
                </span>
              </div>
            )}
            <div className="info-note">
              <ShieldCheck size={19} />
              <p>
                Zastrzeżenie PESEL i zgłoszenie utraty dowodu to odrębne
                działania. Jedno nie wykonuje drugiego.
              </p>
            </div>
          </>
        )}
        {d.kind === "letter" && d.step === 0 && (
          <>
            <p className="lead">
              Zacznij od fikcyjnego przykładu lub wklej zanonimizowany tekst.
            </p>
            <label className="field">
              <span>Treść pisma</span>
              <textarea
                className="letter-input"
                value={d.data.text}
                onChange={(e) => set("text", e.target.value)}
                aria-invalid={!!errors.text}
              />
              {errors.text && <small className="error">{errors.text}</small>}
            </label>
            <button
              className="secondary"
              onClick={() => set("text", sampleLetter)}
            >
              <FileText size={18} />
              Użyj przykładowego pisma
            </button>
            <p className="footnote">
              <LockKeyhole size={14} />
              Nie wklejaj prawdziwych danych osobowych. Tekst pozostaje w tej
              przeglądarce.
            </p>
          </>
        )}
        {d.kind === "letter" && d.step === 1 && (
          <>
            <Badge tone="red">Analiza demonstracyjna · bez AI</Badge>
            <p className="lead">{analysis.summary}</p>
            <div className="explanation">
              <span>
                <CalendarDays size={20} />
                Data znaleziona w treści
              </span>
              <strong>
                {analysis.date || "Nie znaleziono jednoznacznej daty"}
              </strong>
              <small>
                {analysis.sample
                  ? "W przykładzie: termin odpowiedzi."
                  : "Data może oznaczać termin, datę sporządzenia lub inne zdarzenie."}
              </small>
            </div>
            {analysis.sample && (
              <div className="source-quote">
                <small>SKĄD TO WIEMY · FRAGMENT PISMA</small>
                <q>
                  Prosimy o uzupełnienie brakującego potwierdzenia tytułu
                  prawnego do lokalu.
                </q>
              </div>
            )}
            <h3>Co chcesz przygotować?</h3>
            <label className="radio-option">
              <input
                type="radio"
                name="reply"
                checked={d.data.reply === "document"}
                onChange={() => set("reply", "document")}
              />
              Szkic odpowiedzi z dokumentem
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="reply"
                checked={d.data.reply === "question"}
                onChange={() => set("reply", "question")}
              />
              Pytanie do urzędu o wyjaśnienie
            </label>
            <p className="footnote">
              Oryginalna treść pisma jest nadrzędna. Wyjaśnienie przykładu nie
              jest poradą prawną.
            </p>
          </>
        )}
        {d.kind === "letter" && d.step === 2 && (
          <>
            <p className="lead">
              {canSendDirectly ? "Urząd Miasta Warszawy prosi o kopię umowy najmu do sprawy UM/2026/184." : d.data.reply === "question"
                ? "Sformułuj pytanie, które chcesz zadać urzędowi."
                : "Sprawdź i popraw szkic odpowiedzi."}{" "}
              {!canSendDirectly && "Nic nie wyślemy."}
            </p>
            {canSendDirectly && <details className="reply-details"><summary>Zobacz treść wezwania</summary><p>{d.data.text}</p></details>}
            <label className="field">
              <span>Szkic odpowiedzi</span>
              <textarea
                className="letter-input"
                value={d.data.response}
                onChange={(e) => set("response", e.target.value)}
                aria-invalid={!!errors.response}
              />
              {errors.response && (
                <small className="error">{errors.response}</small>
              )}
            </label>
            <button
              className="text-button"
              onClick={() =>
                set(
                  "response",
                  d.data.reply === "question"
                    ? "Dzień dobry, proszę o wyjaśnienie, jaki dokument jest wymagany do uzupełnienia wniosku UM/2026/184 oraz jakim kanałem mogę go przekazać."
                    : "Dzień dobry, w odpowiedzi na wezwanie UM/2026/184 przygotuję kopię umowy najmu. Przekażę dokument właściwym kanałem po sprawdzeniu wymagań urzędu.",
                )
              }
            >
              <Sparkles size={16} />
              Wstaw szkic demonstracyjny
            </button>
            {d.data.reply === "document" && (
              <AttachmentEditor draft={d} onSave={onSave} />
            )}
            {errors.attachment && <p className="error">{errors.attachment}</p>}
            <div className="info-note">
              <Eye size={18} />
              <p>
                Plik zapisujemy tylko w tej przeglądarce. Nie trafi do serwera
                ani urzędu. Możesz pobrać go z potwierdzenia.
              </p>
            </div>
          </>
        )}
        {last && (
          <>
            <p className="lead">
              To ostatni krok. Sprawdź działanie, odbiorcę i zakres danych.
            </p>
            <div className="review-card">
              <div className="review-heading">
                <IconBox tone="red">
                  {d.kind === "move" ? (
                    <House />
                  ) : d.kind === "wallet" ? (
                    <ShieldCheck />
                  ) : (
                    <FileText />
                  )}
                </IconBox>
                <span>
                  <strong>{meta.short}</strong>
                  <small>{p.name} · profil demo</small>
                </span>
                <button
                  className="text-button"
                  onClick={() => {
                    onSave({
                      ...d,
                      step: Math.max(0, d.step - 1),
                      data: { ...d.data, consent: "false" },
                    });
                  }}
                >
                  Zmień
                </button>
              </div>
              <dl className="data-list">
                {d.kind === "move" ? (
                  <>
                    <div>
                      <dt>Nowy adres</dt>
                      <dd>
                        {d.data.city}, {d.data.street}
                        <br />
                        {d.data.postal}
                      </dd>
                    </div>
                    <div>
                      <dt>Od kiedy</dt>
                      <dd>
                        {d.data.date} · pobyt {d.data.type}
                      </dd>
                    </div>
                    <div>
                      <dt>Plan formalności</dt>
                      <dd>
                        {[
                          d.data.meldunek === "true" && "Zameldowanie",
                          d.data.tax === "true" && "Adres podatkowy",
                          d.data.car === "true" && "Dane pojazdu",
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </dd>
                    </div>
                    <div>
                      <dt>Docelowi odbiorcy planu</dt>
                      <dd>
                        {[
                          d.data.meldunek === "true" && "Urząd gminy/miasta",
                          d.data.tax === "true" && "Urząd skarbowy",
                          d.data.car === "true" && "Wydział komunikacji",
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </dd>
                    </div>
                    <div>
                      <dt>Zakres w pokazie</dt>
                      <dd>
                        Imię, nazwisko, nowy adres, termin. Bez wysyłania.
                      </dd>
                    </div>
                  </>
                ) : d.kind === "wallet" ? (
                  <>
                    <div>
                      <dt>Wybrane działania</dt>
                      <dd>
                        {[
                          d.data.pesel === "true" && "Ochrona PESEL w pokazie",
                          d.data.id === "true" &&
                            d.data.report === "true" &&
                            "Plan zgłoszenia utraty dowodu",
                          d.data.cards === "true" &&
                            "Samodzielna blokada kart w banku",
                          d.data.license === "true" &&
                            "Sprawdzenie utraty prawa jazdy",
                        ]
                          .filter(Boolean)
                          .join(". ")}
                      </dd>
                    </div>
                    <div>
                      <dt>Odbiorca</dt>
                      <dd>Wyłącznie lokalny profil demo</dd>
                    </div>
                    <div>
                      <dt>Konsekwencje</dt>
                      <dd>
                        Zmiana statusu w pokazie i zapis planu. Twoje
                        rzeczywiste dokumenty i karty pozostają poza prototypem.
                      </dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <dt>Rodzaj odpowiedzi</dt>
                      <dd>
                        {d.data.reply === "question"
                          ? "Prośba o wyjaśnienie"
                          : "Uzupełnienie dokumentu"}
                      </dd>
                    </div>
                    <div>
                      <dt>Szkic</dt>
                      <dd>{d.data.response}</dd>
                    </div>
                    <div>
                      <dt>Załącznik demonstracyjny</dt>
                      <dd>{d.data.attachmentName || "Brak"}</dd>
                    </div>
                    <div>
                      <dt>Odbiorca</dt>
                      <dd>Szkic lokalny. Nie zostanie wysłany do urzędu.</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
            {d.kind === "move" && <MovePlan data={d.data} />}
            <section
              className="control-card"
              aria-label="Kontrola działania asystenta"
            >
              <h3>Ty decydujesz, co dalej</h3>
              <p>
                Asystent przygotował plan. Dopiero Twoja zgoda zapisze wynik tej
                symulacji.
              </p>
              <dl>
                <div>
                  <dt>Dlaczego ten plan?</dt>
                  <dd>
                    {d.kind === "move"
                      ? "Wybrałeś zmianę adresu i konkretne formalności. Każda ma własny status."
                      : d.kind === "wallet"
                        ? "Plan obejmuje tylko wybrane utracone dokumenty i działania ochronne."
                        : "Odpowiedź wynika z przykładowego pisma oraz wybranego sposobu odpowiedzi."}
                  </dd>
                </div>
                <div>
                  <dt>Użyte informacje</dt>
                  <dd>
                    {d.kind === "move"
                      ? "Dane profilu demo, nowy adres, data pobytu i wybrane formalności."
                      : d.kind === "wallet"
                        ? "Lista utraconych dokumentów i Twój wybór ochrony."
                        : "Treść pisma, szkic odpowiedzi i nazwa lokalnego załącznika."}
                  </dd>
                </div>
                <div>
                  <dt>Co zostanie przekazane?</dt>
                  <dd>
                    Nic poza tym urządzeniem. Zatwierdzisz zapis demonstracyjny,
                    nie wysyłkę do instytucji.
                  </dd>
                </div>
              </dl>
            </section>
            <CheckOption
              label="Rozumiem i zatwierdzam symulację"
              description="Dane i operacje są demonstracyjne. Nic nie trafi do administracji ani banku."
              checked={d.data.consent === "true"}
              onChange={() => {
                onSave({
                  ...d,
                  data: {
                    ...d.data,
                    consent: d.data.consent === "true" ? "false" : "true",
                  },
                });
                setErrors({});
              }}
            />
          </>
        )}
        {Object.keys(errors).length > 0 && (
          <div className="error-summary" role="alert" tabIndex={-1}>
            {errors.attachment || errors.selection ||
              errors.consent ||
              "Sprawdź zaznaczone pola i popraw dane."}
          </div>
        )}
      </div>
      <div className="flow-footer">
        <span>
          <LockKeyhole size={12} />
          {canSendDirectly ? "Wysyłka jest symulowana. Plik zostaje na urządzeniu." : "Zapis lokalny · bez wysyłania do urzędu"}
        </span>
        <button className="primary" onClick={advance}>
          {canSendDirectly ? "Wyślij odpowiedź (demo)" : last ? "Zatwierdź symulację" : d.step === 0 ? "Zaczynamy" : "Dalej"}
          {last ? <Check size={19} /> : <ArrowRight size={19} />}
        </button>
      </div>
    </>
  );
}

function Assistant({
  p,
  c,
  conversation,
  onNew,
  onConversation,
  update,
  onClose,
  onStart,
  process,
  onReceipt,
  screen,
  documentId,
  onDocument,
  onShare,
  onPrivacy,
  workflow,
  workflowKind,
  workflowOnline,
  workflowSession,
  onWorkflowResult,
  onTrust,
  waitingForContext,
  letterSession,
  onReviewLetter,
  askWorkflows,
  onWorkflow,
}: {
  p: Profile;
  c: CitizenState;
  conversation: string;
  onNew: () => void;
  onConversation: (id: string) => void;
  update: (fn: (c: CitizenState) => CitizenState) => void;
  onClose: () => void;
  onStart: (k: CaseKind, data?: Record<string, string>) => void;
  process?: Receipt;
  onReceipt: (r: Receipt) => void;
  screen?: Tab;
  documentId?: number;
  onDocument: (id: number) => void;
  onShare: (id: number) => void;
  onPrivacy: () => void;
  workflow?: WorkflowAction;
  workflowKind?: WorkflowKind;
  workflowOnline: boolean;
  workflowSession: ReturnType<typeof useWorkflows>;
  onWorkflowResult: (item: WorkflowCase, conversation: string) => void;
  onTrust: () => void;
  waitingForContext: boolean;
  letterSession?: MostSession;
  onReviewLetter: () => void;
  askWorkflows: (text: string, context: WorkflowAction | undefined, signal: AbortSignal) =>
    Promise<WorkflowReply | null>;
  onWorkflow: (action: WorkflowAction, data?: Record<string, string>) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [dismissed, setDismissed] = useState<number>();
  const [embedded, setEmbedded] = useState<{ kind: WorkflowKind; city?: string } | { kind: "letter" }>();
  const [attachmentQuestion, setAttachmentQuestion] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const embeddedRef = useRef<HTMLElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const workflowLabels: Record<WorkflowAction, string> = {
    fine: "Otwórz mandat", tax: "Otwórz płatność podatku", move: "Załatw formalności po przeprowadzce",
    letter: "Otwórz pismo i dokumenty", help: "Poproś o pomoc przez MOST", cases: "Sprawdź swoje sprawy",
  };
  const chatContext = workflowKind ? workflowDetails[workflowKind].title
    : workflow === "letter" ? "Pismo z urzędu" : workflow ? workflowLabels[workflow] : documentId !== undefined ? documentTitles(p)[documentId]
    : screen === "privacy" ? "Zakres danych i zgody"
      : screen === "cases" ? "Twoje zapisane sprawy" : null;
  const prompts = workflow || process ? ["Co mam zrobić dalej?"]
    : documentId !== undefined ? ["Pokaż ten dokument", "Udostępnij ten dokument"]
      : [p.id === "kacper" && workflowOnline ? "Mam jakiś mandat do zapłacenia?" : "Przeprowadzam się do Warszawy",
        "Jakie sprawy mogę załatwić?", "Nie rozumiem pisma z urzędu"];
  const messages = c.messages.filter((message) => (message.conversation ?? "general") === conversation);
  const threads = new Map<string, string>();
  for (const message of c.messages) {
    const id = message.conversation ?? "general";
    if (!threads.has(id)) threads.set(id, message.text);
  }
  const lastReply = messages.at(-1);
  const starter = workflow === "fine" ? "Czy muszę opłacić ten mandat?"
    : workflow === "tax" ? "Co mam zrobić z tą płatnością podatku?"
    : workflow === "letter" ? "Co jest w tym piśmie z urzędu?"
    : workflow === "move" ? "Co mam zrobić w tej sprawie po przeprowadzce?"
    : process ? "Co mam zrobić dalej?"
    : documentId !== undefined ? "Pokaż ten dokument" : undefined;
  const followUps = !serverAI && !busy && lastReply?.role === "assistant" &&
    !lastReply.action && !lastReply.caseId && !lastReply.showPrivacy && !lastReply.workflowAction &&
    lastReply.documentId === undefined && lastReply.shareDocumentId === undefined;
  useEffect(() => () => requestRef.current?.abort(), []);
  useLayoutEffect(() => {
    if (embedded) embeddedRef.current?.scrollIntoView({ block: "start" });
  }, [embedded]);
  useEffect(() => {
    if (!messages.length && !busy) {
      chatRef.current?.scrollTo({ top: 0 });
      return;
    }
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [messages.length, busy]);
  useEffect(() => {
    if (busy || waitingForContext) return;
    const question = attachmentQuestion ? "Czy załącznik jest dodany i co mam teraz zrobić?"
      : !messages.length ? starter : undefined;
    if (!question) return;
    const task = window.setTimeout(() => {
      if (attachmentQuestion) setAttachmentQuestion(false);
      void send(question);
    }, 0);
    return () => clearTimeout(task);
  }, [starter, messages.length, waitingForContext, attachmentQuestion, busy]);
  async function send(value = text, record = true) {
    if (!value.trim() || requestRef.current) return;
    const input = value.trim();
    setText("");
    setBusy(true);
    setError("");
    const controller = new AbortController();
    requestRef.current = controller;
    if (record) update((c) => ({
      ...c,
      messages: [...c.messages, { role: "user", text: input, conversation }],
    }));
    try {
      const operational = workflowOnline && !process && documentId === undefined
        ? await askWorkflows(input, workflow ?? messages.filter((m) => m.role === "assistant").at(-1)?.workflowAction, controller.signal)
        : null;
      const provider = documentId !== undefined && (input === "Pokaż ten dokument" || input === "Udostępnij ten dokument")
        ? demoAssistant : assistant;
      const message: Message = operational ? { role: "assistant", ...operational } : await provider.reply(
        input,
        {
          profileName: p.first,
          protected: c.protected,
          screen,
          documentId,
          drafts: Object.values(c.drafts)
            .filter((d) => !!d)
            .map((d) => ({
              kind: d.kind,
              nextStep: caseMeta[d.kind].steps[d.step],
            })),
          ...(process
            ? {
                process: {
                  id: process.id,
                  kind: process.kind,
                  nextStep: receiptNextStep(process),
                  completed: process.operations
                    ? process.operations.filter(
                        (o) =>
                          o.status === "accepted" || o.status === "manual-done",
                      ).length
                    : 1,
                  total: process.operations?.length || 1,
                },
              }
            : {}),
        },
        controller.signal,
      );
      if (!controller.signal.aborted)
        update((c) => ({ ...c, messages: [...c.messages, { ...message, conversation }] }));
    } catch {
      if (!controller.signal.aborted)
        setError("Nie udało się przygotować odpowiedzi. Spróbuj ponownie.");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      setBusy(false);
    }
  }
  return (
    <>
      <LayerHeader
        title="Twój asystent"
        subtitle={
          workflowOnline ? "Sprawy i odpowiedzi · środowisko demo" : serverAI
            ? "Backend asystenta · środowisko demo"
            : "Tryb demo · bez połączenia z AI"
        }
        onClose={onClose}
      />
      <div className="chat-toolbar">
        <button type="button" className="text-button" onClick={onNew}><Plus size={16} /> Nowa rozmowa</button>
        {!!threads.size && <button type="button" className="text-button" aria-expanded={showHistory}
          onClick={() => setShowHistory(!showHistory)}>Rozmowy</button>}
      </div>
      {showHistory && <section className="chat-history" aria-label="Zapisane rozmowy">
          {[...threads].reverse().map(([id, title]) => <button key={id} className="chat-action"
            aria-current={id === conversation ? "true" : undefined}
            onClick={() => { setShowHistory(false); onConversation(id); }}><span>{title}</span><ArrowRight size={16} /></button>)}
      </section>}
      <div className="layer-body chat-body" ref={chatRef}>
        {!process && chatContext && (
          <div className="chat-context">
            <ShieldCheck size={14} />
            Kontekst: {chatContext}
          </div>
        )}
        {process && (
          <button
            className="process-assistant"
            onClick={() => onReceipt(process)}
          >
            <FileText size={23} />
            <span>
              <strong>{caseMeta[process.kind].short}</strong>
              <small>{receiptNextStep(process)} · wróć do sprawy</small>
            </span>
            <ArrowRight size={18} />
          </button>
        )}
        {!messages.length ? (
          <div className="chat-welcome">
            <div className="large-spark">
              <Sparkles size={37} strokeWidth={1.4} />
            </div>
            <h1 tabIndex={-1}>W czym mogę pomóc?</h1>
            <p>Opisz sprawę po swojemu lub zacznij od przykładu.</p>
            {starter ? <p role="status">Otwieram rozmowę o sprawie…</p> : <><h2>Przykładowe pytania</h2>
            <div className="prompt-options">
              {prompts.map((prompt) => (
                <button key={prompt} onClick={() => send(prompt)}>
                  {prompt}
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div></>}
          </div>
        ) : (
          <>
            <div className="chat-context">
              <ShieldCheck size={14} />
              Dane tylko z profilu: {p.first} · demo
            </div>
            {messages.map((m, i) => (
              <div className={"chat-message " + m.role} key={i}>
                {m.role === "assistant" && (
                  <span className="message-avatar">
                    <Sparkles size={16} />
                  </span>
                )}
                <div>
                  <p>{m.text}</p>
                  {m.fallback && <small>Odpowiedź z trybu regułowego.</small>}
                  {m.workflowAction && <button className="chat-action" onClick={() => onWorkflow(m.workflowAction!, m.suggestedData)}>
                    <span><strong>{workflowLabels[m.workflowAction]}</strong><small>Otwórz formularz lub podgląd sprawy</small></span>
                    <ArrowRight size={20} />
                  </button>}
                  {i === messages.length - 1 && dismissed !== i && m.workflowAction && <div className="chat-quick-actions">
                    {(m.workflowAction === "fine" || m.workflowAction === "tax") && workflowSession.items.some((item) => item.kind === m.workflowAction) &&
                      <button disabled={busy} onClick={() => setEmbedded({ kind: m.workflowAction as "fine" | "tax" })}>
                        {workflowSession.items.some((item) => item.kind === m.workflowAction && item.receipt)
                          ? "Pokaż potwierdzenie w czacie" : m.workflowAction === "fine" ? "Opłać mandat w czacie" : "Opłać podatek w czacie"}
                      </button>}
                    {m.workflowAction === "move" && <>
                      <button disabled={busy} onClick={() => setEmbedded({ kind: "registration", city: m.suggestedData?.city })}>Zgłoś zameldowanie</button>
                      <button disabled={busy} onClick={() => setEmbedded({ kind: "tax-address", city: m.suggestedData?.city })}>Zaktualizuj adres</button>
                    </>}
                    {m.workflowAction === "letter" && letterSession?.view && <>
                      {letterSession.view.document && <details className="chat-letter-preview">
                        <summary>{letterSession.view.document.title}</summary>
                        <p>{letterSession.view.document.body}</p>
                        <small>{letterSession.view.document.office}</small>
                      </details>}
                      {["new", "preparing", "document", "correction"].includes(letterSession.view.status) &&
                        <button disabled={busy} onClick={() => setEmbedded({ kind: "letter" })}>Przygotuj odpowiedź</button>}
                      {!letterSession.view.invitation && !["review", "finished", "rejected"].includes(letterSession.view.status) &&
                        <button disabled={busy} onClick={() => onWorkflow("help")}>Poproś o pomoc</button>}
                    </>}
                    {m.workflowAction !== "cases" && <button onClick={() => { setDismissed(i); setEmbedded(undefined); }}>Później</button>}
                  </div>}
                  {(m.documentId !== undefined ||
                    m.shareDocumentId !== undefined) && (
                    <button
                      className="chat-document-card"
                      onClick={() =>
                        m.shareDocumentId !== undefined
                          ? onShare(m.shareDocumentId)
                          : onDocument(m.documentId!)
                      }
                    >
                      <img src={"/portraits/" + p.id + ".png"} alt="" />
                      <span>
                        <strong>
                          {
                            documentTitles(p)[
                              m.shareDocumentId ?? m.documentId!
                            ]
                          }
                        </strong>
                        <small>
                          {m.shareDocumentId !== undefined
                            ? "Wybierz minimalny zakres i zatwierdź"
                            : "Otwórz dokument z portfela"}
                        </small>
                      </span>
                      <ArrowRight size={18} />
                    </button>
                  )}
                  {m.showPrivacy && (
                    <button className="chat-action" onClick={onPrivacy}>
                      <span>
                        <strong>Sprawdź zakres i zgody</strong>
                        <small>Otwórz centrum danych</small>
                      </span>
                      <ArrowRight size={18} />
                    </button>
                  )}
                  {m.caseId && c.receipts.some((r) => r.id === m.caseId) && (
                    <button
                      className="chat-action"
                      onClick={() =>
                        onReceipt(c.receipts.find((r) => r.id === m.caseId)!)
                      }
                    >
                      <span>
                        <strong>Wróć do swojej sprawy</strong>
                        <small>Otwórz zapisany proces</small>
                      </span>
                      <ArrowRight size={20} />
                    </button>
                  )}
                  {m.action && (
                    <button
                      className="chat-action"
                      onClick={() => onStart(m.action!, m.suggestedData)}
                    >
                      <span>
                        <strong>{caseMeta[m.action].short}</strong>
                        <small>{m.action === "move" ? "Otwórz formularze" : m.action === "letter" ? "Otwórz pismo demonstracyjne" : "Otwórz ochronę dokumentów"}</small>
                      </span>
                      <ArrowRight size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {followUps && <div className="chat-follow-ups" role="group" aria-label="Możliwe dalsze pytania">
              {prompts.map((prompt) => <button key={prompt} onClick={() => void send(prompt)}>{prompt}<ArrowUpRight size={15} /></button>)}
            </div>}
            {documentId !== undefined && !busy && lastReply?.shareDocumentId === undefined && <div className="chat-quick-actions">
              <button onClick={() => void send("Udostępnij ten dokument")}>Udostępnij ten dokument</button>
            </div>}
          </>
        )}
        {busy && (
          <div className="typing" role="status">
            Sprawdzam informacje…
          </div>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {!busy && lastReply?.role === "user" && <button className="text-button" onClick={() => void send(lastReply.text, false)}>Ponów pytanie</button>}
        {embedded && <section ref={embeddedRef} className="chat-case-panel" aria-label={embedded.kind === "letter" ? "Odpowiedź na pismo w czacie" : "Formularz sprawy w czacie"}>
          <button className="text-button" onClick={() => setEmbedded(undefined)}>Schowaj formularz</button>
          {embedded.kind === "letter" ? letterSession?.view && <>
            {["new", "preparing", "document", "correction"].includes(letterSession.view.status) && <>
              <MostTasks session={letterSession} onAttachment={() => setAttachmentQuestion(true)} />
              {letterSession.error && <p role="alert">{letterSession.error}</p>}
              <button className="primary" disabled={!letterSession.view.canReview || letterSession.busy} onClick={async () => {
                if (await letterSession.act({ type: "review" })) onReviewLetter();
              }}>Sprawdź i wyślij</button>
            </>}
            {letterSession.view.status === "review" && <button className="primary" onClick={onReviewLetter}>Sprawdź przygotowaną odpowiedź</button>}
          </> : <WorkflowWorkspace key={embedded.kind} inline kind={embedded.kind} applicant={p.name} city={embedded.city}
            trustedToken={delegationToken(p.id + "-trusted")} onTrust={onTrust}
            session={workflowSession} onBack={onNew} onResult={(item) => onWorkflowResult(item, conversation)} />}
        </section>}
      </div>
      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label>
          <span className="sr-only">Wiadomość do asystenta</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Napisz po swojemu…"
            enterKeyHint="send"
            maxLength={1500}
          />
        </label>
        <button
          className="send-button"
          type="submit"
          disabled={!text.trim() || busy}
          aria-label="Wyślij wiadomość"
        >
          <ArrowUp size={21} />
        </button>
      </form>
      <div className="chat-disclaimer">
        <LockKeyhole size={11} />
        {serverAI || workflowOnline ? "W rozmowie używaj wyłącznie danych przykładowych." : "Rozmowa pozostaje na tym urządzeniu."}
      </div>
    </>
  );
}

function Document({
  p,
  id,
  protectedPesel,
  address,
  onClose,
  onShare,
  onWallet,
  onAssistant,
}: {
  p: Profile;
  id: number;
  protectedPesel: boolean;
  address: string;
  onClose: () => void;
  onShare: () => void;
  onWallet: () => void;
  onAssistant: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const name = id === 3 ? p.extra : docNames[id];
  return (
    <>
      <LayerHeader
        title={name}
        subtitle="Dokument demonstracyjny"
        onClose={onClose}
      />
      <div className="layer-body document-detail">
        <h1 className="sr-only" tabIndex={-1}>
          {name}
        </h1>
        <DigitalCard p={p} id={id} />
        <div className="document-valid">
          <CircleCheck size={19} />
          <span>
            {id === 0
              ? "Dokument demonstracyjny"
              : "Przykładowy dokument ważny"}
          </span>
          <span>DEMO</span>
        </div>
        <div className="document-actions">
          <button onClick={onShare}>
            <span>
              <ScanLine size={23} />
            </span>
            Udostępnij dane
          </button>
          <button onClick={() => setVisible(!visible)}>
            <span>{visible ? <EyeOff size={23} /> : <Eye size={23} />}</span>
            {visible ? "Ukryj dane" : "Pokaż dane"}
          </button>
          <button onClick={onWallet}>
            <span>
              <ShieldCheck size={23} />
            </span>
            Ochrona danych
          </button>
        </div>
        <button className="process-assistant" onClick={onAssistant}>
          <Sparkles size={21} />
          <span>
            <strong>Zapytaj o ten dokument</strong>
            <small>Asystent zachowa kontekst dokumentu</small>
          </span>
          <ArrowRight size={17} />
        </button>
        <SectionTitle title="Dane dokumentu" />
        <dl className="data-list document-data">
          <div>
            <dt>{id === 2 ? "Właściciel" : "Imię i nazwisko"}</dt>
            <dd>{p.name}</dd>
          </div>
          {id === 0 ? (
            <>
              <div>
                <dt>Numer dokumentu</dt>
                <dd>{visible ? p.number : "DEMO ••• •••"}</dd>
              </div>
              <div>
                <dt>Data urodzenia</dt>
                <dd>{visible ? p.birth : "••.••.••••"}</dd>
              </div>
              <div>
                <dt>PESEL</dt>
                <dd>{visible ? "00000000000 · fikcyjny" : "•••••••••••"}</dd>
              </div>
              <div>
                <dt>Ważny do</dt>
                <dd>12.06.2034 · przykład</dd>
              </div>
              <div>
                <dt>Adres w profilu demo</dt>
                <dd>{visible ? address : "Dane ukryte"}</dd>
              </div>
              <div>
                <dt>Ochrona PESEL</dt>
                <dd>
                  {protectedPesel
                    ? "Włączona w symulacji"
                    : "Nie zmieniano w pokazie"}
                </dd>
              </div>
            </>
          ) : id === 1 ? (
            <>
              <div>
                <dt>Kategorie</dt>
                <dd>B</dd>
              </div>
              <div>
                <dt>Numer blankietu</dt>
                <dd>{visible ? "DEMO 026/2026" : "DEMO ••••"}</dd>
              </div>
              <div>
                <dt>Ważny do</dt>
                <dd>12.06.2034</dd>
              </div>
              <div>
                <dt>Punkty karne</dt>
                <dd>0 · dane fikcyjne</dd>
              </div>
            </>
          ) : id === 2 ? (
            <>
              <div>
                <dt>Nr rejestracyjny</dt>
                <dd>WX DEMO</dd>
              </div>
              <div>
                <dt>VIN</dt>
                <dd>{visible ? "DEMO0000000000000" : "•••••••••••••••••"}</dd>
              </div>
              <div>
                <dt>OC do</dt>
                <dd>12.04.2027 · przykład</dd>
              </div>
              <div>
                <dt>Badanie do</dt>
                <dd>01.12.2026 · za 14 dni</dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt>Numer karty</dt>
                <dd>{visible ? "DEMO 2026 004" : "DEMO ••••"}</dd>
              </div>
              <div>
                <dt>Ważna do</dt>
                <dd>
                  {p.extra === "Karta EKUZ" ? "12.06.2028" : "31.03.2027"}
                </dd>
              </div>
              <div>
                <dt>Wydawca w przykładzie</dt>
                <dd>
                  {p.extra === "Karta EKUZ"
                    ? "NFZ · dane fikcyjne"
                    : "Politechnika Gdańska · dane fikcyjne"}
                </dd>
              </div>
            </>
          )}
        </dl>
        <p className="footnote">
          <Info size={14} />
          Nie jest dokumentem tożsamości ani dowodem uprawnień. Nie okazuj go w
          rzeczywistych sytuacjach.
        </p>
      </div>
    </>
  );
}

function Share({
  p,
  id,
  onClose,
  onShare,
  onRevoke,
  initialScope,
}: {
  p: Profile;
  id: number;
  onClose: () => void;
  onShare: (scope: string, purpose: string, who: string) => string;
  onRevoke: (id: string) => void;
  initialScope?: "adult" | "identity";
}) {
  const [scope, setScope] = useState(
    id === 1
      ? "driving"
      : id === 2
        ? "vehicle"
        : id === 3||id===4
          ? "entitlement"
          : initialScope || "adult",
  );
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [error, setError] = useState("");
  const revokeRef = useRef(onRevoke);
  revokeRef.current = onRevoke;
  useEffect(() => {
    if (!token) return;
    const i = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(i);
  }, [token]);
  useEffect(() => {
    if (token && seconds === 0) revokeRef.current(token);
  }, [seconds, token]);
  const scopes: Record<
    string,
    { title: string; description: string; who: string; purpose: string }
  > = {
    adult: {
      title: "Mam ukończone 18 lat",
      description:
        "Wyłącznie potwierdzenie: TAK. Bez daty urodzenia, imienia i PESEL.",
      who: "Punkt weryfikacji wieku · demo",
      purpose: "Potwierdzenie pełnoletności",
    },
    identity: {
      title: "Imię i nazwisko",
      description: p.name + ". Bez numeru dokumentu, daty urodzenia i PESEL.",
      who: "Biblioteka miejska · demo",
      purpose: "Założenie konta czytelnika",
    },
    driving: {
      title: "Uprawnienie kategorii B",
      description:
        "Wyłącznie status przykładowego uprawnienia: TAK. Bez pozostałych danych.",
      who: "Wypożyczalnia · demo",
      purpose: "Sprawdzenie uprawnienia do kierowania",
    },
    vehicle: {
      title: "Status badania technicznego",
      description:
        "WX DEMO · ważne do 01.12.2026. Bez VIN i danych właściciela.",
      who: "Stacja kontroli · demo",
      purpose: "Sprawdzenie terminu badania",
    },
    entitlement: {
      title: "Status ważności karty",
      description:
        "Wyłącznie przykładowa ważność: TAK. Bez danych zdrowotnych i numeru karty.",
      who: "Punkt weryfikacji · demo",
      purpose: "Sprawdzenie ważności karty",
    },
  };
  const item = scopes[scope];
  return (
    <div className="sheet share-sheet">
      <span className="sheet-handle" />
      <div className="sheet-title">
        <h2 tabIndex={-1}>
          {token ? "Dane na Twoich zasadach" : "Udostępnij dane"}
        </h2>
        <button className="icon-button" onClick={onClose} aria-label="Zamknij">
          <X size={21} />
        </button>
      </div>
      <div className="sheet-body">
        {token ? (
          <>
            <Badge tone={seconds > 0 ? "green" : "neutral"}>
              {seconds > 0 ? "Kod demonstracyjny aktywny" : "Kod wygasł"}
            </Badge>
            <div
              className="demo-token"
              aria-label="Symboliczny kod demo, nie jest kodem QR"
            >
              <div>
                {Array.from({ length: 49 }, (_, i) => (
                  <i
                    key={i}
                    className={(i * 13 + (i % 3)) % 5 > 1 ? "dark" : ""}
                  />
                ))}
              </div>
              <b>DEMO</b>
            </div>
            <h3>{item.title}</h3>
            <p className="center muted">{item.description}</p>
            <p className="token-recipient">Odbiorca: {item.who}</p>
            <p className="token-time">
              <Clock3 size={16} />
              {seconds > 0
                ? `Wygasa za ${seconds} s`
                : "Wygasł — zgoda automatycznie wycofana"}
            </p>
            <div className="info-note">
              <Info size={18} />
              <p>
                Kod jest ilustracją. Nie udostępnia danych na zewnątrz.
                Zapisaliśmy zdarzenie w Twojej lokalnej historii.
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="sheet-lead">
              Wybierz zakres. Pozostałe dane zostają przy Tobie.
            </p>
            {id === 0 ? (
              Object.entries(scopes)
                .filter(([key]) => key === "adult" || key === "identity")
                .map(([key, value]) => (
                  <label
                    className={
                      "scope-option " + (scope === key ? "chosen" : "")
                    }
                    key={key}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === key}
                      onChange={() => {
                        setScope(key);
                        setConsent(false);
                      }}
                    />
                    <span>
                      <strong>{value.title}</strong>
                      <small>{value.description}</small>
                    </span>
                    <ShieldCheck size={22} />
                  </label>
                ))
            ) : (
              <div className="scope-option chosen">
                <ShieldCheck size={24} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
              </div>
            )}
            <dl className="data-list">
              <div>
                <dt>Odbiorca</dt>
                <dd>{item.who}</dd>
              </div>
              <div>
                <dt>Cel</dt>
                <dd>{item.purpose}</dd>
              </div>
              <div>
                <dt>Ważność</dt>
                <dd>60 sekund · zgoda odwoływalna</dd>
              </div>
              <div>
                <dt>Dostęp do pozostałych danych</dt>
                <dd>Brak</dd>
              </div>
            </dl>
          </>
        )}
      </div>
      <footer className="share-footer">
        {token ? (
          <button className="secondary" onClick={() => {
            onRevoke(token);
            onClose();
          }}>Zakończ i wycofaj zgodę</button>
        ) : (
          <>
            <CheckOption
              label="Zgadzam się na ten zakres w pokazie"
              checked={consent}
              onChange={() => {
                setConsent(!consent);
                setError("");
              }}
            />
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              className="primary"
              onClick={() => {
                if (!consent) {
                  setError("Najpierw potwierdź zakres udostępnienia.");
                  return;
                }
                setToken(onShare(item.title, item.purpose, item.who));
              }}
            >
              Utwórz kod demonstracyjny
              <ScanLine size={18} />
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

function ReceiptView({
  receipt: r,
  tasks,
  onTask,
  onClose,
  onPrivacy,
  onCopy,
  onSupply,
  onManual,
  onSend,
  onAssistant,
}: {
  receipt: Receipt;
  tasks: string[];
  onTask: (id: string) => void;
  onClose: () => void;
  onPrivacy: () => void;
  onCopy: () => void;
  onSupply: (key: string, name: string) => void;
  onManual: (id: string) => void;
  onSend: () => void;
  onAssistant: () => void;
}) {
  return (
    <>
      <LayerHeader
        title="Potwierdzenie"
        subtitle="Symulacja zakończona"
        onClose={onClose}
      />
      <div className="layer-body receipt-body">
        <div className="success-icon">
          <Check size={34} />
        </div>
        <Badge tone="green">Zapisano na urządzeniu</Badge>
        <h1 tabIndex={-1}>
          {r.kind === "move"
            ? "Twój pakiet przeprowadzki"
            : r.kind === "wallet"
              ? "Plan ochrony jest gotowy."
              : r.data.directReply === "true" ? "Wysłano odpowiedź w pokazie." : "Odpowiedź przygotowana."}
        </h1>
        <p className="lead">
          {r.kind === "move"
            ? "Twój adres w profilu demo został zaktualizowany."
            : r.kind === "wallet"
              ? "Wybrane działania zapisaliśmy w profilu demonstracyjnym."
              : r.data.directReply === "true" ? "Zapisano potwierdzenie odpowiedzi na wezwanie." : "Szkic został zapisany lokalnie."}{" "}
          Żadna operacja nie trafiła do urzędu ani banku.
        </p>
        {r.operations && (
          <MoveOutcomes
            operations={r.operations}
            onSupply={onSupply}
            onManual={onManual}
            onSend={onSend}
          />
        )}
        {r.operations && <ProcessRoute receipt={r} />}
        <button className="process-assistant" onClick={onAssistant}>
          <Sparkles size={22} />
          <span>
            <strong>Zapytaj o tę sprawę</strong>
            <small>Asystent zna zapisany etap procesu</small>
          </span>
          <ArrowRight size={18} />
        </button>
        <section className="process-history">
          <h2>Historia sprawy</h2>
          <ol>
            {(
              r.events || [{ at: r.at, label: "Zapisano wynik symulacji" }]
            ).map((e, i) => (
              <li key={i}>
                <small>{dateLabel(e.at)}</small>
                <p>{e.label}</p>
              </li>
            ))}
          </ol>
        </section>
        <div className="receipt-stamp">
          <FileCheck2 size={23} />
          <span>
            <strong>{r.id}</strong>
            <small>{dateLabel(r.at)} · potwierdzenie demo</small>
          </span>
          <button
            className="icon-button"
            onClick={onCopy}
            aria-label="Skopiuj potwierdzenie"
          >
            <Copy size={18} />
          </button>
        </div>
        {r.kind === "move" && (
          <dl className="data-list">
            <div>
              <dt>Nowy adres w pokazie</dt>
              <dd>
                {r.data.city}, {r.data.street}
                <br />
                {r.data.postal}
              </dd>
            </div>
          </dl>
        )}
        {r.kind === "wallet" && r.data.pesel === "true" && (
          <div className="document-valid">
            <ShieldCheck size={20} />
            Ochrona PESEL · włączona w symulacji
          </div>
        )}
        {r.kind === "letter" && r.data.attachmentKey && (
          <DownloadFile
            fileKey={r.data.attachmentKey}
            name={r.data.attachmentName}
          />
        )}{" "}
        {r.kind === "letter" && (
          <details className="reply-details">
            <summary>
              {r.data.directReply === "true" ? "Zobacz wysłaną odpowiedź demo" : "Zobacz zapisany szkic"}
              <ChevronDown size={17} />
            </summary>
            <p>{r.data.response}</p>
          </details>
        )}
        {r.followups.length > 0 && <SectionTitle title="Co jeszcze przed Tobą" />}
        {r.followups.map((t, i) => (
          <CheckOption
            key={i}
            label={t}
            description="Krok do wykonania poza prototypem"
            checked={tasks.includes(r.id + "-" + i)}
            onChange={() => onTask(r.id + "-" + i)}
          />
        ))}
        <button className="secondary" onClick={onPrivacy}>
          <ShieldCheck size={18} />
          Zobacz ślad użycia danych
        </button>
        <button className="primary" onClick={onClose}>
          Wróć do moich spraw
          <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}
