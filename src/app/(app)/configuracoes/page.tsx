import { Clock, MessageCircle, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default function SettingsPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Configuracoes" description="Preferencias do workspace, janelas de contato e protecoes para recuperacao." />

      <section className="grid gap-4 lg:grid-cols-3">
        <SettingsBlock
          icon={<SlidersHorizontal className="h-5 w-5" aria-hidden="true" />}
          title="Workspace"
          description="Identidade operacional usada no painel e em relatorios."
        >
          <label className="grid gap-2 text-sm font-semibold">
            Nome do workspace
            <input className="field" defaultValue="PayFlow Demo" />
          </label>
        </SettingsBlock>

        <SettingsBlock
          icon={<Clock className="h-5 w-5" aria-hidden="true" />}
          title="Janela de envio"
          description="Evita contato fora do horario permitido."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="grid gap-2 text-sm font-semibold">
              Horario inicial
              <input className="field" type="number" min={0} max={23} defaultValue={9} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Horario final
              <input className="field" type="number" min={0} max={23} defaultValue={20} />
            </label>
          </div>
        </SettingsBlock>

        <SettingsBlock
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          title="Seguranca de contato"
          description="Protege o lead e evita insistencia depois de pagamento."
        >
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-white px-3 text-sm font-semibold shadow-inner-line">
            <input type="checkbox" defaultChecked />
            Parar recuperacao ao detectar pagamento aprovado
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-white px-3 text-sm font-semibold shadow-inner-line">
            <input type="checkbox" defaultChecked />
            Respeitar opt-out automaticamente
          </label>
        </SettingsBlock>
      </section>

      <section className="surface p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="section-label">Operacao WhatsApp</p>
            <h2 className="text-lg font-bold">Regras aplicadas em envios e recuperacao</h2>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {["Opt-out respeitado", "Janela de horario ativa", "Pagamento aprovado encerra fluxo"].map((item) => (
            <div key={item} className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold shadow-inner-line">
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SettingsBlock({
  icon,
  title,
  description,
  children
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary">{icon}</div>
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3">{children}</div>
    </section>
  );
}
