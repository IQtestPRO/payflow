import { cn } from "@/lib/utils";

export function DataTable({
  headers,
  children,
  className
}: {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("data-panel overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
          <thead className="sticky top-0 z-10 border-b border-border/80 bg-slate-50/95 text-[11px] uppercase tracking-normal text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="whitespace-nowrap px-4 py-3 font-extrabold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70 bg-white/[0.94] text-slate-700 [&_td]:align-middle [&_tr]:transition [&_tr:hover]:bg-blue-50/50">{children}</tbody>
        </table>
      </div>
    </div>
  );
}
