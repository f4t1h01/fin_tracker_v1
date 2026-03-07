import { BrandMark } from "@/components/marketing/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
            <h1 className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(38px,4vw,56px)] font-light leading-[1.08]">Sign in or create your account here.</h1>
            <p className="body-muted mt-3 max-w-2xl text-sm">Use email first in the browser. Telegram can be linked later for chat-based access.</p>
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
            <CardTitle>Sign in with email</CardTitle>
            <CardDescription>Use this when you already created your Duet website account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={props.onSubmitLogin}>
              <label className="space-y-1 text-sm"><span className="field-label">Email</span><input required type="email" value={props.loginEmail} onChange={(event) => props.setLoginEmail(event.target.value)} placeholder="you@example.com" className="form-input" /></label>
              <label className="space-y-1 text-sm"><span className="field-label">Password</span><input required type="password" value={props.loginPassword} onChange={(event) => props.setLoginPassword(event.target.value)} placeholder="Your password" className="form-input" /></label>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={props.isSubmittingLogin}>{props.isSubmittingLogin ? "Signing in..." : "Sign in"}</Button>
                {props.loginMessage ? <p className="status-success text-sm">{props.loginMessage}</p> : null}
                {props.loginError ? <p className="status-error text-sm">{props.loginError}</p> : null}
              </div>
            </form>
            {props.showCreateAccountAction ? <p className="body-muted text-sm">Account was not found. Please create it in the browser.</p> : null}
          </CardContent>
        </Card>

        <Card className="panel-soft">
          <CardHeader>
            <CardTitle>Create account in browser</CardTitle>
            <CardDescription>Create your Duet account directly on the website.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={props.onCreateAccount}>
              <label className="space-y-1 text-sm"><span className="field-label">Name (optional)</span><input type="text" value={props.createFirstName} onChange={(event) => props.setCreateFirstName(event.target.value)} placeholder="Fatih" className="form-input" /></label>
              <label className="space-y-1 text-sm"><span className="field-label">Email</span><input required type="email" value={props.createEmail} onChange={(event) => props.setCreateEmail(event.target.value)} placeholder="you@example.com" className="form-input" /></label>
              <label className="space-y-1 text-sm"><span className="field-label">Password</span><input required type="password" minLength={8} value={props.createPassword} onChange={(event) => props.setCreatePassword(event.target.value)} placeholder="At least 8 characters" className="form-input" /></label>
              <label className="space-y-1 text-sm"><span className="field-label">Confirm password</span><input required type="password" minLength={8} value={props.createConfirmPassword} onChange={(event) => props.setCreateConfirmPassword(event.target.value)} placeholder="Repeat password" className="form-input" /></label>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={props.isCreatingAccount}>{props.isCreatingAccount ? "Creating..." : "Create account"}</Button>
                {props.createAccountMessage ? <p className="status-success text-sm">{props.createAccountMessage}</p> : null}
                {props.createAccountError ? <p className="status-error text-sm">{props.createAccountError}</p> : null}
              </div>
            </form>
            <div className="detail-box space-y-2 text-sm">
              <p>1. Create your account here in the browser.</p>
              <p>2. Open your profile workspace right away.</p>
              <p>3. Link Telegram later if you want in-chat access.</p>
            </div>
            <Button variant="outline" asChild><a href="/">Back to overview</a></Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
