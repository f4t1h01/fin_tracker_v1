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
  telegramConnectUrl: string;
};

export function BoundAccountsCard(props: BoundAccountsCardProps) {
  const hasRealTelegramUser = !props.telegramId.startsWith("-");
  const isTelegramLinked = hasRealTelegramUser || Boolean(props.lastTelegramChatId) || props.telegramUsername !== "Not linked yet";

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
          <p>Telegram linked: {isTelegramLinked ? "Yes" : "Not yet"}</p>
          <p>Telegram username: {props.telegramUsername}</p>
          <p>Telegram chat id: {props.lastTelegramChatId ?? "Unavailable"}</p>
          <p>Telegram user id: {hasRealTelegramUser ? props.telegramId : "Unavailable"}</p>
          <p>Workspace code: {props.workspaceCode}</p>
        </div>
        {!isTelegramLinked ? (
          <div className="space-y-3">
            <p className="body-muted text-sm">Telegram mini apps and your normal browser do not share session storage. Use the connect link below to bind this exact website account inside Telegram, or use the widget if you are already in the same browser session.</p>
            <Button variant="outline" asChild>
              <a href={props.telegramConnectUrl} target="_blank" rel="noreferrer">Connect this account in Telegram</a>
            </Button>
            <Button type="button" variant="outline" onClick={() => void props.onLinkCurrentTelegramContext()}>
              Link current Telegram session
            </Button>
            <TelegramLogin onSuccess={props.onTelegramLinked} />
          </div>
        ) : null}
        <Button variant="outline" asChild><a href={props.telegramConnectUrl} target="_blank" rel="noreferrer">Open Telegram WebApp</a></Button>
      </CardContent>
    </Card>
  );
}
