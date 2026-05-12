export type UserRole = "OWNER" | "ADMIN" | "ATTENDANT" | "VIEWER";
export type IntegrationProvider = "WHATSAPP" | "META_ADS" | "UMBRELLA" | "UTMIFY";
export type IntegrationStatus = "CONNECTED" | "DISCONNECTED" | "ERROR" | "MOCK";
export type OfferStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export type ProductStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export type CustomerStatus =
  | "NEW"
  | "IN_SERVICE"
  | "PAYMENT_PENDING"
  | "BUYER"
  | "RECOVERED"
  | "LOST";
export type ConversationStatus =
  | "OPEN"
  | "UNANSWERED"
  | "WAITING_CUSTOMER"
  | "RESOLVED"
  | "PAYMENT_PENDING"
  | "RECOVERY";
export type MessageDirection = "INBOUND" | "OUTBOUND" | "INTERNAL";
export type MessageStatus = "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "RECEIVED";
export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "WAITING_PAYMENT"
  | "PIX_GENERATED"
  | "BOLETO_GENERATED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "PAID"
  | "REFUNDED"
  | "CHARGEBACK";
export type RecoveryAttemptStatus = "SCHEDULED" | "SENT" | "FAILED" | "CANCELLED" | "CONVERTED";
export type CampaignStatus = "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  workspaceId: string;
};

export type ProductRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type OfferRecord = {
  id: string;
  workspaceId: string;
  productId?: string | null;
  productName?: string | null;
  name: string;
  slug: string;
  price: number;
  salesPageUrl?: string | null;
  checkoutUrl?: string | null;
  status: OfferStatus;
  tags: string[];
  trafficSourceDefault?: string | null;
  defaultUtmSource?: string | null;
  defaultUtmMedium?: string | null;
  defaultUtmCampaign?: string | null;
  visits: number;
  checkoutStarts: number;
  paymentsGenerated: number;
  paymentsApproved: number;
  abandonments: number;
  recoveries: number;
  allowExpiredRecovery: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerRecord = {
  id: string;
  workspaceId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  document?: string | null;
  tags: string[];
  source?: string | null;
  lastCampaign?: string | null;
  lastOffer?: string | null;
  totalPurchases: number;
  status: CustomerStatus;
  doNotContact: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MessageRecord = {
  id: string;
  workspaceId: string;
  conversationId: string;
  customerId: string;
  direction: MessageDirection;
  body: string;
  status: MessageStatus;
  providerMessageId?: string | null;
  metadataJson?: unknown;
  createdAt: string;
};

export type ConversationRecord = {
  id: string;
  workspaceId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  assignedToName?: string | null;
  status: ConversationStatus;
  tags: string[];
  lastMessageAt?: string | null;
  linkedOfferId?: string | null;
  linkedPaymentId?: string | null;
  messages: MessageRecord[];
};

export type PaymentRecord = {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  offerId?: string | null;
  offerName?: string | null;
  provider: "UMBRELLA" | "MOCK";
  providerPaymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethod?: string | null;
  checkoutUrl?: string | null;
  pixCode?: string | null;
  boletoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  expiresAt?: string | null;
};

export type RecoveryFlowRecord = {
  id: string;
  workspaceId: string;
  offerId?: string | null;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  firstDelayMinutes: number;
  secondDelayMinutes: number;
  thirdDelayMinutes: number;
  maxAttempts: number;
  allowedStartHour: number;
  allowedEndHour: number;
  template1: string;
  template2: string;
  template3: string;
  stopOnPaid: boolean;
};

export type RecoveryAttemptRecord = {
  id: string;
  workspaceId: string;
  recoveryFlowId?: string | null;
  paymentId: string;
  customerId?: string | null;
  conversationId?: string | null;
  status: RecoveryAttemptStatus;
  attemptNumber: number;
  templateUsed?: string | null;
  scheduledAt: string;
  sentAt?: string | null;
  convertedAt?: string | null;
  errorMessage?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  offerName?: string | null;
  paymentStatus?: PaymentStatus;
  amount?: number;
};

export type CampaignRecord = {
  id: string;
  workspaceId: string;
  provider: "META_ADS" | "MOCK";
  providerCampaignId?: string | null;
  name: string;
  status: CampaignStatus;
  objective?: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  revenue: number;
  roas: number;
  cpa: number;
  dateStart?: string | null;
  dateEnd?: string | null;
};

export type IntegrationRecord = {
  id: string;
  workspaceId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  lastSyncAt?: string | null;
  errorMessage?: string | null;
  logs: string[];
};

export type DashboardMetric = {
  label: string;
  value: string;
  delta?: string;
  tone?: "default" | "success" | "warning" | "danger";
};

export type DashboardSnapshot = {
  metrics: DashboardMetric[];
  revenueByDay: Array<{ date: string; revenue: number }>;
  paymentsByStatus: Array<{ status: PaymentStatus; count: number }>;
  conversationsByStatus: Array<{ status: ConversationStatus; count: number }>;
  topCampaigns: CampaignRecord[];
  offersByAbandonment: OfferRecord[];
};

export type ReportRow = {
  group: string;
  revenue: number;
  abandonments: number;
  recoveries: number;
  conversions: number;
};
