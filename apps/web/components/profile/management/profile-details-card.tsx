import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProfileDetailsCardProps = {
  detailsFirstName: string;
  setDetailsFirstName: (value: string) => void;
  detailsLastName: string;
  setDetailsLastName: (value: string) => void;
  detailsBirthday: string;
  setDetailsBirthday: (value: string) => void;
  telegramUsername: string;
  isSavingDetails: boolean;
  detailsMessage: string | null;
  detailsError: string | null;
  onSaveDetails: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function ProfileDetailsCard(props: ProfileDetailsCardProps) {
  return (
    <Card className="panel-soft">
      <CardHeader>
        <CardTitle>Your details</CardTitle>
        <CardDescription>Keep your profile name and birthday up to date. Telegram username is shown as a linked identity.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={props.onSaveDetails}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm"><span className="field-label">First name</span><input value={props.detailsFirstName} onChange={(event) => props.setDetailsFirstName(event.target.value)} className="form-input" /></label>
            <label className="space-y-1 text-sm"><span className="field-label">Last name</span><input value={props.detailsLastName} onChange={(event) => props.setDetailsLastName(event.target.value)} className="form-input" /></label>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm"><span className="field-label">Birthday</span><DatePicker value={props.detailsBirthday} onChange={(event) => props.setDetailsBirthday(event.target.value)} max="9999-12-31" /></label>
            <label className="space-y-1 text-sm"><span className="field-label">Telegram username</span><input value={props.telegramUsername} readOnly className="form-input opacity-80" /></label>
          </div>
          <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={props.isSavingDetails}>{props.isSavingDetails ? "Saving..." : "Save details"}</Button>{props.detailsMessage ? <p className="status-success text-sm">{props.detailsMessage}</p> : null}{props.detailsError ? <p className="status-error text-sm">{props.detailsError}</p> : null}</div>
        </form>
      </CardContent>
    </Card>
  );
}
