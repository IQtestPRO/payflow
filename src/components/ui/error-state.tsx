import { AlertTriangle } from "lucide-react";

export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <div className="data-panel border-red-200 bg-red-50 p-6 text-red-800">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <p className="mt-2 text-sm">{description}</p>
    </div>
  );
}
