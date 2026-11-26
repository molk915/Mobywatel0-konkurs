import { useState, type ReactNode } from "react";
import { UserRound } from "lucide-react";
import type { Profile } from "../domain";
import type { MostHubMode } from "../navigation";
import { MostLayout, MostToolbarContext } from "./components";
import { DelegationOwner } from "./DelegationPanel";
import { MostHelperWorkspace } from "./MostHelper";
import { demoHelperToken, useMostSession } from "./session";
import { MostDashboardHeader, MostDashboardProfile, type DashboardProfile } from "./MostDashboard";
import "./control.css";

export default function MostHub({ profile, onSwitchProfile, onBack, workflowKey, letterKey, initialMode, nav, onOpenShared, showcase, onFullApp }: {
  profile: Profile; onSwitchProfile: (mode: MostHubMode) => void; onBack: () => void; workflowKey?: string | null;
  letterKey?: string | null; initialMode?: MostHubMode; nav?: ReactNode; onOpenShared?: () => void;
  showcase: boolean; onFullApp: () => void;
}) {
  const token = showcase ? null : demoHelperToken(profile.id);
  const [mode, setMode] = useState<MostHubMode>(initialMode ?? (!showcase && profile.id === "kacper" ? "help" : "own"));
  const dashboard: DashboardProfile = { profile, onFullApp, onSwitchProfile: () => onSwitchProfile(mode) };
  const toolbar = (
    <div className="most-hub-toolbar">
      <div className="most-hub-tabs" role="group" aria-label="Widok MOST">
        <button aria-pressed={mode === "own"} onClick={() => setMode("own")}>Moje</button>
        <button aria-pressed={mode === "help"} onClick={() => setMode("help")}>Pomagam</button>
      </div>
      <span className="most-hub-profile"><UserRound size={16} aria-hidden="true" />{profile.first}</span>
    </div>
  );
  return <div className={"most-hub" + (showcase ? "" : " most-hub-dashboard")}>
    <div className="most-hub-content">
      <MostToolbarContext.Provider value={showcase ? toolbar : null}>
        {mode === "own" ? <DelegationOwner context={{ kind: "trusted" }} storageId={profile.id + "-trusted"} profile={profile.id}
          workflowKey={workflowKey} letterKey={letterKey} onBack={onBack} autoStart={!showcase} sameTabDemo={!showcase && profile.id === "ewa"}
          dashboard={showcase ? undefined : dashboard} />
          : token ? <ProfileHelp key={token} token={token} onBack={onBack} dashboard={dashboard} />
            : <MostLayout role="helper" title={showcase ? "Sprawy, w których pomagam" : "MOST – " + profile.first} screen="most-hub-empty" onBack={onBack}
              header={showcase ? undefined : <MostDashboardHeader onFullApp={onFullApp} />} headingAvatar={showcase ? undefined : profile.first.charAt(0)}>
              {!showcase && <MostDashboardProfile dashboard={dashboard} />}
              {onOpenShared ? <button className="most-button most-primary" onClick={onOpenShared}>Otwórz panel pomocy MOST</button>
                : <div className="most-dashboard-state"><h2>Brak udostępnionych spraw</h2>
                  <p>Sprawa pojawi się tutaj, gdy bliska osoba przyzna Ci dostęp.</p></div>}
            </MostLayout>}
      </MostToolbarContext.Provider>
    </div>
    {nav}
  </div>;
}

function ProfileHelp({ token, onBack, dashboard }: { token: string; onBack: () => void; dashboard: DashboardProfile }) {
  const session = useMostSession("helper", "delegation-profile-help", false, true, undefined, token);
  return <MostHelperWorkspace session={session} close={onBack} dashboard={dashboard} />;
}
