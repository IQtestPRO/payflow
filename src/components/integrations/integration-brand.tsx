import { BarChart3, Camera, Code2, CreditCard, Globe2, Link2, Megaphone, MessageCircle, MousePointer2, RefreshCcw, type LucideIcon } from "lucide-react";
import Image from "next/image";
import type { IntegrationProvider } from "@/lib/types";
import { cn } from "@/lib/utils";

type IntegrationBrand = {
  label: string;
  shortLabel: string;
  description: string;
  category: string;
  asset: string;
  assetAlt: string;
  fallbackIcon: LucideIcon;
  accent: string;
  softBg: string;
  line: string;
  detailsHref: string;
  primaryAction: string;
};

export const integrationBrands: Record<IntegrationProvider, IntegrationBrand> = {
  WHATSAPP: {
    label: "WhatsApp",
    shortLabel: "WhatsApp",
    description: "Canal de atendimento, mensagens recebidas, disparos controlados e recuperacao.",
    category: "Atendimento",
    asset: "/assets/integrations/whatsapp.svg",
    assetAlt: "Logo do WhatsApp",
    fallbackIcon: MessageCircle,
    accent: "text-emerald-700",
    softBg: "from-emerald-500/12 via-white to-brand-cyan/10",
    line: "from-emerald-400 to-brand-cyan",
    detailsHref: "/inbox",
    primaryAction: "Abrir inbox"
  },
  META_ADS: {
    label: "Meta Ads",
    shortLabel: "Meta",
    description: "Campanhas, criativos, investimento, cliques, CPA e ROAS em uma unica leitura.",
    category: "Midia paga",
    asset: "/assets/integrations/meta.svg",
    assetAlt: "Logo da Meta",
    fallbackIcon: Megaphone,
    accent: "text-blue-700",
    softBg: "from-blue-500/12 via-white to-sky-300/10",
    line: "from-blue-500 to-sky-400",
    detailsHref: "/campanhas",
    primaryAction: "Ver campanhas"
  },
  UMBRELLA: {
    label: "UmbrellaPag",
    shortLabel: "Umbrella",
    description: "Checkout, Pix, boleto, status transacional e gatilhos de recuperacao.",
    category: "Pagamentos",
    asset: "/assets/integrations/umbrella.svg",
    assetAlt: "Logo da UmbrellaPag",
    fallbackIcon: CreditCard,
    accent: "text-brand-navy",
    softBg: "from-slate-900/8 via-white to-blue-500/10",
    line: "from-brand-navy to-brand-blue",
    detailsHref: "/pagamentos",
    primaryAction: "Ver pagamentos"
  },
  UTMIFY: {
    label: "UTMify",
    shortLabel: "UTMify",
    description: "UTMs, origem das vendas, click IDs e performance de campanhas.",
    category: "Rastreamento",
    asset: "/assets/integrations/utmify.svg",
    assetAlt: "Logo da UTMify",
    fallbackIcon: BarChart3,
    accent: "text-cyan-700",
    softBg: "from-brand-cyan/12 via-white to-brand-blue/10",
    line: "from-brand-cyan to-brand-blue",
    detailsHref: "/relatorios",
    primaryAction: "Ver relatorios"
  }
};

export const supportingIntegrationBrands = [
  {
    label: "Facebook",
    description: "Ativos sociais, campanhas e eventos ligados ao ecossistema Meta.",
    asset: "/assets/integrations/facebook.svg",
    assetAlt: "Logo do Facebook",
    icon: Megaphone,
    accent: "text-blue-700"
  },
  {
    label: "Instagram",
    description: "Origem de campanhas, bio, criativos e jornadas sociais.",
    asset: "/assets/integrations/instagram.svg",
    assetAlt: "Logo do Instagram",
    icon: Camera,
    accent: "text-pink-700"
  },
  {
    label: "Webhooks",
    description: "Eventos recebidos e enviados entre PayFlow e ferramentas externas.",
    asset: "/assets/integrations/webhook-fallback.svg",
    assetAlt: "Icone neutro de webhook",
    icon: Link2,
    accent: "text-primary"
  },
  {
    label: "Pixel/API",
    description: "Eventos de conversao, checkout e rastreamento tecnico.",
    asset: "/assets/integrations/pixel-fallback.svg",
    assetAlt: "Icone neutro de pixel tracking",
    icon: Code2,
    accent: "text-emerald-700"
  },
  {
    label: "Checkout",
    description: "Inicio, abandono e aprovacao de pagamentos.",
    asset: "/assets/integrations/umbrella-fallback.svg",
    assetAlt: "Icone neutro de checkout",
    icon: CreditCard,
    accent: "text-brand-navy"
  },
  {
    label: "CRM",
    description: "Clientes, opt-out, historico e relacionamento comercial.",
    asset: "/assets/integrations/pixel-fallback.svg",
    assetAlt: "Icone neutro de CRM",
    icon: Globe2,
    accent: "text-slate-700"
  },
  {
    label: "Recuperacao",
    description: "Automacoes de carrinho e tentativas por WhatsApp.",
    asset: "/assets/integrations/whatsapp.svg",
    assetAlt: "Logo do WhatsApp usado na recuperacao",
    icon: RefreshCcw,
    accent: "text-emerald-700"
  },
  {
    label: "Tracking",
    description: "Eventos de venda, campanha e clique conectados.",
    asset: "/assets/integrations/utmify-fallback.svg",
    assetAlt: "Icone neutro de rastreamento",
    icon: MousePointer2,
    accent: "text-cyan-700"
  }
];

export function IntegrationLogo({
  src,
  alt,
  icon: Icon,
  className,
  imageClassName
}: {
  src?: string;
  alt: string;
  icon: LucideIcon;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white shadow-sm ring-1 ring-slate-900/5", className)}>
      {src ? <Image className={cn("h-7 w-7 object-contain", imageClassName)} src={src} alt={alt} width={28} height={28} unoptimized /> : <Icon className="h-6 w-6 text-primary" aria-hidden="true" />}
    </span>
  );
}
