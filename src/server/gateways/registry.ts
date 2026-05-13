import { CreditCard, FileText, Landmark, ShieldCheck, type LucideIcon } from "lucide-react";

export type GatewayId = "umbrella" | "mangofy" | "sigilopay" | "lytronpay" | "allowpayments";
export type GatewayUiStatus = "configured" | "awaiting_docs" | "pending_credentials" | "disabled";
export type GatewayDocsStatus =
  | "ready_public_docs"
  | "partial_public_spa"
  | "tutorial_public_reference_pending"
  | "readme_reference_gated"
  | "public_marketing_only";
export type GatewayCapabilityValue = boolean | "pending_docs" | "not_confirmed";
export type PaymentMethod = "pix" | "credit_card" | "debit_card" | "boleto" | "bank_transfer" | "crypto";

export type GatewayEndpointDoc = {
  key: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  authRequired: boolean;
  confirmed: boolean;
  notes?: string[];
};

export type GatewayDocsReference = {
  label: string;
  url: string;
  type: "official_docs" | "official_website" | "official_tutorial" | "official_app" | "official_login" | "pending";
};

export type GatewayCredentialField = {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "select";
  required: boolean;
  secret: boolean;
  placeholder?: string;
  helpText?: string;
};

export type PaymentGatewayConfig = {
  id: GatewayId;
  name: string;
  displayName: string;
  uiLabel: string;
  description: string;
  status: GatewayUiStatus;
  docsStatus: GatewayDocsStatus;
  websiteUrl: string;
  docsUrl?: string;
  appUrl?: string;
  loginUrl?: string;
  logo: string;
  logoAlt: string;
  fallbackSymbol: string;
  icon: LucideIcon;
  isConfigured: boolean;
  integrationStatus: "CONNECTED" | "PENDING";
  methods: PaymentMethod[];
  capabilities: Record<string, GatewayCapabilityValue>;
  credentialFields: GatewayCredentialField[];
  api?: {
    baseUrl?: string;
    defaultHeaders?: Record<string, string>;
    endpoints?: GatewayEndpointDoc[];
  };
  docsReferences: GatewayDocsReference[];
  docsNotes: string[];
  pendingQuestions: string[];
  safetyNotes: string[];
  configAction: {
    label: string;
    href: string;
    kind: "internal" | "external";
  };
};

export type GatewayRegistryItem = PaymentGatewayConfig;

export function getGatewayRegistry(): GatewayRegistryItem[] {
  return [
    {
      id: "umbrella",
      name: "UmbrellaPag",
      displayName: "Umbrella",
      uiLabel: "Umbrella",
      description: "Checkout, Pix, boleto, status transacional e gatilhos de recuperacao.",
      status: "configured",
      docsStatus: "ready_public_docs",
      websiteUrl: "https://docs.umbrellapag.com/",
      docsUrl: "https://docs.umbrellapag.com/",
      logo: "/assets/integrations/umbrella.svg",
      logoAlt: "Logo da UmbrellaPag",
      fallbackSymbol: "U",
      icon: CreditCard,
      isConfigured: true,
      integrationStatus: "CONNECTED",
      methods: ["pix", "credit_card", "boleto", "bank_transfer"],
      capabilities: {
        createTransaction: true,
        checkout: true,
        checkoutOrder: true,
        checkoutPayment: true,
        products: true,
        webhooks: true,
        webhookRegistration: true,
        transfers: true,
        cashout: true,
        balance: true,
        refunds: "pending_docs",
        customers: true
      },
      credentialFields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          required: true,
          secret: true,
          helpText: "Usada no header x-api-key."
        },
        {
          key: "baseUrl",
          label: "Base URL",
          type: "url",
          required: true,
          secret: false,
          placeholder: "https://api-gateway.umbrellapag.com/api"
        },
        {
          key: "userAgent",
          label: "User-Agent",
          type: "text",
          required: true,
          secret: false,
          placeholder: "UMBRELLAB2B/1.0"
        }
      ],
      api: {
        baseUrl: "https://api-gateway.umbrellapag.com/api",
        defaultHeaders: {
          "x-api-key": "{{UMBRELLA_API_KEY}}",
          "User-Agent": "UMBRELLAB2B/1.0",
          "Content-Type": "application/json"
        },
        endpoints: [
          {
            key: "transactions.create",
            method: "POST",
            path: "/api/user/transactions",
            description: "Criar nova transacao.",
            authRequired: true,
            confirmed: true
          },
          {
            key: "products.create",
            method: "POST",
            path: "/api/user/products",
            description: "Criar produto e obter uniqueProductLinkId para fluxo de checkout.",
            authRequired: true,
            confirmed: true
          },
          {
            key: "checkout.createOrder",
            method: "POST",
            path: "/api/public/checkout/create-order/{id}",
            description: "Criar ordem de checkout usando uniqueProductLinkId.",
            authRequired: true,
            confirmed: true
          },
          {
            key: "checkout.createPayment",
            method: "POST",
            path: "/api/public/checkout/payment/{id}",
            description: "Criar pagamento para uma ordem de checkout.",
            authRequired: true,
            confirmed: true
          },
          {
            key: "webhooks.create",
            method: "POST",
            path: "/api/user/webhook",
            description: "Cadastrar webhook.",
            authRequired: true,
            confirmed: true
          },
          {
            key: "balance.history",
            method: "GET",
            path: "/api/user/balance-history",
            description: "Consultar historico de saldo.",
            authRequired: true,
            confirmed: true
          },
          {
            key: "balance.summary",
            method: "GET",
            path: "/api/user/balance-history/summary",
            description: "Consultar resumo de saldo.",
            authRequired: true,
            confirmed: true
          },
          {
            key: "transfers.create",
            method: "POST",
            path: "/api/user/transfers",
            description: "Criar transferencia PIX ou BANK_TRANSFER.",
            authRequired: true,
            confirmed: true
          },
          {
            key: "cashout.create",
            method: "POST",
            path: "/api/user/cashout",
            description: "Criar cashout para chave Pix.",
            authRequired: true,
            confirmed: true
          }
        ]
      },
      docsReferences: [
        {
          label: "UmbrellaPag Docs",
          url: "https://docs.umbrellapag.com/",
          type: "official_docs"
        }
      ],
      docsNotes: [
        "Docs publicas encontradas.",
        "Base URL documentada: https://api-gateway.umbrellapag.com/api.",
        "Autenticacao por x-api-key.",
        "User-Agent documentado na introducao: UMBRELLAB2B/1.0.",
        "A documentacao tem exemplos com nomenclatura inconsistente. Nao alterar integracao existente sem validacao."
      ],
      pendingQuestions: [
        "Confirmar User-Agent definitivo com a Umbrella.",
        "Confirmar lista final de status transacionais.",
        "Confirmar assinatura/validacao de webhook, se existir.",
        "Confirmar ambiente sandbox."
      ],
      safetyNotes: [
        "Preservar integracao existente.",
        "Nao logar API Key.",
        "Nao fazer chamadas reais em producao sem acao explicita do usuario."
      ],
      configAction: {
        label: "Gerenciar",
        href: "#umbrella-configuracao",
        kind: "internal"
      }
    },
    {
      id: "mangofy",
      name: "Mangofy",
      displayName: "Mangofy",
      uiLabel: "Mangofy",
      description: "API Pix, checkout integrado e webhooks identificados, aguardando documentacao completa.",
      status: "awaiting_docs",
      docsStatus: "partial_public_spa",
      websiteUrl: "https://mangofy.com.br/",
      docsUrl: "https://app.mangofy.com.br/checkout/doc",
      logo: "/assets/gateways/mangofy.svg",
      logoAlt: "Logo da Mangofy",
      fallbackSymbol: "M",
      icon: CreditCard,
      isConfigured: false,
      integrationStatus: "PENDING",
      methods: ["pix", "credit_card", "boleto"],
      capabilities: {
        pixApi: true,
        checkout: true,
        transparentCheckout: true,
        multiDomainCheckout: true,
        checkoutSlimApi: true,
        webhooks: true,
        createTransaction: "pending_docs",
        refunds: "pending_docs",
        cashout: "not_confirmed",
        balance: "not_confirmed"
      },
      credentialFields: [
        {
          key: "authorization",
          label: "Authorization",
          type: "password",
          required: false,
          secret: true,
          helpText: "Header identificado na documentacao publica parcial. Validar formato oficial antes de implementar."
        },
        {
          key: "storeCode",
          label: "Store-Code",
          type: "text",
          required: false,
          secret: false,
          helpText: "Header Store-Code identificado na documentacao publica parcial."
        }
      ],
      docsReferences: [
        { label: "Mangofy Site", url: "https://mangofy.com.br/", type: "official_website" },
        { label: "Mangofy Checkout Docs", url: "https://app.mangofy.com.br/checkout/doc", type: "official_docs" }
      ],
      docsNotes: [
        "Site confirma API Pix, checkout integrado, checkout transparente de multiplos dominios e Checkout Slim API.",
        "Site confirma webhooks.",
        "Referencia publica parcial indica fluxos de criacao, consulta, estorno e postback, mas o adapter real fica bloqueado ate contrato completo.",
        "Detalhes completos de endpoints nao ficaram acessiveis publicamente com seguranca suficiente para implementar producao.",
        "API Key aparentemente depende de gestor."
      ],
      pendingQuestions: [
        "Solicitar API Key.",
        "Solicitar documentacao oficial completa.",
        "Solicitar base URL sandbox/producao.",
        "Solicitar headers/auth.",
        "Solicitar payload Pix/cartao/boleto.",
        "Solicitar documentacao de webhooks e assinatura.",
        "Solicitar lista de status.",
        "Solicitar endpoints de consulta e reembolso."
      ],
      safetyNotes: [
        "Nao implementar adapter real ate receber documentacao tecnica completa.",
        "Exibir como aguardando documentacao."
      ],
      configAction: {
        label: "Configurar",
        href: "#docs-mangofy",
        kind: "internal"
      }
    },
    {
      id: "sigilopay",
      name: "SigiloPay",
      displayName: "SigiloPay",
      uiLabel: "SigiloPay",
      description: "API Pix, checkout e tutoriais localizados, referencia tecnica completa pendente.",
      status: "awaiting_docs",
      docsStatus: "tutorial_public_reference_pending",
      websiteUrl: "https://www.sigilopay.com/",
      docsUrl: "https://www.sigilopay.com/tutorial/",
      logo: "/assets/gateways/sigilopay.svg",
      logoAlt: "Logo da SigiloPay",
      fallbackSymbol: "S",
      icon: ShieldCheck,
      isConfigured: false,
      integrationStatus: "PENDING",
      methods: ["pix"],
      capabilities: {
        pixApi: "pending_docs",
        checkout: "pending_docs",
        webhooks: "pending_docs",
        credentialsTutorial: true,
        createTransaction: "pending_docs",
        refunds: "pending_docs",
        cashout: "pending_docs",
        balance: "pending_docs",
        card: "pending_docs",
        boleto: "pending_docs"
      },
      credentialFields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          required: false,
          secret: true,
          helpText: "Tutorial publico menciona obtencao de credenciais."
        }
      ],
      docsReferences: [
        { label: "SigiloPay Site", url: "https://www.sigilopay.com/", type: "official_website" },
        { label: "SigiloPay Tutoriais", url: "https://www.sigilopay.com/tutorial/", type: "official_tutorial" },
        { label: "SigiloPay LP", url: "https://www.sigilopay.com/lp/", type: "official_website" }
      ],
      docsNotes: [
        "Site confirma gateway, plataforma/API Pix e checkout integrado.",
        "Tutoriais publicos mencionam obtencao de credenciais e criacao de webhook.",
        "Material publico menciona API simples e endpoints diretos, mas a referencia completa nao ficou acessivel."
      ],
      pendingQuestions: [
        "Solicitar link direto da documentacao API completa.",
        "Solicitar base URL.",
        "Solicitar autenticacao/header oficial.",
        "Solicitar payload de criacao de Pix.",
        "Solicitar endpoint de consulta de transacao.",
        "Solicitar payload e assinatura de webhook.",
        "Solicitar lista de status.",
        "Solicitar sandbox.",
        "Confirmar suporte a cartao/boleto via API."
      ],
      safetyNotes: [
        "Nao implementar adapter real ate receber documentacao tecnica completa.",
        "Exibir como aguardando documentacao."
      ],
      configAction: {
        label: "Configurar",
        href: "#docs-sigilopay",
        kind: "internal"
      }
    },
    {
      id: "lytronpay",
      name: "LytronPay",
      displayName: "LytronPay",
      uiLabel: "LytronPay",
      description: "API Reference v1.0 localizada, endpoints exigem acesso ou permissao.",
      status: "awaiting_docs",
      docsStatus: "readme_reference_gated",
      websiteUrl: "https://lytronpay.com/",
      docsUrl: "https://web.lytronpay.com/docs/api",
      logo: "/assets/gateways/lytronpay.svg",
      logoAlt: "Logo da LytronPay",
      fallbackSymbol: "L",
      icon: Landmark,
      isConfigured: false,
      integrationStatus: "PENDING",
      methods: [],
      capabilities: {
        apiReference: true,
        createTransaction: "pending_docs",
        checkout: "pending_docs",
        pix: "pending_docs",
        card: "pending_docs",
        boleto: "pending_docs",
        webhooks: "pending_docs",
        refunds: "pending_docs",
        cashout: "pending_docs",
        balance: "pending_docs"
      },
      credentialFields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          required: false,
          secret: true,
          helpText: "Aguardando acesso a API Reference completa."
        }
      ],
      docsReferences: [
        { label: "LytronPay Site", url: "https://lytronpay.com/", type: "official_website" },
        { label: "LytronPay API Docs", url: "https://web.lytronpay.com/docs/api", type: "official_docs" },
        { label: "LytronPay ReadMe Reference", url: "https://lytron-pay.readme.io/reference", type: "official_docs" }
      ],
      docsNotes: [
        "API Reference v1.0 foi localizada.",
        "Os endpoints detalhados nao ficaram disponiveis publicamente sem acesso/permissao.",
        "Nao assumir metodos de pagamento ou payloads ate receber documentacao completa."
      ],
      pendingQuestions: [
        "Solicitar acesso a documentacao ReadMe completa.",
        "Solicitar API Key/token.",
        "Solicitar base URL sandbox/producao.",
        "Solicitar endpoints de pagamento.",
        "Solicitar metodos suportados.",
        "Solicitar documentacao de webhooks.",
        "Solicitar assinatura de webhook.",
        "Solicitar status transacionais.",
        "Solicitar endpoints de consulta/reembolso."
      ],
      safetyNotes: [
        "Nao implementar adapter real ate receber documentacao tecnica completa.",
        "Exibir como aguardando acesso as docs."
      ],
      configAction: {
        label: "Configurar",
        href: "#docs-lytronpay",
        kind: "internal"
      }
    },
    {
      id: "allowpayments",
      name: "AllowPayments",
      displayName: "AllowPayments",
      uiLabel: "AllowPayments",
      description: "API, plugins e metodos de pagamento confirmados pelo site, docs tecnicas pendentes.",
      status: "awaiting_docs",
      docsStatus: "public_marketing_only",
      websiteUrl: "https://allowpayments.com/",
      appUrl: "https://app.allowpay.online/",
      loginUrl: "https://v2.allowpayments.net/login",
      logo: "/assets/gateways/allowpay.svg",
      logoAlt: "Logo da AllowPay",
      fallbackSymbol: "A",
      icon: FileText,
      isConfigured: false,
      integrationStatus: "PENDING",
      methods: ["pix", "boleto", "credit_card", "debit_card"],
      capabilities: {
        checkout: "pending_docs",
        ecommercePlugins: "pending_docs",
        api: "pending_docs",
        pix: "pending_docs",
        boleto: "pending_docs",
        card: "pending_docs",
        chargebackNotifications: "pending_docs",
        createTransaction: "pending_docs",
        webhooks: "pending_docs",
        refunds: "pending_docs",
        cashout: "pending_docs",
        balance: "pending_docs"
      },
      credentialFields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          required: false,
          secret: true,
          helpText: "Aguardando documentacao API oficial."
        }
      ],
      docsReferences: [
        { label: "AllowPayments Site", url: "https://allowpayments.com/", type: "official_website" },
        { label: "AllowPayments App", url: "https://app.allowpay.online/", type: "official_app" },
        { label: "AllowPayments Login", url: "https://v2.allowpayments.net/login", type: "official_login" }
      ],
      docsNotes: [
        "Site confirma Pix, boleto, cartoes nacionais/internacionais, APIs simples e plugins para e-commerce/checkout.",
        "Site menciona seguranca PCI DSS/LGPD e notificacoes de chargeback.",
        "Nao foi encontrada referencia publica completa de endpoints, headers ou payloads."
      ],
      pendingQuestions: [
        "Solicitar documentacao API oficial.",
        "Solicitar base URL sandbox/producao.",
        "Solicitar autenticacao/header.",
        "Solicitar endpoints Pix, boleto, cartao e debito.",
        "Solicitar payload de criacao de pagamento.",
        "Solicitar endpoint de consulta.",
        "Solicitar endpoint de estorno/reembolso.",
        "Solicitar documentacao de webhook.",
        "Solicitar assinatura/secret de webhook.",
        "Solicitar lista de status.",
        "Solicitar regras de chargeback."
      ],
      safetyNotes: [
        "Nao implementar adapter real ate receber documentacao tecnica completa.",
        "Exibir como aguardando documentacao."
      ],
      configAction: {
        label: "Configurar",
        href: "#docs-allowpayments",
        kind: "internal"
      }
    }
  ];
}
