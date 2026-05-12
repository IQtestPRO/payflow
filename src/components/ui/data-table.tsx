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
    <div className={cn("surface overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="border-b border-border/80 bg-gradient-to-r from-muted/90 to-white text-xs uppercase tracking-normal text-muted-foreground">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3.5 font-bold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70 bg-white/80 [&_tr]:transition [&_tr:hover]:bg-blue-50/45">{children}</tbody>
        </table>
      </div>
    </div>
  );
}
