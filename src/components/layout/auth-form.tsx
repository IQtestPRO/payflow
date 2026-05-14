"use client";

import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PayFlowLogo } from "@/components/brand/payflow-logo";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError(null);

    const payload =
      mode === "login"
        ? {
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? "")
          }
        : {
            name: String(formData.get("name") ?? ""),
            workspaceName: String(formData.get("workspaceName") ?? ""),
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? "")
          };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = (await response.json().catch(() => ({}))) as { error?: string; redirectTo?: string };
      setLoading(false);

      if (!response.ok) {
        setError(json.error ?? "Nao foi possivel continuar.");
        return;
      }

      router.push(json.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
      setError("Nao foi possivel conectar ao PayFlow agora.");
    }
  }

  return (
    <form action={submit} className="data-panel overflow-hidden p-0">
      <div className="border-b border-border/80 bg-white/[0.96] p-6">
        <PayFlowLogo size="md" />
        <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Acesso seguro
        </div>
        <h1 className="mt-3 text-2xl font-extrabold">{mode === "login" ? "Entrar no PayFlow" : "Criar workspace"}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {mode === "login" ? "Acesse com seu usuario operacional para responder conversas e acompanhar pagamentos reais." : "Crie o primeiro usuario owner da sua empresa."}
        </p>
      </div>

      <div className="grid gap-4 p-6">
        {mode === "register" ? (
          <>
            <label className="grid gap-2 text-sm font-semibold">
              Nome
              <input className="field" name="name" autoComplete="name" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Workspace
              <input className="field" name="workspaceName" autoComplete="organization" required />
            </label>
          </>
        ) : null}

        <label className="grid gap-2 text-sm font-semibold">
          E-mail
          <input className="field" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Senha
          <input className="field" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
        </label>

        {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          {mode === "login" ? "Entrar" : "Cadastrar"}
        </button>
      </div>
    </form>
  );
}
