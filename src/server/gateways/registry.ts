import { CreditCard, FileText, Landmark, ShieldCheck, type LucideIcon } from "lucide-react";

export type GatewayStatus = "configured" | "pending";

export type GatewayRegistryItem = {
  id: "umbrella" | "mangofy" | "sigilopay" | "lytronpay" | "allowpayments";
  name: string;
  description: string;
  status: GatewayStatus;
  websiteUrl: string;
  docsUrl: string | null;
  logo: string;
  logoAlt: string;
  symbol: string;
  icon: LucideIcon;
  isConfigured: boolean;
  integrationStatus: "CONNECTED" | "PENDING";
  configAction: {
    label: string;
    href: string;
    kind: "internal" | "external";
  };
};

export function getGatewayRegistry(): GatewayRegistryItem[] {
  const umbrellaConfigured = Boolean(
    (process.env.UMBRELLA_API_BASE_URL || process.env.UMBRELLAPAG_BASE_URL) &&
      (process.env.UMBRELLA_API_KEY || process.env.UMBRELLAPAG_API_KEY)
  );

  return [
    {
      id: "umbrella",
      name: "UmbrellaPag",
      description: "Checkout, Pix, boleto, status transacional e gatilhos de recuperacao.",
      status: umbrellaConfigured ? "configured" : "pending",
      websiteUrl: "https://umbrellapag.com/",
      docsUrl: "/getways#umbrella-configuracao",
      logo: "/assets/integrations/umbrella.svg",
      logoAlt: "Logo da UmbrellaPag",
      symbol: "UP",
      icon: CreditCard,
      isConfigured: umbrellaConfigured,
      integrationStatus: umbrellaConfigured ? "CONNECTED" : "PENDING",
      configAction: {
        label: umbrellaConfigured ? "Gerenciar" : "Configurar",
        href: "#umbrella-configuracao",
        kind: "internal"
      }
    },
    {
      id: "mangofy",
      name: "Mangofy",
      description: "Gateway com API Pix, checkout integrado e estrutura de webhooks para vendas digitais.",
      status: "pending",
      websiteUrl: "https://mangofy.com.br/",
      docsUrl: "https://app.mangofy.com.br/",
      logo: "/assets/gateways/mangofy-placeholder.svg",
      logoAlt: "Identificacao visual Mangofy",
      symbol: "MG",
      icon: CreditCard,
      isConfigured: false,
      integrationStatus: "PENDING",
      configAction: {
        label: "Configurar",
        href: "https://mangofy.com.br/",
        kind: "external"
      }
    },
    {
      id: "sigilopay",
      name: "SigiloPay",
      description: "Gateway de pagamentos, plataforma e API Pix preparado para integracao futura.",
      status: "pending",
      websiteUrl: "https://www.sigilopay.com/",
      docsUrl: "https://www.sigilopay.com/",
      logo: "/assets/gateways/sigilopay-placeholder.svg",
      logoAlt: "Identificacao visual SigiloPay",
      symbol: "SP",
      icon: ShieldCheck,
      isConfigured: false,
      integrationStatus: "PENDING",
      configAction: {
        label: "Configurar",
        href: "https://www.sigilopay.com/",
        kind: "external"
      }
    },
    {
      id: "lytronpay",
      name: "LytronPay",
      description: "Processadora em fila de integracao para credenciais, endpoints e webhooks dedicados.",
      status: "pending",
      websiteUrl: "https://lytronpay.com/",
      docsUrl: "https://lytronpay.com/",
      logo: "/assets/gateways/lytronpay-placeholder.svg",
      logoAlt: "Identificacao visual LytronPay",
      symbol: "LP",
      icon: Landmark,
      isConfigured: false,
      integrationStatus: "PENDING",
      configAction: {
        label: "Configurar",
        href: "https://lytronpay.com/",
        kind: "external"
      }
    },
    {
      id: "allowpayments",
      name: "AllowPayments",
      description: "Gateway com foco em Pix, cartao, boleto, relatorios e automacoes de pagamento.",
      status: "pending",
      websiteUrl: "https://allowpayments.com/",
      docsUrl: "https://allowpayments.com/",
      logo: "/assets/gateways/allowpayments-placeholder.svg",
      logoAlt: "Identificacao visual AllowPayments",
      symbol: "AP",
      icon: FileText,
      isConfigured: false,
      integrationStatus: "PENDING",
      configAction: {
        label: "Configurar",
        href: "https://allowpayments.com/",
        kind: "external"
      }
    }
  ];
}
