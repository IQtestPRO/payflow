"use client";

import {
  Boxes,
  CreditCard,
  Gauge,
  Inbox,
  LogOut,
  Megaphone,
  Package,
  Plug,
  ReceiptText,
  Settings,
  Users,
  Workflow
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PayFlowLogo } from "@/components/brand/payflow-logo";
import type { SessionPayload } from "@/lib/auth-token";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/inbox", label: "Inbox WhatsApp", icon: Inbox },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/ofertas", label: "Ofertas", icon: Boxes },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/pagamentos", label: "Pagamentos", icon: CreditCard },
  { href: "/recuperacoes", label: "Recuperações", icon: Workflow },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/relatorios", label: "Relatórios", icon: ReceiptText },
  { href: "/integracoes", label: "Integrações", icon: Plug },
  { href: "/configuracoes", label: "Configurações", icon: Settings }
];

export function AppShell({ children, user }: { children: React.ReactNode; user: SessionPayload }) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-transparent">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-payflow-sidebar text-white shadow-[22px_0_70px_-50px_rgb(0_26_66/0.95)] lg:flex lg:flex-col">
        <div className="relative overflow-hidden border-b border-white/10 px-5 py-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/70 to-transparent" />
          <PayFlowLogo variant="dark" size="md" showTagline />
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-white/10 bg-white/[0.07] p-2.5">
              <p className="font-semibold text-white/55">Canal</p>
              <p className="mt-1 font-bold text-brand-green">WhatsApp</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.07] p-2.5">
              <p className="font-semibold text-white/55">Foco</p>
              <p className="mt-1 font-bold text-brand-cyan">Recovery</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4" aria-label="Navegacao principal">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-normal text-white/38">Operacao</p>
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition duration-200 focus-visible:ring-2 focus-visible:ring-brand-green/50",
                  active
                    ? "bg-white text-brand-navy shadow-[0_14px_30px_-22px_rgb(255_255_255/0.75)]"
                    : "text-white/66 hover:bg-white/[0.08] hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition",
                    active ? "bg-gradient-to-b from-brand-cyan to-brand-green opacity-100" : "bg-white/0 opacity-0 group-hover:bg-white/30 group-hover:opacity-100"
                  )}
                />
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-md transition", active ? "bg-brand-blue/10 text-primary" : "bg-white/[0.06] text-white/70 group-hover:text-brand-green")}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 bg-white/[0.035] p-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.08] p-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-blue to-brand-cyan text-sm font-black text-white shadow-glow">
                {initials || "PF"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="mt-1 truncate text-xs text-white/55">{user.email}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md bg-black/10 px-2.5 py-2 text-xs">
              <span className="font-semibold text-white/55">{user.role}</span>
              <span className="inline-flex items-center gap-1 font-bold text-brand-green">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                online
              </span>
            </div>
          </div>
          <button type="button" onClick={logout} className="btn mt-3 w-full border border-white/10 bg-white/[0.08] text-white hover:-translate-y-0.5 hover:bg-white/[0.14]">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" aria-label="PayFlow dashboard">
            <PayFlowLogo size="sm" />
          </Link>
          <button type="button" onClick={logout} className="btn-secondary px-3" aria-label="Sair">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Navegacao principal mobile">
          {links.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold shadow-sm transition",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border/80 bg-white/90 text-muted-foreground hover:border-primary/25 hover:text-primary"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="px-4 py-6 lg:ml-72 lg:px-8 lg:py-8 xl:px-10">{children}</main>
    </div>
  );
}
