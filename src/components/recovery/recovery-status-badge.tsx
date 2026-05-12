import { StatusBadge } from "@/components/ui/status-badge";

export function RecoveryStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} />;
}
