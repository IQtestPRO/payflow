import type { MessageRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MessageBubble({ message }: { message: MessageRecord }) {
  const outbound = message.direction === "OUTBOUND";
  const internal = message.direction === "INTERNAL";
  const attendantName = outbound ? readAttendantName(message.metadataJson) : null;

  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-md px-4 py-3 text-sm leading-6 shadow-sm md:max-w-[78%]",
          outbound ? "bg-primary text-primary-foreground shadow-blue-900/10" : internal ? "border border-amber-200 bg-amber-50 text-amber-900" : "border border-border bg-white text-foreground"
        )}
      >
        <p>{message.body}</p>
        {attendantName ? (
          <p className={cn("mt-2 text-[11px] font-semibold", outbound ? "text-primary-foreground/80" : "text-muted-foreground")}>
            Atendente {attendantName} respondeu
          </p>
        ) : null}
        <p className={cn("mt-2 text-[11px] tabular-nums", outbound ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - {message.status.toLowerCase()}
        </p>
      </div>
    </div>
  );
}

function readAttendantName(metadataJson: unknown) {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) return null;
  const attendant = (metadataJson as Record<string, unknown>).attendant;
  if (!attendant || typeof attendant !== "object" || Array.isArray(attendant)) return null;
  const name = (attendant as Record<string, unknown>).name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}
