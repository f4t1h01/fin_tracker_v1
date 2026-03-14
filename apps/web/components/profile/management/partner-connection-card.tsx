import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";

type PartnerConnectionCardProps = {
  userCoupleCode: string | null;
  bindCode: string;
  setBindCode: (value: string) => void;
  isBinding: boolean;
  isUnbinding: boolean;
  bindMessage: string | null;
  bindError: string | null;
  activeWorkspaceName: string | null;
  activeRole: string | null;
  insertedCode: string | null;
  onBind: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onUnbind: () => Promise<void>;
};

export function PartnerConnectionCard(props: PartnerConnectionCardProps) {
  const canUnlink = Boolean(props.insertedCode);

  return (
    <Card className="panel-soft">
      <CardHeader><CardTitle>Partner connection</CardTitle><CardDescription>Review or update your current couple connection.</CardDescription></CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={props.onBind}>
          <div className="detail-box text-sm">
            <p>Your partner code: {props.userCoupleCode ?? "Generating..."}</p>
            <p>Active workspace: {props.activeWorkspaceName ?? "None"}</p>
            <p>Role: {props.activeRole ?? "-"}</p>
            <p>Last linked code: {props.insertedCode ?? "Not linked yet"}</p>
          </div>
          <label className="space-y-1 text-sm"><span className="field-label">Partner code</span><TextField required value={props.bindCode} onChange={(event) => props.setBindCode(event.target.value.toUpperCase())} placeholder="AB12CD" /></label>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="outline" disabled={props.isBinding || props.isUnbinding} pending={props.isBinding} pendingText="Connecting...">
              Connect partner
            </Button>
            {canUnlink ? (
              <Button type="button" variant="outline" disabled={props.isBinding || props.isUnbinding} pending={props.isUnbinding} pendingText="Removing..." onClick={() => void props.onUnbind()}>
                Remove partner
              </Button>
            ) : null}
            {props.bindMessage ? <p className="status-success text-sm">{props.bindMessage}</p> : null}
            {props.bindError ? <p className="status-error text-sm">{props.bindError}</p> : null}
          </div>
          {canUnlink ? <p className="body-muted text-sm">Removing a partner stops future shared work and returns you to a personal workspace. Existing shared history stays preserved.</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
