export function LoadingState({ label = "Carregando" }: { label?: string }) {
  return (
    <div className="data-panel flex min-h-32 items-center justify-center p-6 text-sm font-medium text-muted-foreground">
      <span className="skeleton mr-3 h-5 w-24" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
