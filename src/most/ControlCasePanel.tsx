import { MostLayout, MostNotice } from "./components";
import { MostHelperWorkspace } from "./MostHelper";
import { MostOwner } from "./MostOwner";
import { useMostSession } from "./session";
import { DelegatedWorkflow, WorkflowWorkspace } from "../workflows/Workspace";
import { useWorkflows } from "../workflows/session";
import { workflowDetails, type WorkflowKind } from "../workflows/model";
import type { ControlCase } from "./control-model";
import { profiles } from "../domain";

export default function ControlCasePanel({ item, role, profile, letterKey, back }: {
  item: ControlCase; role: "owner" | "helper"; profile?: string; letterKey?: string | null; back: () => void;
}) {
  if (role === "owner" && item.id === "letter" && letterKey)
    return <LetterPanel role="owner" token={letterKey} back={back} review={item.stage === "review"} />;
  if (role === "owner" && profile && Object.hasOwn(workflowDetails, item.id))
    return <OwnerWorkflow profile={profile} item={item} kind={item.id as WorkflowKind} back={back} />;

  const token = item.href?.match(/#(?:most|workflow)=([A-Za-z0-9_-]{32})$/)?.[1];
  if (role === "helper" && token && item.kind === "letter") return <LetterPanel role="helper" token={token} back={back} />;
  if (role === "helper" && token) return <DelegatedWorkflow token={token} onBack={back} />;
  return <MostLayout role={role} title={item.title} screen="control-case-unavailable" onBack={back}>
    <MostNotice tone="warning">Sprawa jest obecnie niedostępna.</MostNotice>
  </MostLayout>;
}

function LetterPanel({ role, token, back, review }: { role: "owner" | "helper"; token: string; back: () => void; review?: boolean }) {
  const session = useMostSession(role, "delegation-control-case", false, true, undefined, token);
  return role === "owner"
    ? <MostOwner session={session} onClose={back} initialPane={review ? "review" : "work"} />
    : <MostHelperWorkspace session={session} close={back} />;
}

function OwnerWorkflow({ profile, item, kind, back }: { profile: string; item: ControlCase; kind: WorkflowKind; back: () => void }) {
  const session = useWorkflows(profile);
  return <MostLayout role="owner" title={item.title} screen="control-workflow" onBack={back} roleLabel="Moje sprawy">
    <WorkflowWorkspace kind={kind} applicant={profiles.find((person) => person.id === profile)?.name ?? "Właściciel sprawy"} session={session}
      onBack={back} onResult={() => {}} inline />
  </MostLayout>;
}
