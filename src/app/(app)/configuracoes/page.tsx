import { PageHeader } from "@/components/ui/page-header";

export default function SettingsPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Configurações" description="Preferências básicas do workspace, papéis e regras de contato." />
      <section className="surface grid gap-4 p-5 lg:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold">
          Nome do workspace
          <input className="field" defaultValue="PayFlow Demo" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Horário inicial de envio
          <input className="field" type="number" min={0} max={23} defaultValue={9} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Horário final de envio
          <input className="field" type="number" min={0} max={23} defaultValue={20} />
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-white px-3 text-sm font-semibold">
          <input type="checkbox" defaultChecked />
          Parar recuperação ao detectar pagamento aprovado
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-white px-3 text-sm font-semibold">
          <input type="checkbox" defaultChecked />
          Respeitar opt-out automaticamente
        </label>
      </section>
    </div>
  );
}
