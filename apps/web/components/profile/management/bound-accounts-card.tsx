import { TelegramLogin } from "@/components/telegram-login";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BoundAccountsCardProps = {
  email: string | null;
  hasPassword: boolean;
  lastTelegramChatId: string | null;
  telegramUsername: string;
  telegramId: string;
  workspaceCode: string;
  onTelegramLinked: () => Promise<void>;
  onLinkCurrentTelegramContext: () => Promise<boolean>;
};

export function BoundAccountsCard(props: BoundAccountsCardProps) {
  return (
    <Card className="panel-soft">
      <CardHeader>
        <CardTitle>Bound accounts</CardTitle>
        <CardDescription>Review your saved website and Telegram connections.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="detail-box space-y-2 text-sm">
          <p>Email account: {props.email ?? "Not set yet"}</p>
          <p>Website password: {props.hasPassword ? "Configured" : "Not configured"}</p>
          <p>Telegram linked: {props.lastTelegramChatId ? "Yes" : "Not yet"}</p>
          <p>Telegram username: {props.telegramUsername}</p>
          <p>Telegram chat id: {props.lastTelegramChatId ?? "Unavailable"}</p>
          <p>Telegram user id: {props.lastTelegramChatId ? props.telegramId : "Unavailable"}</p>
          <p>Workspace code: {props.workspaceCode}</p>
        </div>
        {!props.lastTelegramChatId ? (
          <div className="space-y-3">
            <p className="body-muted text-sm">If you opened this page from Telegram, link that current Telegram session first. Otherwise use the official Telegram sign-in below while staying signed into this website account.</p>
            <Button type="button" variant="outline" onClick={() => void props.onLinkCurrentTelegramContext()}>
              Link current Telegram session
            </Button>
            <TelegramLogin onSuccess={props.onTelegramLinked} />
          </div>
        ) : null}
        <Button variant="outline" asChild><a href="https://t.me/coup_fin_trackerbot" target="_blank" rel="noreferrer">Open Telegram WebApp</a></Button>
      </CardContent>
    </Card>
  );
}
