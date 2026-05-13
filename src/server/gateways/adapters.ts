import { UmbrellaProvider } from "@/providers/payments/umbrella";
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

class PendingGatewayAdapter implements PaymentGatewayAdapter {
  constructor(public id: Exclude<GatewayId, "umbrella">) {}

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
  return new PendingGatewayAdapter(id);
}

function findGateway(id: GatewayId) {
  const gateway = getGatewayRegistry().find((item) => item.id === id);
  if (!gateway) throw new Error(`Gateway nao registrado: ${id}`);
  return gateway;
}
