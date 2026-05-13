import { CreditCard, FileText, Landmark, ShieldCheck, type LucideIcon } from "lucide-react";

export type GatewayId = "umbrella" | "tribopay" | "mangofy" | "sigilopay" | "lytronpay" | "allowpayments";
export type GatewayUiStatus = "configured" | "awaiting_docs" | "pending_credentials" | "disabled";
export type GatewayDocsStatus =
  | "ready_public_docs"
  | "partial_public_spa"
  | "tutorial_public_reference_pending"
  | "readme_reference_gated"
  | "readme_reference_public"
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
  const triboPayConfigured = Boolean(process.env.TRIBOPAY_API_TOKEN || process.env.TRIBOPAY_API_KEY);
  const lytronPayConfigured = Boolean(process.env.LYTRON_API_ACCESS_KEY || process.env.LYTRON_API_KEY);

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
      id: "tribopay",
      name: "TriboPay",
      displayName: "TriboPay",
      uiLabel: "TriboPay",
      description: "API publica para transacoes, produtos, saldo, saques, contas bancarias e postbacks.",
      status: triboPayConfigured ? "configured" : "pending_credentials",
      docsStatus: "ready_public_docs",
      websiteUrl: "https://docs.tribopay.com.br/",
      docsUrl: "https://docs.tribopay.com.br/",
      logo: "/assets/gateways/tribopay.svg",
      logoAlt: "Logo da TriboPay",
      fallbackSymbol: "T",
      icon: CreditCard,
      isConfigured: triboPayConfigured,
      integrationStatus: triboPayConfigured ? "CONNECTED" : "PENDING",
      methods: ["pix", "credit_card", "boleto"],
      capabilities: {
        publicApi: true,
        createTransaction: true,
        transactionLookup: true,
        transactionList: true,
        refunds: true,
        products: true,
        balance: true,
        transfers: true,
        installments: true,
        bankAccounts: true,
        postbacks: true,
        webhooks: true,
        cashout: "pending_docs"
      },
      credentialFields: [
        {
          key: "apiToken",
          label: "API token",
          type: "password",
          required: false,
          secret: true,
          helpText: "A documentacao indica uso do parametro api_token em todas as requisicoes."
        },
        {
          key: "baseUrl",
          label: "Base URL",
          type: "url",
          required: false,
          secret: false,
          placeholder: "https://api.tribopay.com.br/api/public/v1",
          helpText: "Base URL documentada para a API publica v1."
        },
        {
          key: "postbackUrl",
          label: "Postback URL",
          type: "url",
          required: false,
          secret: false,
          placeholder: "https://pay-flow.shop/api/webhooks/tribopay",
          helpText: "URL futura para receber mudancas de status quando o adapter real for implementado."
        }
      ],
      api: {
        baseUrl: "https://api.tribopay.com.br/api/public/v1",
        defaultHeaders: {
          "Content-Type": "application/json"
        },
        endpoints: [
          {
            key: "transactions.create",
            method: "POST",
            path: "/transactions",
            description: "Criar transacao com Pix, cartao de credito ou boleto.",
            authRequired: true,
            confirmed: true,
            notes: ["Autenticacao documentada via query parameter api_token."]
          },
          {
            key: "transactions.list",
            method: "GET",
            path: "/transactions",
            description: "Listar transacoes com filtros de paginacao e status.",
            authRequired: true,
            confirmed: true,
            notes: ["Status documentados: pending, paid, canceled e refunded."]
          },
          {
            key: "transactions.get",
            method: "GET",
            path: "/transactions/{hash}",
            description: "Consultar detalhes de uma transacao pelo hash.",
            authRequired: true,
            confirmed: true,
            notes: ["Autenticacao documentada via query parameter api_token."]
          },
          {
            key: "transactions.refund",
            method: "POST",
            path: "/transactions/{hash}/refund",
            description: "Solicitar reembolso total ou parcial de uma transacao paga.",
            authRequired: true,
            confirmed: true
          },
          {
            key: "products.list",
            method: "GET",
            path: "/products",
            description: "Listar produtos cadastrados na conta.",
            authRequired: true,
            confirmed: true
          },
          {
            key: "balance.get",
            method: "GET",
            path: "/balance",
            description: "Consultar saldo atual da conta.",
            authRequired: true,
            confirmed: true
          },
          {
            key: "transfers.create",
            method: "POST",
            path: "/transfers",
            description: "Solicitar transferencia do saldo disponivel.",
            authRequired: true,
            confirmed: true
          }
        ]
      },
      docsReferences: [
        { label: "TriboPay Docs", url: "https://docs.tribopay.com.br/", type: "official_docs" }
      ],
      docsNotes: [
        "Docs publicas encontradas.",
        "Base URL documentada: https://api.tribopay.com.br/api/public/v1.",
        "Autenticacao documentada por parametro api_token.",
        "A documentacao cobre transacoes, produtos, saldo e saques, contas bancarias e postbacks.",
        "Valores monetarios aparecem em centavos e payloads/respostas usam JSON."
      ],
      pendingQuestions: [
        "Confirmar token de sandbox e producao.",
        "Confirmar assinatura/validacao de postback.",
        "Confirmar payload completo de postback para todos os status.",
        "Confirmar regras de boleto, expiracao e reembolso.",
        "Confirmar fluxo definitivo de saques/cashout e contas bancarias."
      ],
      safetyNotes: [
        "Nao implementar chamadas reais sem credenciais e teste controlado.",
        "Nao expor api_token no frontend.",
        "Postbacks devem validar idempotencia e status desconhecidos."
      ],
      configAction: {
        label: "Configurar",
        href: "#docs-tribopay",
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
          key: "publicKey",
          label: "Chave publica",
          type: "text",
          required: false,
          secret: false,
          helpText: "Chave publica fornecida no material local. Endpoints ainda pendentes."
        },
        {
          key: "privateKey",
          label: "Chave privada",
          type: "password",
          required: false,
          secret: true,
          helpText: "Chave privada fornecida no material local. Nao expor no frontend."
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
      description: "API Reference v1.0 localizada para cobrancas Pix, consulta por TXID e webhooks.",
      status: lytronPayConfigured ? "configured" : "pending_credentials",
      docsStatus: "readme_reference_public",
      websiteUrl: "https://lytronpay.com/",
      docsUrl: "https://web.lytronpay.com/docs",
      logo: "/assets/gateways/lytronpay.svg",
      logoAlt: "Logo da LytronPay",
      fallbackSymbol: "L",
      icon: Landmark,
      isConfigured: lytronPayConfigured,
      integrationStatus: lytronPayConfigured ? "CONNECTED" : "PENDING",
      methods: ["pix"],
      capabilities: {
        apiReference: true,
        createTransaction: true,
        checkout: "pending_docs",
        pix: true,
        card: "pending_docs",
        boleto: "pending_docs",
        webhooks: "pending_docs",
        refunds: "pending_docs",
        payouts: true,
        cashout: true,
        balance: "pending_docs"
      },
      credentialFields: [
        {
          key: "apiAccessKey",
          label: "API Access Key",
          type: "password",
          required: false,
          secret: true,
          helpText: "Usada no header Api-Access-Key."
        },
        {
          key: "sellerId",
          label: "Seller ID",
          type: "text",
          required: false,
          secret: false,
          helpText: "Identificador do seller informado no material local."
        },
        {
          key: "apiSecretHash",
          label: "API Secret Hash",
          type: "password",
          required: false,
          secret: true,
          helpText: "Usado para assinar requests com Transaction-Hash quando houver body."
        }
      ],
      api: {
        baseUrl: "https://api.lytronpay.com/api/v1",
        defaultHeaders: {
          "Api-Access-Key": "{{LYTRON_API_ACCESS_KEY}}",
          "Content-Type": "application/json",
          "Transaction-Hash": "HMAC-SHA256(raw body, LYTRON_API_SECRET_HASH)"
        },
        endpoints: [
          {
            key: "charges.create",
            method: "POST",
            path: "/charges",
            description: "Criar cobranca Pix.",
            authRequired: true,
            confirmed: true
          },
          {
            key: "charges.get",
            method: "GET",
            path: "/charges/{txid}",
            description: "Buscar cobranca pelo TXID.",
            authRequired: true,
            confirmed: true
          },
          {
            key: "payouts.create",
            method: "POST",
            path: "/payouts",
            description: "Criar saque/payout.",
            authRequired: true,
            confirmed: true
          },
          {
            key: "webhooks.update",
            method: "PATCH",
            path: "/me/webhook",
            description: "Configurar webhook do seller.",
            authRequired: true,
            confirmed: true
          }
        ]
      },
      docsReferences: [
        { label: "LytronPay Site", url: "https://lytronpay.com/", type: "official_website" },
        { label: "LytronPay Docs", url: "https://web.lytronpay.com/docs", type: "official_docs" },
        { label: "LytronPay ReadMe Reference", url: "https://lytron-pay.readme.io/reference", type: "official_docs" },
        { label: "LytronPay OpenAPI", url: "https://api.lytronpay.com/docs/openapi.yaml", type: "official_docs" }
      ],
      docsNotes: [
        "O link oficial /docs redireciona para Lytron Pay API Reference no ReadMe.",
        "OpenAPI publica confirma base URL https://api.lytronpay.com/api/v1.",
        "Autenticacao por Api-Access-Key.",
        "Transaction-Hash e HMAC-SHA256 do corpo bruto usando o secret hash, recomendado em rotas com body.",
        "POST /charges cria cobranca Pix com amount, description e customer.",
        "GET /charges/{txid} consulta a cobranca.",
        "PATCH /me/webhook configura webhook do seller."
      ],
      pendingQuestions: [
        "Validar em producao os eventos enviados para o webhook.",
        "Confirmar assinatura dos eventos recebidos no webhook.",
        "Solicitar status transacionais.",
        "Solicitar endpoints de reembolso, se existirem."
      ],
      safetyNotes: [
        "Adapter real iniciado apenas no servidor.",
        "Nao expor Api-Access-Key, seller id sensivel ou secret hash no frontend.",
        "Nao logar Transaction-Hash, Api-Access-Key ou payloads com dados sensiveis."
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
          key: "secretKey",
          label: "Secret Key",
          type: "password",
          required: false,
          secret: true,
          helpText: "Secret key fornecida no material local. Endpoints ainda pendentes."
        },
        {
          key: "companyId",
          label: "Company ID",
          type: "text",
          required: false,
          secret: false,
          helpText: "Identificador da empresa fornecido no material local."
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
