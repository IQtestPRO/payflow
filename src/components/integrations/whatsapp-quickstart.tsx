"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  KeyRound,
  LockKeyhole,
  MessageCircle,
  QrCode,
  RefreshCcw,
  Send,
  Server,
  ShieldCheck,
  Terminal,
  Webhook,
  Wifi,
  Zap
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type WhatsAppStatus = {
  provider: string;
  readyForMetaTest: boolean;
  readyForEvolutionLocal: boolean;
  hasAccessToken: boolean;
  hasPhoneNumberId: boolean;
  hasVerifyToken: boolean;
  hasEvolutionBaseUrl: boolean;
  hasEvolutionApiKey: boolean;
  hasEvolutionInstanceName: boolean;
  evolutionBaseUrl: string;
  evolutionInstanceName: string;
  webhookSecretConfigured: boolean;
  verifyToken: string;
  webhookUrl: string;
  recommendedTemplate: string;
  recommendedLanguage: string;
};

type EvolutionActionResponse = {
  ok?: boolean;
  error?: string;
  webhookUrl?: string;
  result?: unknown;
};

type QrState = {
  image?: string;
  code?: string;
  pairingCode?: string;
};

type SetupNotice = {
  tone: "success" | "error" | "info";
  text: string;
};

const setupSteps = [
  {
    title: "Subir Evolution local",
    description: "Rode o Docker Compose e deixe a API em localhost:8080.",
    icon: Server
  },
  {
    title: "Criar instancia",
    description: "O PayFlow cria a instancia payflow-local com eventos de mensagem.",
    icon: ClipboardCheck
  },
  {
    title: "Escanear QR code",
    description: "Use o app WhatsApp no celular para conectar como WhatsApp Web.",
    icon: QrCode
  },
  {
    title: "Receber e responder",
    description: "O webhook grava conversas e a inbox envia mensagens pela Evolution.",
    icon: MessageCircle
  }
];

const flow = [
  "Cliente envia mensagem",
  "Evolution chama webhook",
  "PayFlow registra conversa",
  "Inbox responde pelo mesmo numero"
];

export function WhatsAppQuickstart() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [to, setTo] = useState("");
  const [pairingPhone, setPairingPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [setupNotice, setSetupNotice] = useState<SetupNotice | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [qr, setQr] = useState<QrState | null>(null);

  useEffect(() => {
    fetch("/api/integrations/whatsapp/status")
      .then((response) => response.json())
      .then(setStatus)
      .catch(() => setMessage("Nao foi possivel ler o status do WhatsApp."));
  }, []);

  const completion = useMemo(() => {
    const checks = [
      status?.provider === "evolution",
      status?.hasEvolutionBaseUrl,
      status?.hasEvolutionApiKey,
      status?.hasEvolutionInstanceName
    ];
    return checks.filter(Boolean).length;
  }, [status]);

  const envBlock = `WHATSAPP_PROVIDER=evolution
EVOLUTION_API_BASE_URL=${status?.evolutionBaseUrl ?? "http://localhost:8080"}
EVOLUTION_API_KEY=payflow-evolution-local-key
EVOLUTION_INSTANCE_NAME=${status?.evolutionInstanceName ?? "payflow-local"}
APP_URL=http://localhost:3000
WHATSAPP_WEBHOOK_URL=http://host.docker.internal:3000/api/webhooks/whatsapp
WHATSAPP_WEBHOOK_SECRET=`;

  async function copy(value?: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setMessage("Copiado para a area de transferencia.");
  }

  async function runEvolutionAction(action: "create" | "connect" | "webhook") {
    setLoadingAction(action);
    setMessage(null);
    setSetupNotice(null);

    const endpoint =
      action === "create"
        ? "/api/integrations/whatsapp/evolution/create-instance"
        : action === "connect"
          ? "/api/integrations/whatsapp/evolution/connect"
          : "/api/integrations/whatsapp/evolution/webhook";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: action === "connect" ? JSON.stringify({ phone: pairingPhone || undefined }) : undefined
    });
    const json = (await response.json()) as EvolutionActionResponse;
    setLoadingAction(null);

    if (!response.ok) {
      setSetupNotice({ tone: "error", text: json.error ?? "Falha ao executar acao Evolution." });
      return;
    }

    if (action === "connect") {
      const qrState = extractQr(json.result);
      setQr(qrState);
      setSetupNotice({
        tone: qrState?.image || qrState?.code || qrState?.pairingCode ? "success" : "info",
        text: qrState?.image || qrState?.code || qrState?.pairingCode ? "QR code atualizado." : qrMissingMessage(json.result)
      });
      return;
    }

    if (action === "create") {
      const qrState = extractQr(json.result);
      if (qrState?.image || qrState?.code || qrState?.pairingCode) {
        setQr(qrState);
        setSetupNotice({ tone: "success", text: "Instancia criada e QR code atualizado." });
        return;
      }
    }

    setSetupNotice({
      tone: "success",
      text: action === "create" ? "Instancia criada ou atualizada." : `Webhook configurado em ${json.webhookUrl ?? status?.webhookUrl ?? ""}`
    });
  }

  async function sendTest(formData: FormData) {
    setLoadingAction("send-test");
    setMessage(null);
    const response = await fetch("/api/integrations/whatsapp/send-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: formData.get("to"),
        mode: "text",
        body: "Teste de envio pelo PayFlow via Evolution API."
      })
    });
    const json = (await response.json()) as { error?: string; result?: { providerMessageId?: string } };
    setLoadingAction(null);
    setMessage(response.ok ? `Teste enviado. ID: ${json.result?.providerMessageId ?? "sem id"}` : json.error ?? "Falha no teste.");
  }

  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-lg border border-white/10 bg-payflow-sidebar text-white shadow-premium">
        <div className="grid gap-0 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="p-5 md:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-1 text-xs font-bold text-brand-green">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              WhatsApp primeiro: QR code local
            </div>
            <h2 className="mt-4 max-w-3xl text-2xl font-bold md:text-3xl">Conectar o WhatsApp agora, sem BM verificada</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">
              Este caminho usa Evolution API local como ponte do WhatsApp Web. Ele e ideal para validar atendimento, webhook, inbox e recuperacao antes de migrar para uma infraestrutura definitiva.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn min-h-10 border border-white/10 bg-white text-brand-navy hover:bg-white/90" type="button" onClick={() => copy("docker compose up -d evolution-api")}>
                <Terminal className="h-4 w-4" aria-hidden="true" />
                Copiar comando Docker
              </button>
              <a className="btn min-h-10 border border-white/10 bg-white/10 text-white hover:bg-white/15" href="/inbox">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Ver inbox
              </a>
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/5 p-5 md:p-6 lg:border-l lg:border-t-0">
            <p className="text-sm font-semibold text-white/70">Prontidao local</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold tabular-nums">{completion}/4</span>
              <span className="pb-1 text-sm text-white/60">itens configurados</span>
            </div>
            <div className="mt-5 grid gap-2">
              <ConnectionRow label="Provider Evolution" ready={status?.provider === "evolution"} />
              <ConnectionRow label="URL da API" ready={Boolean(status?.hasEvolutionBaseUrl)} />
              <ConnectionRow label="API key local" ready={Boolean(status?.hasEvolutionApiKey)} />
              <ConnectionRow label="Instancia" ready={Boolean(status?.hasEvolutionInstanceName)} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_430px]">
        <section className="surface p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold">Ativacao guiada</h3>
              <p className="mt-1 text-sm text-muted-foreground">O minimo necessario para colocar o numero respondendo pelo PayFlow.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              Local e gratuito
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {setupSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-lg border border-border bg-white p-4">
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

        <section className="surface p-5">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="text-lg font-bold">QR code da instancia</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Primeiro suba a Evolution, depois crie a instancia e gere o QR. Se quiser parear por codigo, informe o telefone com DDI.
          </p>
          <label className="mt-4 grid gap-2 text-sm font-semibold">
            Telefone para pareamento opcional
            <input className="field" value={pairingPhone} onChange={(event) => setPairingPhone(event.target.value)} placeholder="5511999999999" />
          </label>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <ActionButton loading={loadingAction === "create"} onClick={() => runEvolutionAction("create")}>
              Criar
            </ActionButton>
            <ActionButton loading={loadingAction === "connect"} onClick={() => runEvolutionAction("connect")}>
              Gerar QR
            </ActionButton>
            <ActionButton loading={loadingAction === "webhook"} onClick={() => runEvolutionAction("webhook")}>
              Webhook
            </ActionButton>
          </div>
          {setupNotice ? <SetupNoticeCard notice={setupNotice} /> : null}
          <QrPreview qr={qr} managerUrl={`${status?.evolutionBaseUrl ?? "http://localhost:8080"}/manager`} />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="surface p-5">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="text-lg font-bold">Variaveis locais</h3>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-slate-950 p-4 text-xs leading-6 text-brand-green">{envBlock}</pre>
          <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>Use essa chave apenas localmente. Em servidor publico, gere uma chave nova e nunca exponha no frontend.</p>
          </div>
        </section>

        <section className="surface p-5">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="text-lg font-bold">Webhook PayFlow</h3>
          </div>
          <div className="mt-4 grid gap-3">
            <CopyField label="Callback URL" value={status?.webhookUrl ?? ""} onCopy={copy} />
            <CopyField label="Comando local" value="docker compose up -d evolution-api" onCopy={copy} />
          </div>
          <div className="mt-4 grid gap-2">
            {flow.map((item, index) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-primary">{index + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="surface p-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="text-lg font-bold">Teste e cuidados</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Depois de escanear o QR, envie uma mensagem para o numero conectado e confira a conversa na inbox. O envio respeita opt-out e continua passando pelo `WhatsAppProvider`.
            </p>
            <div className="mt-4 grid gap-2 text-sm">
              <ConnectionRowLight label="BM verificada" value="Nao precisa para este MVP local" />
              <ConnectionRowLight label="WhatsApp Web" value="Precisa permanecer conectado" />
              <ConnectionRowLight label="Producao futura" value="Trocar API key, HTTPS e hospedagem estavel" />
            </div>
          </div>

          <form action={sendTest} className="grid gap-3">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="text-lg font-bold">Enviar teste</h3>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Telefone com DDI
              <input className="field" name="to" value={to} onChange={(event) => setTo(event.target.value)} placeholder="5511999999999" required />
            </label>
            <button className="btn-primary w-full" type="submit" disabled={loadingAction === "send-test" || !to.trim()}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {loadingAction === "send-test" ? "Enviando..." : "Enviar mensagem"}
            </button>
            {message ? <p className="rounded-md bg-blue-50 p-3 text-sm font-medium text-blue-800">{message}</p> : null}
          </form>
        </div>
      </section>
    </div>
  );
}

function ConnectionRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/8 px-3 py-2">
      <span className="text-sm text-white/75">{label}</span>
      <span className={cn("inline-flex items-center gap-1 text-xs font-bold", ready ? "text-brand-green" : "text-amber-200")}>
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        {ready ? "pronto" : "pendente"}
      </span>
    </div>
  );
}

function ConnectionRowLight({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border border-border bg-white px-3 py-2 sm:grid-cols-[160px_1fr]">
      <span className="text-xs font-bold uppercase tracking-normal text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function CopyField({ label, value, onCopy }: { label: string; value: string; onCopy: (value?: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <input className="field font-mono text-xs" value={value} readOnly />
        <button type="button" className="btn-secondary" onClick={() => onCopy(value)}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copiar
        </button>
      </div>
    </label>
  );
}

function ActionButton({ children, loading, onClick }: { children: ReactNode; loading: boolean; onClick: () => void }) {
  return (
    <button type="button" className="btn-secondary w-full" disabled={loading} onClick={onClick}>
      {loading ? <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
      {loading ? "Aguarde" : children}
    </button>
  );
}

function SetupNoticeCard({ notice }: { notice: SetupNotice }) {
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

function QrPreview({ qr, managerUrl }: { qr: QrState | null; managerUrl: string }) {
  if (!qr) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 p-5 text-center text-sm text-muted-foreground">
        O QR ou codigo de pareamento aparece aqui depois de clicar em Gerar QR.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-white p-4">
      {qr.image ? (
        <Image
          className="mx-auto h-52 w-52 rounded-md border border-border bg-white object-contain p-2"
          src={qr.image}
          alt="QR code do WhatsApp"
          width={208}
          height={208}
          unoptimized
        />
      ) : null}
      {qr.pairingCode ? (
        <div className="mt-3 rounded-md bg-emerald-50 p-3 text-center">
          <p className="text-xs font-bold uppercase tracking-normal text-emerald-700">Codigo de pareamento</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-900">{qr.pairingCode}</p>
        </div>
      ) : null}
      {qr.code && !qr.image ? <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-brand-green">{qr.code}</pre> : null}
      <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
        Se a imagem nao renderizar, abra <a className="font-semibold text-primary underline" href={managerUrl} target="_blank" rel="noreferrer">Evolution Manager</a>.
      </p>
    </div>
  );
}

function extractQr(result: unknown): QrState | null {
  if (!isRecord(result)) return null;

  const qrcode = result.qrcode;
  const qrcodeRecord = isRecord(qrcode) ? qrcode : null;
  const qrcodeString = typeof qrcode === "string" ? qrcode : undefined;
  const base64 =
    readString(result, "image") ??
    readString(result, "base64") ??
    (qrcodeRecord ? readString(qrcodeRecord, "base64") : undefined) ??
    (qrcodeString && looksLikeImageData(qrcodeString) ? qrcodeString : undefined);
  const code =
    readString(result, "code") ??
    (qrcodeRecord ? readString(qrcodeRecord, "code") : undefined) ??
    (qrcodeString && !looksLikeImageData(qrcodeString) ? qrcodeString : undefined);
  const pairingCode = readString(result, "pairingCode") ?? (qrcodeRecord ? readString(qrcodeRecord, "pairingCode") : undefined);
  const image = base64 ? normalizeQrImage(base64) : undefined;

  if (!image && !code && !pairingCode) return null;

  return {
    image,
    code,
    pairingCode
  };
}

function qrMissingMessage(result: unknown) {
  if (isRecord(result)) {
    const qrcode = result.qrcode;
    const qrcodeRecord = isRecord(qrcode) ? qrcode : null;
    const count = readNumber(result, "count") ?? (qrcodeRecord ? readNumber(qrcodeRecord, "count") : undefined);
    if (count === 0) {
      return "A Evolution respondeu sem QR (count 0). Atualize o container e tente Criar/Gerar QR novamente.";
    }
  }

  return "Conexao solicitada. Se o QR nao aparecer, abra o manager da Evolution.";
}

function normalizeQrImage(value: string) {
  return value.startsWith("data:image") ? value : `data:image/png;base64,${value}`;
}

function looksLikeImageData(value: string) {
  return value.startsWith("data:image") || value.startsWith("iVBOR") || value.startsWith("/9j/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}
