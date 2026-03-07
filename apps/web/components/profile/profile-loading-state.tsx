import { Loader2 } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProfileLoadingStateProps = {
  title: string;
  description: string;
};

export function ProfileLoadingState({ title, description }: ProfileLoadingStateProps) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-5 py-16 sm:px-8">
      <Card className="panel-soft w-full max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="size-5 animate-spin text-pop" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
