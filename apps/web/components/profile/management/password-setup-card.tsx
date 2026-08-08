import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";

type PasswordSetupCardProps = {
  setupEmail: string;
  setSetupEmail: (value: string) => void;
  setupCode: string;
  setSetupCode: (value: string) => void;
  hasRequestedSetupCode: boolean;
  isSendingSetupCode: boolean;
  onRequestSetupCode: () => Promise<void>;
  setupPassword: string;
  setSetupPassword: (value: string) => void;
  setupConfirmPassword: string;
  setSetupConfirmPassword: (value: string) => void;
  isSettingPassword: boolean;
  setupMessage: string | null;
  setupError: string | null;
  onSetupPassword: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

/**
 * Email is confirmed with a one-time code before it is attached to the account,
 * so an account cannot claim an address it does not own.
 */
export function PasswordSetupCard(props: PasswordSetupCardProps) {
  return (
    <Card className="panel-soft border-[rgba(201,168,76,0.2)] bg-[color-mix(in_srgb,var(--gold)_8%,var(--card-bg))]">
      <CardHeader><CardTitle>Save email login</CardTitle></CardHeader>
      <CardContent>
        {!props.hasRequestedSetupCode ? (
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="field-label">Email</span>
              <TextField
                required
                type="email"
                autoComplete="email"
                value={props.setupEmail}
                onChange={(event) => props.setSetupEmail(event.target.value)}
              />
            </label>
            <div className="flex items-end gap-3 md:col-span-3">
              <Button
                type="button"
                disabled={props.isSendingSetupCode || !props.setupEmail.trim()}
                pending={props.isSendingSetupCode}
                pendingText="Sending..."
                onClick={() => void props.onRequestSetupCode()}
              >
                Send confirmation code
              </Button>
              {props.setupMessage ? <p className="status-success text-sm">{props.setupMessage}</p> : null}
              {props.setupError ? <p className="status-error text-sm">{props.setupError}</p> : null}
            </div>
          </div>
        ) : (
          <form className="grid gap-3 md:grid-cols-3" onSubmit={props.onSetupPassword}>
            <label className="space-y-1 text-sm">
              <span className="field-label">Confirmation code</span>
              <TextField
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                minLength={6}
                maxLength={6}
                value={props.setupCode}
                onChange={(event) => props.setSetupCode(event.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="field-label">Password</span>
              <TextField
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={props.setupPassword}
                onChange={(event) => props.setSetupPassword(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="field-label">Confirm password</span>
              <TextField
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={props.setupConfirmPassword}
                onChange={(event) => props.setSetupConfirmPassword(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 md:col-span-3">
              <Button type="submit" disabled={props.isSettingPassword} pending={props.isSettingPassword} pendingText="Saving...">
                Save email login
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={props.isSendingSetupCode}
                onClick={() => void props.onRequestSetupCode()}
              >
                Resend code
              </Button>
              {props.setupMessage ? <p className="status-success text-sm">{props.setupMessage}</p> : null}
              {props.setupError ? <p className="status-error text-sm">{props.setupError}</p> : null}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
