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
  const actionLabel = isTelegramLinked ? "Open Telegram WebApp" : "Connect this account in Telegram";

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
          <p className="body-muted text-sm">Telegram mini apps and your normal browser do not share session storage. Use the button below to open Telegram with a signed link for this exact website account.</p>
        ) : null}
        <Button variant="outline" asChild><a href={props.telegramConnectUrl} target="_blank" rel="noreferrer">{actionLabel}</a></Button>
      </CardContent>
    </Card>
  );
}
