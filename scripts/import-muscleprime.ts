import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

type CatalogStore = {
  name: string;
  slug: string;
  description?: string;
};

type CatalogProduct = {
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
  price: number;
  categoryName?: string | null;
  unavailable?: boolean;
};

type CatalogData = {
  store: CatalogStore;
  products: CatalogProduct[];
};

const OFFER_SLUG = "muscleprime-brasil";
const PUBLIC_CATALOG_URL = "https://pay-flow.shop/catalogos/muscleprime-brasil/";
const DEFAULT_WHATSAPP_NUMBER = "5519987264568";

loadEnvFile(path.join(process.cwd(), ".env.production.local"), true);
loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const prisma = new PrismaClient();

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function main() {
  const trafficEnv = parseEnvFile(process.env.MUSCLEPRIME_TRAFFIC_ENV_FILE);
  const catalog = readCatalog();
  const workspace = await getWorkspace();
  const minPrice = getMinPrice(catalog.products);
  const catalogProduct = await prisma.product.upsert({
    where: { id: "mp-catalog-muscleprime-brasil" },
    create: {
      id: "mp-catalog-muscleprime-brasil",
      workspaceId: workspace.id,
      name: "MusclePrime Brasil - Catalogo",
      description: `Catalogo importado com ${catalog.products.length} produtos. Preco final varia conforme item escolhido no atendimento.`,
      price: minPrice,
      category: "Catalogo",
      status: "ACTIVE"
    },
    update: {
      workspaceId: workspace.id,
      description: `Catalogo importado com ${catalog.products.length} produtos. Preco final varia conforme item escolhido no atendimento.`,
      price: minPrice,
      status: "ACTIVE"
    }
  });

  let importedProducts = 0;
  for (const product of catalog.products) {
    await prisma.product.upsert({
      where: { id: productId(product.id) },
      create: {
        id: productId(product.id),
        workspaceId: workspace.id,
        name: truncate(clean(product.name), 160),
        description: buildProductDescription(product),
        price: Number(product.price),
        category: truncate(clean(product.categoryName ?? "MusclePrime"), 80),
        status: product.unavailable ? "PAUSED" : "ACTIVE"
      },
      update: {
        workspaceId: workspace.id,
        name: truncate(clean(product.name), 160),
        description: buildProductDescription(product),
        price: Number(product.price),
        category: truncate(clean(product.categoryName ?? "MusclePrime"), 80),
        status: product.unavailable ? "PAUSED" : "ACTIVE"
      }
    });
    importedProducts += 1;
  }

  const offer = await prisma.offer.upsert({
    where: {
      workspaceId_slug: {
        workspaceId: workspace.id,
        slug: OFFER_SLUG
      }
    },
    create: {
      workspaceId: workspace.id,
      productId: catalogProduct.id,
      name: "MusclePrime Brasil",
      slug: OFFER_SLUG,
      price: minPrice,
      salesPageUrl: PUBLIC_CATALOG_URL,
      checkoutUrl: null,
      status: "ACTIVE",
      tags: ["whatsapp", "meta-ads", "catalogo", "preco-variavel"],
      trafficSourceDefault: "meta",
      defaultUtmSource: "meta",
      defaultUtmMedium: "paid_social",
      defaultUtmCampaign: "muscleprime_brasil_whatsapp_x1",
      defaultUtmContent: "whatsapp_catalogo"
    },
    update: {
      productId: catalogProduct.id,
      name: "MusclePrime Brasil",
      price: minPrice,
      salesPageUrl: PUBLIC_CATALOG_URL,
      status: "ACTIVE",
      tags: ["whatsapp", "meta-ads", "catalogo", "preco-variavel"],
      trafficSourceDefault: "meta",
      defaultUtmSource: "meta",
      defaultUtmMedium: "paid_social",
      defaultUtmCampaign: "muscleprime_brasil_whatsapp_x1",
      defaultUtmContent: "whatsapp_catalogo"
    }
  });

  await prisma.campaign.upsert({
    where: { id: "campaign-muscleprime-brasil-meta-whatsapp" },
    create: {
      id: "campaign-muscleprime-brasil-meta-whatsapp",
      workspaceId: workspace.id,
      provider: "META_ADS",
      providerCampaignId: "meta-pending-muscleprime-brasil-whatsapp",
      name: "MusclePrime Brasil - WhatsApp X1",
      status: "ACTIVE",
      objective: "Conversas no WhatsApp",
      dateStart: new Date()
    },
    update: {
      workspaceId: workspace.id,
      provider: "META_ADS",
      name: "MusclePrime Brasil - WhatsApp X1",
      status: "ACTIVE",
      objective: "Conversas no WhatsApp"
    }
  });

  await upsertTrafficIntegrations(workspace.id, trafficEnv);

  console.log(
    JSON.stringify(
      {
        ok: true,
        workspace: workspace.slug,
        offer: offer.slug,
        catalogUrl: PUBLIC_CATALOG_URL,
        productsImported: importedProducts,
        minPrice,
        whatsappRedirectNumber: normalizePhone(process.env.MUSCLEPRIME_WHATSAPP_NUMBER) || DEFAULT_WHATSAPP_NUMBER,
        metaPixelConfigured: Boolean(readEnv("META_PIXEL_ID", trafficEnv) || readEnv("NEXT_PUBLIC_META_PIXEL_ID", trafficEnv)),
        utmifyConfigured: Boolean(readEnv("UTMIFY_API_TOKEN", trafficEnv) || readEnv("UTMIFY_API_KEY", trafficEnv))
      },
      null,
      2
    )
  );
}

function readCatalog(): CatalogData {
  const file = path.join(process.cwd(), "public", "catalogos", OFFER_SLUG, "catalog-data.js");
  const source = fs.readFileSync(file, "utf8");
  const match = source.match(/window\.CATALOG_DATA\s*=\s*([\s\S]*?);\s*$/);
  if (!match) throw new Error("Catalogo MusclePrime sem window.CATALOG_DATA");
  return JSON.parse(match[1]) as CatalogData;
}

async function getWorkspace() {
  const workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  if (workspace) return workspace;

  return prisma.workspace.create({
    data: {
      id: "workspace-default",
      name: "PayFlow",
      slug: "payflow"
    }
  });
}

async function upsertTrafficIntegrations(workspaceId: string, env: Record<string, string>) {
  const pixelId = readEnv("META_PIXEL_ID", env) || readEnv("NEXT_PUBLIC_META_PIXEL_ID", env);
  const adAccountId = readEnv("META_AD_ACCOUNT_ID", env);
  const metaConfigured = Boolean(pixelId && adAccountId && (readEnv("META_ACCESS_TOKEN", env) || readEnv("META_MARKETING_ACCESS_TOKEN", env)));
  const utmifyEndpoint = readEnv("UTMIFY_ENDPOINT", env) || readEnv("UTMIFY_API_BASE_URL", env);
  const utmifyConfigured = Boolean(utmifyEndpoint && (readEnv("UTMIFY_API_TOKEN", env) || readEnv("UTMIFY_API_KEY", env)));
  const whatsappNumber = normalizePhone(process.env.MUSCLEPRIME_WHATSAPP_NUMBER) || DEFAULT_WHATSAPP_NUMBER;

  await prisma.integrationAccount.upsert({
    where: { workspaceId_provider: { workspaceId, provider: "META_ADS" } },
    create: {
      workspaceId,
      provider: "META_ADS",
      status: metaConfigured ? "CONNECTED" : "MOCK",
      configJson: {
        offerSlug: OFFER_SLUG,
        pixelId,
        adAccountId,
        businessId: readEnv("META_BUSINESS_ID", env),
        pageId: readEnv("META_PAGE_ID", env),
        graphApiVersion: readEnv("META_GRAPH_API_VERSION", env) || "v25.0"
      }
    },
    update: {
      status: metaConfigured ? "CONNECTED" : "MOCK",
      errorMessage: null,
      configJson: {
        offerSlug: OFFER_SLUG,
        pixelId,
        adAccountId,
        businessId: readEnv("META_BUSINESS_ID", env),
        pageId: readEnv("META_PAGE_ID", env),
        graphApiVersion: readEnv("META_GRAPH_API_VERSION", env) || "v25.0"
      }
    }
  });

  await prisma.integrationAccount.upsert({
    where: { workspaceId_provider: { workspaceId, provider: "UTMIFY" } },
    create: {
      workspaceId,
      provider: "UTMIFY",
      status: utmifyConfigured ? "CONNECTED" : "MOCK",
      configJson: {
        offerSlug: OFFER_SLUG,
        endpoint: utmifyEndpoint,
        hasApiToken: Boolean(readEnv("UTMIFY_API_TOKEN", env) || readEnv("UTMIFY_API_KEY", env))
      }
    },
    update: {
      status: utmifyConfigured ? "CONNECTED" : "MOCK",
      errorMessage: null,
      configJson: {
        offerSlug: OFFER_SLUG,
        endpoint: utmifyEndpoint,
        hasApiToken: Boolean(readEnv("UTMIFY_API_TOKEN", env) || readEnv("UTMIFY_API_KEY", env))
      }
    }
  });

  await prisma.integrationAccount.upsert({
    where: { workspaceId_provider: { workspaceId, provider: "WHATSAPP" } },
    create: {
      workspaceId,
      provider: "WHATSAPP",
      status: "CONNECTED",
      configJson: {
        redirectNumber: whatsappNumber,
        offerSlug: OFFER_SLUG
      }
    },
    update: {
      status: "CONNECTED",
      errorMessage: null,
      configJson: {
        redirectNumber: whatsappNumber,
        offerSlug: OFFER_SLUG
      }
    }
  });
}

function parseEnvFile(filePath?: string | null) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = unquote(line.slice(index + 1).trim());
        return [key, value];
      })
  );
}

function loadEnvFile(filePath: string, override = false) {
  for (const [key, value] of Object.entries(parseEnvFile(filePath))) {
    if (override || !process.env[key]) process.env[key] = value;
  }
}

function readEnv(key: string, fallback: Record<string, string>) {
  return process.env[key] || fallback[key] || "";
}

function unquote(value: string) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function productId(id: string) {
  return `mp-prod-${id.replace(/[^a-zA-Z0-9-]/g, "-")}`;
}

function buildProductDescription(product: CatalogProduct) {
  const parts = [
    clean(product.description),
    product.code ? `Codigo catalogo: ${clean(product.code)}` : null,
    product.categoryName ? `Categoria: ${clean(product.categoryName)}` : null
  ].filter(Boolean);
  return truncate(parts.join(" | "), 600) || null;
}

function getMinPrice(products: CatalogProduct[]) {
  const prices = products.map((product) => Number(product.price)).filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : 1;
}

function normalizePhone(value?: string | null) {
  return value?.replace(/\D/g, "") || "";
}

function clean(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function truncate(value: string, max: number) {
  return value.length > max ? value.slice(0, max - 1).trimEnd() : value;
}
