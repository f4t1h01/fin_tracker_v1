import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PasswordSetupCardProps = {
  setupEmail: string;
  setSetupEmail: (value: string) => void;
  setupPassword: string;
  setSetupPassword: (value: string) => void;
  setupConfirmPassword: string;
  setSetupConfirmPassword: (value: string) => void;
  isSettingPassword: boolean;
  setupMessage: string | null;
  setupError: string | null;
  onSetupPassword: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function PasswordSetupCard(props: PasswordSetupCardProps) {
  return (
    <Card className="panel-soft border-[rgba(201,168,76,0.2)] bg-[color-mix(in_srgb,var(--gold)_8%,var(--card-bg))]">
      <CardHeader><CardTitle>Save email login</CardTitle><CardDescription>Finish this once if your account started elsewhere and still needs a browser password.</CardDescription></CardHeader>
      <CardContent>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={props.onSetupPassword}>
          <label className="space-y-1 text-sm"><span className="field-label">Email</span><input required type="email" value={props.setupEmail} onChange={(event) => props.setSetupEmail(event.target.value)} className="form-input" /></label>
          <label className="space-y-1 text-sm"><span className="field-label">Password</span><input required type="password" minLength={8} value={props.setupPassword} onChange={(event) => props.setSetupPassword(event.target.value)} className="form-input" /></label>
          <label className="space-y-1 text-sm"><span className="field-label">Confirm password</span><input required type="password" minLength={8} value={props.setupConfirmPassword} onChange={(event) => props.setSetupConfirmPassword(event.target.value)} className="form-input" /></label>
          <div className="flex items-center gap-3 md:col-span-3"><Button type="submit" disabled={props.isSettingPassword}>{props.isSettingPassword ? "Saving..." : "Save email login"}</Button>{props.setupMessage ? <p className="status-success text-sm">{props.setupMessage}</p> : null}{props.setupError ? <p className="status-error text-sm">{props.setupError}</p> : null}</div>
        </form>
      </CardContent>
    </Card>
  );
}
