import type {
  AppUser,
  CampaignRecord,
  ConversationRecord,
  CustomerRecord,
  IntegrationRecord,
  OfferRecord,
  PaymentRecord,
  ProductRecord,
  RecoveryAttemptRecord,
  RecoveryFlowRecord,
  WorkspaceSummary
} from "@/lib/types";

export const FALLBACK_WORKSPACE_ID = "payflow-workspace";

export type TrackingEventRecord = {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  paymentId?: string | null;
  offerId?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  fbclid?: string | null;
  clickId?: string | null;
  eventType: string;
  rawPayloadJson?: unknown;
  createdAt: string;
};

type RuntimeStore = {
  workspace: WorkspaceSummary;
  users: AppUser[];
  products: ProductRecord[];
  offers: OfferRecord[];
  customers: CustomerRecord[];
  conversations: ConversationRecord[];
  payments: PaymentRecord[];
  recoveryFlows: RecoveryFlowRecord[];
  recoveryAttempts: RecoveryAttemptRecord[];
  campaigns: CampaignRecord[];
  integrations: IntegrationRecord[];
  trackingEvents: TrackingEventRecord[];
  webhookExternalIds: Set<string>;
  auditLogs: Array<{ action: string; entity: string; entityId?: string; createdAt: string; metadata?: unknown }>;
};

function createRuntimeStore(): RuntimeStore {
  return {
    workspace: {
      id: FALLBACK_WORKSPACE_ID,
      name: "PayFlow",
      slug: "payflow"
    },
    users: [],
    products: [],
    offers: [],
    customers: [],
    conversations: [],
    payments: [],
    recoveryFlows: [],
    recoveryAttempts: [],
    campaigns: [],
    integrations: [],
    trackingEvents: [],
    webhookExternalIds: new Set<string>(),
    auditLogs: []
  };
}

const globalForRuntime = globalThis as unknown as { payflowRuntimeStore?: RuntimeStore };

export const runtimeStore = globalForRuntime.payflowRuntimeStore ?? createRuntimeStore();

if (!globalForRuntime.payflowRuntimeStore) {
  globalForRuntime.payflowRuntimeStore = runtimeStore;
}

export function resetRuntimeStore() {
  const fresh = createRuntimeStore();
  Object.assign(runtimeStore, fresh);
}
