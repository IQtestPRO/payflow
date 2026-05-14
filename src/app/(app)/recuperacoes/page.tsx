import { Clock3, MessageCircle, QrCode, RefreshCcw } from "lucide-react";
import { IntegrationLogo, integrationBrands } from "@/components/integrations/integration-brand";
import { RecoveryTable } from "@/components/recovery/recovery-table";
import { PageHeader } from "@/components/ui/page-header";
import { listPayments, listRecoveryAttempts } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

const recoveryChecklist = [
  "Recuperacao manual por WhatsApp usando Pix copia e cola, QR Code ou link de pagamento.",
  "Janelas sugeridas para aprovar depois: 5 minutos, 30 minutos, 2 horas e 24 horas.",
  "Templates por etapa com revisao humana antes de qualquer automacao real.",
  "Status operacional: pendente, em contato, recuperado e perdido.",
  "Associacao com gateway, pagamento, conversa e atendente responsavel.",
  "Cancelamento automatico de tentativas futuras quando o gateway confirmar pagamento."
];

export default async function RecoveriesPage() {
  const user = await getCurrentUser();
  const [payments, attempts] = await Promise.all([
    listPayments(user?.workspaceId),
    listRecoveryAttempts(user?.workspaceId)
  ]);
  const whatsapp = integrationBrands.WHATSAPP;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Recuperacoes"
        description="Area limpa para estruturar recuperacao real sem dados ficticios. Automacoes novas aguardam aprovacao."
        actions={<IntegrationLogo src={whatsapp.asset} alt={whatsapp.assetAlt} icon={whatsapp.fallbackIcon} />}
      />

      <section className="data-panel overflow-hidden">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <p className="section-label">Recuperacao manual aprovada</p>
            <h2 className="mt-1 text-xl font-extrabold">Envie Pix, QR Code ou link sem automacao nova</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Pagamentos reais pendentes aparecem abaixo. O operador escolhe a acao e o PayFlow registra tentativa, conversa e atendente responsavel.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SignalCard icon={MessageCircle} title="WhatsApp" text="Canal principal para contato e historico." />
            <SignalCard icon={QrCode} title="Pix" text="Envio separado de QR Code e copia e cola." />
            <SignalCard icon={Clock3} title="Tempo" text="Etapas por atraso desde a geracao da cobranca." />
          </div>
        </div>
      </section>

      <section className="data-panel p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-label">Fila manual</p>
            <h2 className="mt-1 text-xl font-extrabold">Pagamentos pendentes para recuperar</h2>
          </div>
          <span className="inline-flex min-h-10 items-center rounded-md border border-blue-100 bg-blue-50 px-3 text-xs font-extrabold uppercase text-primary">
            {payments.length} pagamento(s) real(is)
          </span>
        </div>
        <RecoveryTable payments={payments} initialAttempts={attempts} />
      </section>

      <section className="data-panel p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-label">Proximas evolucoes</p>
            <h2 className="mt-1 text-xl font-extrabold">Checklist para recuperacao automatizada futura</h2>
          </div>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 text-xs font-extrabold uppercase tracking-normal text-amber-700">
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Sem automacao nova
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {recoveryChecklist.map((item) => (
            <div key={item} className="rounded-lg border border-border/80 bg-white p-4 shadow-inner-line">
              <p className="text-sm leading-6 text-muted-foreground">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SignalCard({ icon: Icon, title, text }: { icon: typeof MessageCircle; title: string; text: string }) {
  return (
    <article className="rounded-lg border border-border/80 bg-white p-4 shadow-inner-line">
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-3 font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
    </article>
  );
}
