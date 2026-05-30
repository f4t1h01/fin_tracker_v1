import { AppLink } from "@/components/navigation/app-link";
import { BrandMark } from "@/components/marketing/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";

type ProfileAuthGatewayProps = {
  authError: string | null;
  loginEmail: string;
  setLoginEmail: (value: string) => void;
  loginPassword: string;
  setLoginPassword: (value: string) => void;
  isSubmittingLogin: boolean;
  loginMessage: string | null;
  loginError: string | null;
  showCreateAccountAction: boolean;
  onSubmitLogin: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  emailCode: string;
  setEmailCode: (value: string) => void;
  isRequestingEmailCode: boolean;
  isSubmittingEmailCode: boolean;
  emailCodeMessage: string | null;
  emailCodeError: string | null;
  onRequestEmailCode: () => Promise<void>;
  onSubmitEmailCode: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  resetEmail: string;
  setResetEmail: (value: string) => void;
  resetCode: string;
  setResetCode: (value: string) => void;
  resetPassword: string;
  setResetPassword: (value: string) => void;
  resetConfirmPassword: string;
  setResetConfirmPassword: (value: string) => void;
  isRequestingPasswordReset: boolean;
  isResettingPassword: boolean;
  resetMessage: string | null;
  resetError: string | null;
  onRequestPasswordReset: () => Promise<void>;
  onConfirmPasswordReset: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  createFirstName: string;
  setCreateFirstName: (value: string) => void;
  createEmail: string;
  setCreateEmail: (value: string) => void;
  createPassword: string;
  setCreatePassword: (value: string) => void;
  createConfirmPassword: string;
  setCreateConfirmPassword: (value: string) => void;
  isCreatingAccount: boolean;
  createAccountMessage: string | null;
  createAccountError: string | null;
  onCreateAccount: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function ProfileAuthGateway(props: ProfileAuthGatewayProps) {
  return (
    <main className="container-shell pb-16 pt-24">
      <header className="soft-rise mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-4">
          <BrandMark href="/" />
          <div>
            <p className="eyebrow-row">Profile access</p>
            <h1 className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(38px,4vw,56px)] font-light leading-[1.08]">Sign in or create your account.</h1>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {props.authError ? (
        <Card className="mb-6 border-red-300/20 bg-red-500/10 dark:border-red-400/30 dark:bg-red-500/10">
          <CardContent className="pt-6">
            <p className="status-error text-sm">{props.authError}</p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="panel-soft">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={props.onSubmitLogin}>
              <label className="space-y-1 text-sm">
                <span className="field-label">Email</span>
                <TextField required type="email" value={props.loginEmail} onChange={(event) => props.setLoginEmail(event.target.value)} placeholder="you@example.com" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="field-label">Password</span>
                <TextField required type="password" value={props.loginPassword} onChange={(event) => props.setLoginPassword(event.target.value)} placeholder="Your password" />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={props.isSubmittingLogin} pending={props.isSubmittingLogin} pendingText="Signing in...">
                  Sign in
                </Button>
                {props.loginMessage ? <p className="status-success text-sm">{props.loginMessage}</p> : null}
                {props.loginError ? <p className="status-error text-sm">{props.loginError}</p> : null}
              </div>
            </form>
            {props.showCreateAccountAction ? <p className="body-muted text-sm">Account not found. Create one below.</p> : null}
          </CardContent>
        </Card>

        <Card className="panel-soft">
          <CardHeader>
            <CardTitle>Create account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={props.onCreateAccount}>
              <label className="space-y-1 text-sm">
                <span className="field-label">Name</span>
                <TextField value={props.createFirstName} onChange={(event) => props.setCreateFirstName(event.target.value)} placeholder="Fatih" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="field-label">Email</span>
                <TextField required type="email" value={props.createEmail} onChange={(event) => props.setCreateEmail(event.target.value)} placeholder="you@example.com" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="field-label">Password</span>
                <TextField required type="password" minLength={8} value={props.createPassword} onChange={(event) => props.setCreatePassword(event.target.value)} placeholder="At least 8 characters" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="field-label">Confirm</span>
                <TextField required type="password" minLength={8} value={props.createConfirmPassword} onChange={(event) => props.setCreateConfirmPassword(event.target.value)} placeholder="Repeat password" />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={props.isCreatingAccount} pending={props.isCreatingAccount} pendingText="Creating...">
                  Create account
                </Button>
                {props.createAccountMessage ? <p className="status-success text-sm">{props.createAccountMessage}</p> : null}
                {props.createAccountError ? <p className="status-error text-sm">{props.createAccountError}</p> : null}
              </div>
            </form>
            <Button variant="outline" asChild>
              <AppLink href="/">Back to overview</AppLink>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="panel-soft">
          <CardHeader><CardTitle>Email code sign in</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <TextField required type="email" value={props.loginEmail} onChange={(event) => props.setLoginEmail(event.target.value)} placeholder="you@example.com" />
              <Button type="button" variant="outline" disabled={props.isRequestingEmailCode || !props.loginEmail.trim()} pending={props.isRequestingEmailCode} pendingText="Sending..." onClick={() => void props.onRequestEmailCode()}>
                Send code
              </Button>
            </div>
            <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={props.onSubmitEmailCode}>
              <TextField required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={props.emailCode} onChange={(event) => props.setEmailCode(event.target.value)} placeholder="6-digit code" />
              <Button type="submit" disabled={props.isSubmittingEmailCode || !props.emailCode.trim()} pending={props.isSubmittingEmailCode} pendingText="Signing in...">
                Sign in with code
              </Button>
            </form>
            {props.emailCodeMessage ? <p className="status-success text-sm">{props.emailCodeMessage}</p> : null}
            {props.emailCodeError ? <p className="status-error text-sm">{props.emailCodeError}</p> : null}
          </CardContent>
        </Card>

        <Card className="panel-soft">
          <CardHeader><CardTitle>Forgot password</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <TextField required type="email" value={props.resetEmail} onChange={(event) => props.setResetEmail(event.target.value)} placeholder="you@example.com" />
              <Button type="button" variant="outline" disabled={props.isRequestingPasswordReset || !props.resetEmail.trim()} pending={props.isRequestingPasswordReset} pendingText="Sending..." onClick={() => void props.onRequestPasswordReset()}>
                Send reset code
              </Button>
            </div>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={props.onConfirmPasswordReset}>
              <TextField required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={props.resetCode} onChange={(event) => props.setResetCode(event.target.value)} placeholder="6-digit code" />
              <TextField required type="password" minLength={8} value={props.resetPassword} onChange={(event) => props.setResetPassword(event.target.value)} placeholder="New password" />
              <TextField required type="password" minLength={8} value={props.resetConfirmPassword} onChange={(event) => props.setResetConfirmPassword(event.target.value)} placeholder="Repeat new password" />
              <Button type="submit" disabled={props.isResettingPassword} pending={props.isResettingPassword} pendingText="Updating...">
                Update password
              </Button>
            </form>
            {props.resetMessage ? <p className="status-success text-sm">{props.resetMessage}</p> : null}
            {props.resetError ? <p className="status-error text-sm">{props.resetError}</p> : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
