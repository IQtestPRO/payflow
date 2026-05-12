"use client";

import { Loader2 } from "lucide-react";
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

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = (await response.json()) as { error?: string; redirectTo?: string };
    setLoading(false);

    if (!response.ok) {
      setError(json.error ?? "Não foi possível continuar.");
      return;
    }

    router.push(json.redirectTo ?? "/dashboard");
    router.refresh();
  }

  return (
    <form action={submit} className="surface p-6">
      <div>
        <PayFlowLogo size="md" />
        <h1 className="mt-4 text-2xl font-bold">{mode === "login" ? "Entrar" : "Criar workspace"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "login" ? "Use admin@payflow.local / admin123 para entrar no modo demo." : "Crie o primeiro usuário owner da sua empresa."}
        </p>
      </div>

      <div className="mt-6 grid gap-4">
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
          <input className="field" name="email" type="email" autoComplete="email" defaultValue={mode === "login" ? "admin@payflow.local" : ""} required />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Senha
          <input className="field" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} defaultValue={mode === "login" ? "admin123" : ""} required />
        </label>
      </div>

      {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}

      <button type="submit" className="btn-primary mt-6 w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {mode === "login" ? "Entrar" : "Cadastrar"}
      </button>
    </form>
  );
}
