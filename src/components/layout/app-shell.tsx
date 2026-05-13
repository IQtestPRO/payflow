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
  { href: "/recuperacoes", label: "Recuperações", icon: Workflow },
  { href: "/pagamentos", label: "Pagamentos", icon: CreditCard },
  { href: "/getways", label: "Getways", icon: CreditCard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/ofertas", label: "Ofertas", icon: Boxes },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/relatorios", label: "Relatórios", icon: ReceiptText },
  { href: "/integracoes", label: "Integrações", icon: Plug },
  { href: "/configuracoes", label: "Configurações", icon: Settings }
];

const navGroups = [
  { label: "Comando", links: links.filter((link) => ["/dashboard", "/inbox", "/recuperacoes", "/pagamentos", "/getways"].includes(link.href)) },
  { label: "Receita", links: links.filter((link) => ["/clientes", "/ofertas", "/produtos"].includes(link.href)) },
  { label: "Tracking", links: links.filter((link) => ["/campanhas", "/relatorios", "/integracoes", "/configuracoes"].includes(link.href)) }
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
          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.07] p-3 shadow-inner">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-normal text-white/40">Revenue command</p>
                <p className="mt-1 text-sm font-extrabold text-white">WhatsApp, recovery e tracking</p>
              </div>
              <span className="live-dot shrink-0" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-white/10 bg-black/10 p-2.5">
                <p className="font-semibold text-white/50">Canal ativo</p>
                <p className="mt-1 font-bold text-brand-green">WhatsApp</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/10 p-2.5">
                <p className="font-semibold text-white/50">Prioridade</p>
                <p className="mt-1 font-bold text-brand-cyan">Recuperação</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1.5">
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-normal text-white/40">{group.label}</p>
              {group.links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition duration-200 focus-visible:ring-2 focus-visible:ring-brand-green/50",
                      active ? "bg-white text-brand-navy shadow-[0_14px_30px_-22px_rgb(255_255_255/0.75)]" : "text-white/70 hover:bg-white/[0.08] hover:text-white"
                    )}
                  >
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-md transition", active ? "bg-brand-blue/10 text-primary" : "bg-white/[0.06] text-white/70 group-hover:text-brand-green")}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 bg-white/[0.035] p-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.08] p-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-blue text-sm font-black text-white shadow-glow">
                {initials || "PF"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="mt-1 truncate text-xs text-white/60">{user.email}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md border border-white/10 bg-black/10 px-2.5 py-2 text-xs">
              <span className="font-semibold text-white/60">{user.role}</span>
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

      <header className="sticky top-0 z-20 border-b border-border/70 bg-white/[0.92] px-4 py-3 shadow-command backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" aria-label="PayFlow dashboard">
            <PayFlowLogo size="sm" />
          </Link>
          <button type="button" onClick={logout} className="btn-secondary px-3" aria-label="Sair">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Navegação principal mobile">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
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

      <main className="px-4 py-6 lg:ml-72 lg:px-8 lg:py-8 xl:px-10">
        <div className="mx-auto max-w-[1480px]">{children}</div>
      </main>
    </div>
  );
}
