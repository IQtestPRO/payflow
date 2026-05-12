import type { MessageRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MessageBubble({ message }: { message: MessageRecord }) {
  const outbound = message.direction === "OUTBOUND";
  const internal = message.direction === "INTERNAL";

  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-md px-4 py-3 text-sm leading-6 shadow-sm md:max-w-[78%]",
          outbound ? "bg-primary text-primary-foreground shadow-blue-900/10" : internal ? "border border-amber-200 bg-amber-50 text-amber-900" : "border border-border bg-white text-foreground"
        )}
      >
        <p>{message.body}</p>
        <p className={cn("mt-2 text-[11px] tabular-nums", outbound ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {message.status.toLowerCase()}
        </p>
      </div>
    </div>
  );
}
