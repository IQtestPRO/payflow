import { PayFlowLogo } from "@/components/brand/payflow-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh bg-transparent lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
      <section className="hidden border-l border-white/10 bg-payflow-sidebar p-10 shadow-premium lg:flex lg:flex-col lg:justify-between">
        <div>
          <PayFlowLogo variant="dark" size="lg" showTagline />
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/75">
            Uma central operacional para conversar, recuperar pagamentos e enxergar o impacto real das campanhas.
          </p>
        </div>
        <div className="grid gap-3">
          {["WhatsApp mock pronto", "Webhooks para pagamentos", "Campanhas e UTM no mesmo painel"].map((item) => (
            <div key={item} className="rounded-lg border border-white/10 bg-white/10 p-4 text-sm font-semibold text-white">
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
