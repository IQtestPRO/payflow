export function LoadingState({ label = "Carregando" }: { label?: string }) {
  return (
    <div className="surface flex min-h-32 items-center justify-center p-6 text-sm font-medium text-muted-foreground">
      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
      {label}
    </div>
  );
}
