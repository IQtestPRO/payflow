"use client";

import { AlertTriangle, CheckCircle2, Copy, CreditCard, KeyRound, MapPin, Play, RefreshCcw, ShieldCheck, Webhook } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { IntegrationLogo, integrationBrands } from "@/components/integrations/integration-brand";
import { cn } from "@/lib/utils";

type UmbrellaStatus = {
  provider: string;
  readyForRealApi: boolean;
  hasApiBaseUrl: boolean;
  hasApiKey: boolean;
  hasUserAgent: boolean;
  webhookSecretConfigured: boolean;
  apiBaseUrl: string;
  webhookUrl: string;
};

type ActionNotice = {
  tone: "success" | "error" | "info";
  text: string;
};

type LeadForm = {
  name: string;
  phone: string;
  email: string;
  document: string;
  zipCode: string;
  street: string;
  streetNumber: string;
  neighborhood: string;
  complement: string;
  city: string;
  state: string;
};

type PaymentForm = {
  amount: string;
  itemTitle: string;
  paymentMethod: "PIX" | "BOLETO";
};

type SimulateResponse = {
  ok?: boolean;
  error?: string;
  payload?: {
    data?: {
      id?: string;
      status?: string;
    };
  };
  result?: {
    duplicated?: boolean;
    payment?: {
      id: string;
      status: string;
      amount: number;
      providerPaymentId: string;
    };
    recovery?: unknown;
  };
};

type CreatePaymentResponse = SimulateResponse & {
  transaction?: {
    id?: string | null;
    status?: string | null;
    paymentMethod?: string | null;
    secureUrl?: string | null;
    payUrl?: string | null;
    webUrl?: string | null;
    appUrl?: string | null;
    qrCode?: string | null;
    boletoUrl?: string | null;
  };
};

type ViaCepResponse = {
  erro?: boolean;
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

const steps = [
  {
    title: "Chave de API",
    description: "Ativa consulta real e teste de credencial Umbrella.",
    icon: KeyRound
  },
  {
    title: "Webhook de pagamento",
    description: "Recebe Pix gerado, pago, expirado e recusado.",
    icon: Webhook
  },
  {
    title: "Recuperacao",
    description: "Pagamento pendente agenda tentativa automaticamente.",
    icon: RefreshCcw
  },
  {
    title: "Conversao",
    description: "Pagamento pago cancela/fecha tentativas pendentes.",
    icon: ShieldCheck
  }
];

export function UmbrellaQuickstart() {
  const [status, setStatus] = useState<UmbrellaStatus | null>(null);
  const [notice, setNotice] = useState<ActionNotice | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lastSimulation, setLastSimulation] = useState<SimulateResponse | null>(null);
  const [realPayment, setRealPayment] = useState<CreatePaymentResponse | null>(null);
  const [lead, setLead] = useState<LeadForm>({
    name: "",
    phone: "",
    email: "",
    document: "",
    zipCode: "",
    street: "",
    streetNumber: "",
    neighborhood: "",
    complement: "",
    city: "",
    state: ""
  });
  const [payment, setPayment] = useState<PaymentForm>({
    amount: "297",
    itemTitle: "Kit Funil WhatsApp",
    paymentMethod: "PIX"
  });

  useEffect(() => {
    fetch("/api/integrations/umbrella/status")
      .then((response) => response.json())
      .then(setStatus)
      .catch(() => setNotice({ tone: "error", text: "Nao foi possivel ler o status da Umbrella." }));
  }, []);

  const completion = useMemo(() => {
    const checks = [status?.hasApiBaseUrl, status?.hasApiKey, status?.hasUserAgent, Boolean(status?.webhookUrl), status?.webhookSecretConfigured];
    return checks.filter(Boolean).length;
  }, [status]);

  const leadReady =
    lead.name.trim().length >= 2 &&
    lead.phone.replace(/\D/g, "").length >= 10 &&
    lead.email.includes("@") &&
    [11, 14].includes(lead.document.replace(/\D/g, "").length);
  const addressReady =
    lead.zipCode.replace(/\D/g, "").length === 8 &&
    lead.street.trim().length >= 2 &&
    lead.streetNumber.trim().length >= 1 &&
    lead.neighborhood.trim().length >= 2 &&
    lead.city.trim().length >= 2 &&
    /^[A-Za-z]{2}$/.test(lead.state.trim());
  const paymentReady = Number(payment.amount) > 0 && payment.itemTitle.trim().length >= 2;
  const realPaymentReady = Boolean(status?.readyForRealApi) && leadReady && addressReady && paymentReady;

  async function copy(value?: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setNotice({ tone: "success", text: "Copiado para a area de transferencia." });
  }

  async function testConnection() {
    setLoadingAction("test");
    setNotice(null);
    const response = await fetch("/api/integrations/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "UMBRELLA" })
    });
    const json = (await response.json()) as { ok?: boolean; status?: string; error?: string };
    setLoadingAction(null);
    setNotice({
      tone: response.ok && json.ok ? "success" : "error",
      text: json.status ?? json.error ?? "Teste concluido."
    });
  }

  async function lookupZipCode() {
    const zipCode = lead.zipCode.replace(/\D/g, "");
    if (zipCode.length !== 8) {
      setNotice({ tone: "error", text: "Informe um CEP valido com 8 numeros para buscar o endereco." });
      return;
    }

    setLoadingAction("cep");
    setNotice(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
      const json = (await response.json()) as ViaCepResponse;

      if (!response.ok || json.erro) {
        setNotice({ tone: "error", text: "CEP nao encontrado. Confira o numero e tente novamente." });
        return;
      }

      setLead((current) => ({
        ...current,
        zipCode,
        street: json.logradouro || current.street,
        neighborhood: json.bairro || current.neighborhood,
        city: json.localidade || current.city,
        state: json.uf || current.state,
        complement: current.complement || json.complemento || ""
      }));
      setNotice({ tone: "success", text: `Endereco preenchido pelo CEP ${json.cep ?? zipCode}. Confira numero e complemento antes de gerar o pagamento.` });
    } catch {
      setNotice({ tone: "error", text: "Nao foi possivel consultar o CEP agora. Preencha o endereco manualmente." });
    } finally {
      setLoadingAction(null);
    }
  }

  async function simulate(type: "pending" | "paid" | "failed" | "expired") {
    if (!leadReady) {
      setNotice({ tone: "error", text: "Preencha nome, telefone, email e CPF/CNPJ reais do lead antes de testar a Umbrella." });
      return;
    }

    setLoadingAction(type);
    setNotice(null);
    const previousPaymentId = lastSimulation?.result?.payment?.providerPaymentId;
    const leadPayload = {
      name: lead.name.trim(),
      phone: lead.phone.replace(/\D/g, ""),
      email: lead.email.trim(),
      document: lead.document.replace(/\D/g, "")
    };
    const response = await fetch("/api/integrations/umbrella/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(type === "pending" || !previousPaymentId ? { type, lead: leadPayload } : { type, lead: leadPayload, externalId: previousPaymentId })
    });
    const json = (await response.json()) as SimulateResponse;
    setLastSimulation(json);
    setLoadingAction(null);
    setNotice({
      tone: response.ok && json.ok ? "success" : "error",
      text: response.ok && json.ok ? simulationMessage(type, json) : json.error ?? "Falha na simulacao Umbrella."
    });
  }

  async function createRealPayment() {
    if (!realPaymentReady) {
      setNotice({ tone: "error", text: "Preencha valor, produto, dados reais do lead e endereco antes de gerar pagamento na Umbrella." });
      return;
    }

    setLoadingAction("create-payment");
    setNotice(null);
    const response = await fetch("/api/integrations/umbrella/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(payment.amount),
        itemTitle: payment.itemTitle.trim(),
        paymentMethod: payment.paymentMethod,
        lead: {
          name: lead.name.trim(),
          phone: lead.phone.replace(/\D/g, ""),
          email: lead.email.trim(),
          document: lead.document.replace(/\D/g, ""),
          address: {
            zipCode: lead.zipCode.replace(/\D/g, ""),
            street: lead.street.trim(),
            streetNumber: lead.streetNumber.trim(),
            neighborhood: lead.neighborhood.trim(),
            complement: lead.complement.trim(),
            city: lead.city.trim(),
            state: lead.state.trim().toUpperCase(),
            country: "BR"
          }
        }
      })
    });
    const json = (await response.json()) as CreatePaymentResponse;
    setRealPayment(json);
    if (json.result?.payment) setLastSimulation(json);
    setLoadingAction(null);
    setNotice({
      tone: response.ok && json.ok ? "success" : "error",
      text: response.ok && json.ok ? "Pagamento real criado na Umbrella e registrado no PayFlow." : json.error ?? "Falha ao gerar pagamento Umbrella."
    });
  }

  const envBlock = `UMBRELLA_API_BASE_URL=${status?.apiBaseUrl || "https://api.umbrellapag.com.br"}
UMBRELLA_API_KEY=<sua-chave-umbrella>
UMBRELLA_USER_AGENT=UMBRELLAB2B/1.0
UMBRELLA_WEBHOOK_SECRET=${status?.webhookSecretConfigured ? "<configurado-na-vercel>" : "<secret-obrigatorio-em-producao>"}
APP_URL=https://pay-flow.shop`;

  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-lg border border-white/10 bg-payflow-sidebar text-white shadow-premium">
        <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="p-5 md:p-6">
            <div className="flex items-center gap-3">
              <IntegrationLogo
                src={integrationBrands.UMBRELLA.asset}
                alt={integrationBrands.UMBRELLA.assetAlt}
                icon={integrationBrands.UMBRELLA.fallbackIcon}
                className="h-12 w-12"
              />
              <div className="inline-flex items-center gap-2 rounded-md border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs font-bold text-brand-cyan">
                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                UmbrellaPag agora
              </div>
            </div>
            <h2 className="mt-4 max-w-3xl text-2xl font-bold md:text-3xl">Pagamentos alimentando recuperacao</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">
              Este bloco valida credenciais, mostra o callback oficial e testa eventos usando dados reais do lead, do mesmo jeito que a Umbrella exige para gerar pagamento.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn min-h-10 border border-white/10 bg-white text-brand-navy hover:bg-white/90" type="button" onClick={() => copy(status?.webhookUrl)}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copiar webhook
              </button>
              <a className="btn min-h-10 border border-white/10 bg-white/10 text-white hover:bg-white/20" href="/pagamentos">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                Ver pagamentos
              </a>
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/5 p-5 md:p-6 lg:border-l lg:border-t-0">
            <p className="text-sm font-semibold text-white/70">Prontidao Umbrella</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold tabular-nums">{completion}/5</span>
              <span className="pb-1 text-sm text-white/60">itens configurados</span>
            </div>
            <div className="mt-5 grid gap-2">
              <ConnectionRow label="URL da API" ready={Boolean(status?.hasApiBaseUrl)} />
              <ConnectionRow label="API key" ready={Boolean(status?.hasApiKey)} />
              <ConnectionRow label="User-Agent" ready={Boolean(status?.hasUserAgent)} />
              <ConnectionRow label="Webhook publico" ready={Boolean(status?.webhookUrl)} />
              <ConnectionRow label="Secret HMAC" ready={Boolean(status?.webhookSecretConfigured)} optional />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_430px]">
        <section className="data-panel p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold">Ativacao Umbrella</h3>
              <p className="mt-1 text-sm text-muted-foreground">O caminho minimo para pagamentos entrarem no PayFlow.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Lead real obrigatorio
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-lg border border-border/80 bg-white/[0.96] p-4 shadow-inner-line transition duration-200 hover:-translate-y-0.5 hover:border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-navy text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-normal text-primary">Passo {index + 1}</p>
                      <h4 className="mt-1 font-semibold">{step.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="data-panel p-5">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="text-lg font-bold">Webhook oficial</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Use esta URL no painel da UmbrellaPag como postback/callback de pagamentos.</p>
          <CopyField label="Callback URL" value={status?.webhookUrl ?? ""} onCopy={copy} />
          <div className="mt-4 grid gap-2">
            <button className="btn-secondary w-full" type="button" onClick={testConnection} disabled={loadingAction === "test"}>
              {loadingAction === "test" ? <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
              {loadingAction === "test" ? "Testando..." : "Testar credenciais"}
            </button>
          </div>
          {notice ? <NoticeCard notice={notice} /> : null}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="data-panel p-5">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="text-lg font-bold">Pagamento com lead real</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            A Umbrella nao gera pagamento com dados ficticios. Informe lead, documento, endereco, valor e item antes de chamar a API real.
          </p>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-[1fr_150px_150px]">
              <label className="grid gap-2 text-sm font-semibold">
                Item
                <input className="field" value={payment.itemTitle} onChange={(event) => setPaymentField(setPayment, "itemTitle", event.target.value)} placeholder="Nome do produto/oferta" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Valor
                <input className="field" value={payment.amount} onChange={(event) => setPaymentField(setPayment, "amount", event.target.value)} placeholder="297" inputMode="decimal" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Metodo
                <select className="field" value={payment.paymentMethod} onChange={(event) => setPaymentField(setPayment, "paymentMethod", event.target.value as PaymentForm["paymentMethod"])}>
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">Boleto</option>
                </select>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Nome real do lead
              <input className="field" value={lead.name} onChange={(event) => setLeadField(setLead, "name", event.target.value)} placeholder="Nome completo" autoComplete="name" />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Telefone com DDI
                <input className="field" value={lead.phone} onChange={(event) => setLeadField(setLead, "phone", event.target.value)} placeholder="5511999999999" inputMode="tel" autoComplete="tel" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Email real
                <input className="field" value={lead.email} onChange={(event) => setLeadField(setLead, "email", event.target.value)} placeholder="lead@email.com" type="email" autoComplete="email" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              CPF/CNPJ real
              <input className="field" value={lead.document} onChange={(event) => setLeadField(setLead, "document", event.target.value)} placeholder="Somente numeros" inputMode="numeric" />
            </label>
            <div className="grid gap-3 md:grid-cols-[minmax(180px,220px)_1fr_110px]">
              <label className="grid gap-2 text-sm font-semibold">
                CEP
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input className="field" value={lead.zipCode} onChange={(event) => setLeadField(setLead, "zipCode", event.target.value)} placeholder="01000000" inputMode="numeric" />
                  <button className="btn-secondary min-h-11 px-3" type="button" onClick={lookupZipCode} disabled={loadingAction === "cep"}>
                    {loadingAction === "cep" ? <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MapPin className="h-4 w-4" aria-hidden="true" />}
                    <span className="sr-only sm:not-sr-only">{loadingAction === "cep" ? "Buscando" : "Buscar"}</span>
                  </button>
                </div>
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Rua
                <input className="field" value={lead.street} onChange={(event) => setLeadField(setLead, "street", event.target.value)} placeholder="Rua/Avenida" autoComplete="address-line1" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Numero
                <input className="field" value={lead.streetNumber} onChange={(event) => setLeadField(setLead, "streetNumber", event.target.value)} placeholder="123" autoComplete="address-line2" />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_70px]">
              <label className="grid gap-2 text-sm font-semibold">
                Bairro
                <input className="field" value={lead.neighborhood} onChange={(event) => setLeadField(setLead, "neighborhood", event.target.value)} placeholder="Bairro" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Cidade
                <input className="field" value={lead.city} onChange={(event) => setLeadField(setLead, "city", event.target.value)} placeholder="Cidade" autoComplete="address-level2" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                UF
                <input className="field uppercase" value={lead.state} onChange={(event) => setLeadField(setLead, "state", event.target.value)} placeholder="SP" maxLength={2} autoComplete="address-level1" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Complemento
              <input className="field" value={lead.complement} onChange={(event) => setLeadField(setLead, "complement", event.target.value)} placeholder="Apto, sala ou referencia" />
            </label>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button className="btn-primary sm:col-span-2" type="button" disabled={loadingAction === "create-payment" || !realPaymentReady} onClick={createRealPayment}>
              {loadingAction === "create-payment" ? <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
              {loadingAction === "create-payment" ? "Gerando..." : "Gerar pagamento real"}
            </button>
            <ActionButton loading={loadingAction === "pending"} disabled={!leadReady} onClick={() => simulate("pending")}>
              Registrar pendente
            </ActionButton>
            <ActionButton loading={loadingAction === "paid"} disabled={!leadReady} onClick={() => simulate("paid")}>
              Registrar pago
            </ActionButton>
            <ActionButton loading={loadingAction === "failed"} disabled={!leadReady} onClick={() => simulate("failed")}>
              Registrar recusado
            </ActionButton>
            <ActionButton loading={loadingAction === "expired"} disabled={!leadReady} onClick={() => simulate("expired")}>
              Registrar expirado
            </ActionButton>
          </div>
          {realPayment?.transaction ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="font-semibold">Umbrella: {realPayment.transaction.status ?? "status pendente"}</p>
              <p className="mt-1 font-mono text-xs">{realPayment.transaction.id ?? "sem id retornado"}</p>
              {realPayment.transaction.secureUrl || realPayment.transaction.payUrl || realPayment.transaction.webUrl ? (
                <a className="mt-2 inline-flex font-semibold text-primary underline" href={realPayment.transaction.secureUrl ?? realPayment.transaction.payUrl ?? realPayment.transaction.webUrl ?? "#"} target="_blank" rel="noreferrer">
                  Abrir pagamento
                </a>
              ) : null}
            </div>
          ) : null}
          {lastSimulation?.result?.payment ? (
            <div className="mt-4 rounded-md border border-border bg-white p-3 text-sm">
              <p className="font-semibold">Ultimo pagamento: {lastSimulation.result.payment.status}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{lastSimulation.result.payment.providerPaymentId}</p>
            </div>
          ) : null}
        </section>

        <section className="data-panel p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="text-lg font-bold">Variaveis de producao</h3>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-slate-950 p-4 text-xs leading-6 text-brand-green">{envBlock}</pre>
          {status?.webhookSecretConfigured ? (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>UMBRELLA_WEBHOOK_SECRET configurado. O PayFlow exige assinatura HMAC no header x-umbrella-signature ou x-signature para webhooks reais da Umbrella.</p>
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>Sem UMBRELLA_WEBHOOK_SECRET o PayFlow aceita webhook sem assinatura. Funciona para teste, mas o secret e recomendado em producao.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ConnectionRow({ label, ready, optional }: { label: string; ready: boolean; optional?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/10 px-3 py-2">
      <span className="text-sm text-white/75">{label}</span>
      <span className={cn("inline-flex items-center gap-1 text-xs font-bold", ready ? "text-brand-green" : optional ? "text-white/60" : "text-amber-200")}>
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        {ready ? "pronto" : optional ? "opcional" : "pendente"}
      </span>
    </div>
  );
}

function CopyField({ label, value, onCopy }: { label: string; value: string; onCopy: (value?: string) => void }) {
  return (
    <label className="mt-4 grid gap-2 text-sm font-semibold">
      {label}
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <input className="field font-mono text-xs" value={value} readOnly />
        <button type="button" className="btn-secondary" onClick={() => onCopy(value)} disabled={!value}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copiar
        </button>
      </div>
    </label>
  );
}

function ActionButton({ children, loading, disabled, onClick }: { children: ReactNode; loading: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className="btn-secondary w-full" disabled={loading || disabled} onClick={onClick}>
      {loading ? <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
      {loading ? "Aguarde" : children}
    </button>
  );
}

function setLeadField<K extends keyof LeadForm>(setLead: Dispatch<SetStateAction<LeadForm>>, key: K, value: LeadForm[K]) {
  setLead((current) => ({ ...current, [key]: value }));
}

function setPaymentField<K extends keyof PaymentForm>(setPayment: Dispatch<SetStateAction<PaymentForm>>, key: K, value: PaymentForm[K]) {
  setPayment((current) => ({ ...current, [key]: value }));
}

function NoticeCard({ notice }: { notice: ActionNotice }) {
  const toneClass =
    notice.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : notice.tone === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-blue-200 bg-blue-50 text-blue-800";
  const Icon = notice.tone === "success" ? CheckCircle2 : AlertTriangle;

  return (
    <div className={cn("mt-3 flex items-start gap-2 rounded-md border p-3 text-sm font-medium", toneClass)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{notice.text}</span>
    </div>
  );
}

function simulationMessage(type: "pending" | "paid" | "failed" | "expired", json: SimulateResponse) {
  if (json.result?.duplicated) return "Evento duplicado recebido e ignorado.";
  if (type === "pending") return "Pagamento pendente criado e recuperacao avaliada.";
  if (type === "paid") return "Pagamento pago criado e recuperacoes relacionadas fechadas.";
  if (type === "expired") return "Pagamento expirado criado para validar abandono.";
  return "Pagamento recusado criado para validar abandono.";
}
