import { IntegrationLogo, integrationBrands } from "@/components/integrations/integration-brand";
import { PayFlowLogo } from "@/components/brand/payflow-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh bg-transparent lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
      <section className="hidden border-l border-white/10 bg-payflow-sidebar p-10 shadow-premium lg:flex lg:flex-col lg:justify-between">
        <div>
          <PayFlowLogo variant="dark" size="lg" showTagline />
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/75">
            Uma central operacional para atendimento, checkout, rastreamento e recuperacao em um unico painel.
          </p>
          <div className="mt-8 grid grid-cols-4 gap-3">
            {(["WHATSAPP", "UMBRELLA", "UTMIFY", "META_ADS"] as const).map((provider) => {
              const brand = integrationBrands[provider];
              return (
                <div key={provider} className="rounded-xl border border-white/10 bg-white/[0.08] p-3">
                  <IntegrationLogo src={brand.asset} alt={brand.assetAlt} icon={brand.fallbackIcon} className="h-11 w-11 rounded-lg" imageClassName="h-6 w-6" />
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid gap-3">
          {["Conecte WhatsApp e responda pela inbox", "Gere pagamentos pela UmbrellaPag", "Rastreie UTMs, campanhas e recuperacoes"].map((item) => (
            <div key={item} className="rounded-xl border border-white/10 bg-white/10 p-4 text-sm font-semibold text-white shadow-inner">
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
