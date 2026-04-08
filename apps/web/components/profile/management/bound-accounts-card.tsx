import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BoundAccountsCardProps = {
  email: string | null;
  hasPassword: boolean;
  telegramUsername: string;
  telegramId: string;
  telegramDisplayName: string;
  telegramPhone: string | null;
  telegramConnectUrl: string;
};

export function BoundAccountsCard(props: BoundAccountsCardProps) {
  const hasRealTelegramUser = !props.telegramId.startsWith("-");
  const isTelegramLinked = hasRealTelegramUser || props.telegramUsername !== "Not linked yet" || Boolean(props.telegramPhone) || props.telegramDisplayName !== "Not linked yet";
  const actionLabel = isTelegramLinked ? "Open Telegram WebApp" : "Connect this account in Telegram";

  return (
    <Card className="panel-soft">
      <CardHeader>
        <CardTitle>Bound accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="detail-box space-y-2 text-sm">
          <p>Email account: {props.email ?? "Not set yet"}</p>
          <p>Website password: {props.hasPassword ? "Configured" : "Not configured"}</p>
          <p>Telegram linked: {isTelegramLinked ? "Yes" : "Not yet"}</p>
          <p>Telegram name: {props.telegramDisplayName}</p>
          <p>Telegram username: {props.telegramUsername}</p>
          <p>Telegram user id: {hasRealTelegramUser ? props.telegramId : "Unavailable"}</p>
          <p>Telegram phone: {props.telegramPhone ?? "Not shared yet"}</p>
        </div>
        <Button variant="outline" asChild><a href={props.telegramConnectUrl} target="_blank" rel="noreferrer">{actionLabel}</a></Button>
      </CardContent>
    </Card>
  );
}
