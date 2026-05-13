import { UmbrellaProvider } from "@/providers/payments/umbrella";
import { TriboPayProvider, type TriboPayCreateTransactionInput } from "@/providers/payments/tribopay";
import { LytronPayProvider, type LytronPayCreatePixChargeInput } from "@/providers/payments/lytronpay";
import type { GatewayId, PaymentGatewayConfig } from "@/server/gateways/registry";
import { getGatewayRegistry } from "@/server/gateways/registry";

export type PaymentGatewayAdapter = {
  id: GatewayId;
  isConfigured(): boolean;
  getDocs(): PaymentGatewayConfig;
  validateCredentials?(credentials: unknown): Promise<boolean>;
  createTransaction?(payload: unknown): Promise<unknown>;
  getTransaction?(id: string): Promise<unknown>;
  registerWebhook?(payload: unknown): Promise<unknown>;
};

class UmbrellaGatewayAdapter implements PaymentGatewayAdapter {
  id: GatewayId = "umbrella";

  isConfigured() {
    return Boolean((process.env.UMBRELLA_API_BASE_URL || process.env.UMBRELLAPAG_BASE_URL) && (process.env.UMBRELLA_API_KEY || process.env.UMBRELLAPAG_API_KEY));
  }

  getDocs() {
    return findGateway("umbrella");
  }

  async validateCredentials() {
    const result = await new UmbrellaProvider().testConnection();
    return result.ok;
  }
}

class TriboPayGatewayAdapter implements PaymentGatewayAdapter {
  id: GatewayId = "tribopay";

  isConfigured() {
    return Boolean(process.env.TRIBOPAY_API_TOKEN || process.env.TRIBOPAY_API_KEY);
  }

  getDocs() {
    return findGateway("tribopay");
  }

  async validateCredentials() {
    const result = await new TriboPayProvider().testConnection();
    return result.ok;
  }

  async createTransaction(payload: unknown): Promise<unknown> {
    return new TriboPayProvider().createTransaction(payload as TriboPayCreateTransactionInput);
  }

  async getTransaction(id: string): Promise<unknown> {
    return new TriboPayProvider().getTransaction(id);
  }

  async registerWebhook(): Promise<unknown> {
    throw new Error("A TriboPay usa postback_url por transacao. Configure a URL /api/webhooks/tribopay ao criar a transacao.");
  }
}

class LytronPayGatewayAdapter implements PaymentGatewayAdapter {
  id: GatewayId = "lytronpay";

  isConfigured() {
    return Boolean(process.env.LYTRON_API_ACCESS_KEY || process.env.LYTRON_API_KEY);
  }

  getDocs() {
    return findGateway("lytronpay");
  }

  async validateCredentials() {
    const result = await new LytronPayProvider().testConnection();
    return result.ok;
  }

  async createTransaction(payload: unknown): Promise<unknown> {
    return new LytronPayProvider().createTransaction(payload as LytronPayCreatePixChargeInput);
  }

  async getTransaction(id: string): Promise<unknown> {
    return new LytronPayProvider().getTransaction(id);
  }
}

class PendingGatewayAdapter implements PaymentGatewayAdapter {
  constructor(public id: Exclude<GatewayId, "umbrella" | "tribopay" | "lytronpay">) {}

  isConfigured() {
    return false;
  }

  getDocs() {
    return findGateway(this.id);
  }

  async validateCredentials(): Promise<boolean> {
    throw new Error("Documentacao oficial pendente. Credenciais ainda nao podem ser validadas com seguranca.");
  }

  async createTransaction(): Promise<unknown> {
    throw new Error("Integracao ainda nao implementada. Envie a documentacao oficial antes de chamadas reais.");
  }
}

export function getPaymentGatewayAdapter(id: GatewayId): PaymentGatewayAdapter {
  if (id === "umbrella") return new UmbrellaGatewayAdapter();
  if (id === "tribopay") return new TriboPayGatewayAdapter();
  if (id === "lytronpay") return new LytronPayGatewayAdapter();
  return new PendingGatewayAdapter(id);
}

function findGateway(id: GatewayId) {
  const gateway = getGatewayRegistry().find((item) => item.id === id);
  if (!gateway) throw new Error(`Gateway nao registrado: ${id}`);
  return gateway;
}
