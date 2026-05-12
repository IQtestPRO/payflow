import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="surface flex min-h-48 flex-col items-center justify-center p-8 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
