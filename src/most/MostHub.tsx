import { useState, type ReactNode } from "react";
import { ChevronDown, UserRound } from "lucide-react";
import type { Profile } from "../domain";
import type { MostHubMode } from "../navigation";
import { MostLayout, MostToolbarContext } from "./components";
import { DelegationOwner } from "./DelegationPanel";
import { MostHelperWorkspace } from "./MostHelper";
import { demoHelperToken, useMostSession } from "./session";
import "./control.css";

export default function MostHub({ profile, onSwitchProfile, onBack, workflowKey, letterKey, initialMode, nav, onOpenShared }: {
  profile: Profile; onSwitchProfile: (mode: MostHubMode) => void; onBack: () => void; workflowKey?: string | null;
  letterKey?: string | null; initialMode?: MostHubMode; nav?: ReactNode; onOpenShared?: () => void;
}) {
  const token = nav ? null : demoHelperToken(profile.id);
  const [mode, setMode] = useState<MostHubMode>(initialMode ?? (token ? "help" : "own"));
  const toolbar = (
    <div className="most-hub-toolbar">
      <div className="most-hub-tabs" role="group" aria-label="Widok MOST">
        <button aria-pressed={mode === "own"} onClick={() => setMode("own")}>Moje</button>
        <button aria-pressed={mode === "help"} onClick={() => setMode("help")}>Pomagam</button>
      </div>
      {nav ? <span className="most-hub-profile"><UserRound size={16} aria-hidden="true" />{profile.first}</span>
      : <button className="most-hub-profile" onClick={() => onSwitchProfile(mode)} aria-label={"Zmień profil demonstracyjny. Obecnie " + profile.name}>
        <UserRound size={16} aria-hidden="true" /><span>{profile.first}</span><ChevronDown size={14} aria-hidden="true" />
      </button>}
    </div>
  );
  return <div className="most-hub">
    <div className="most-hub-content">
      <MostToolbarContext.Provider value={toolbar}>
        {mode === "own" ? <DelegationOwner context={{ kind: "trusted" }} storageId={profile.id + "-trusted"} profile={profile.id}
          workflowKey={workflowKey} letterKey={letterKey} onBack={onBack} autoStart={!nav} sameTabDemo={!nav && profile.id === "ewa"} />
          : token ? <ProfileHelp key={token} token={token} onBack={onBack} />
            : <MostLayout role="helper" title="Sprawy, w których pomagam" screen="most-hub-empty" onBack={onBack}>
              {onOpenShared ? <button className="most-button most-primary" onClick={onOpenShared}>Otwórz panel pomocy MOST</button>
                : <p className="most-lead">Tu pojawią się sprawy przekazane temu profilowi w pokazie.</p>}
            </MostLayout>}
      </MostToolbarContext.Provider>
    </div>
    {nav}
  </div>;
}

function ProfileHelp({ token, onBack }: { token: string; onBack: () => void }) {
  const session = useMostSession("helper", "delegation-profile-help", false, true, undefined, token);
  return <MostHelperWorkspace session={session} close={onBack} />;
}
