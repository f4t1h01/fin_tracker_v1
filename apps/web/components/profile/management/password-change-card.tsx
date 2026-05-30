import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";

type PasswordChangeCardProps = {
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  newConfirmPassword: string;
  setNewConfirmPassword: (value: string) => void;
  isChangingPassword: boolean;
  changePasswordMessage: string | null;
  changePasswordError: string | null;
  onChangePassword: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function PasswordChangeCard(props: PasswordChangeCardProps) {
  return (
    <Card className="panel-soft border-[rgba(201,168,76,0.2)] bg-[color-mix(in_srgb,var(--gold)_8%,var(--card-bg))]">
      <CardHeader><CardTitle>Change website password</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={props.onChangePassword}>
          <label className="space-y-1 text-sm"><span className="field-label">Current password</span><TextField required type="password" minLength={8} value={props.currentPassword} onChange={(event) => props.setCurrentPassword(event.target.value)} /></label>
          <label className="space-y-1 text-sm"><span className="field-label">New password</span><TextField required type="password" minLength={8} value={props.newPassword} onChange={(event) => props.setNewPassword(event.target.value)} /></label>
          <label className="space-y-1 text-sm"><span className="field-label">Confirm new password</span><TextField required type="password" minLength={8} value={props.newConfirmPassword} onChange={(event) => props.setNewConfirmPassword(event.target.value)} /></label>
          <div className="flex items-center gap-3 md:col-span-3"><Button type="submit" disabled={props.isChangingPassword} pending={props.isChangingPassword} pendingText="Saving...">Change password</Button>{props.changePasswordMessage ? <p className="status-success text-sm">{props.changePasswordMessage}</p> : null}{props.changePasswordError ? <p className="status-error text-sm">{props.changePasswordError}</p> : null}</div>
        </form>
      </CardContent>
    </Card>
  );
}
