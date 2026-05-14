ALTER TABLE "IntegrationAccount" ALTER COLUMN "status" SET DEFAULT 'DISCONNECTED';

DELETE FROM "Workspace" WHERE "slug" = 'payflow-demo';
DELETE FROM "User" WHERE "email" IN ('admin@payflow.local', 'marina@payflow.local');

CREATE INDEX IF NOT EXISTS "Payment_workspaceId_createdAt_idx" ON "Payment"("workspaceId", "createdAt");
CREATE INDEX IF NOT EXISTS "Payment_workspaceId_provider_createdAt_idx" ON "Payment"("workspaceId", "provider", "createdAt");
CREATE INDEX IF NOT EXISTS "Payment_workspaceId_status_createdAt_idx" ON "Payment"("workspaceId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Payment_workspaceId_paidAt_idx" ON "Payment"("workspaceId", "paidAt");
CREATE INDEX IF NOT EXISTS "RecoveryAttempt_workspaceId_status_scheduledAt_idx" ON "RecoveryAttempt"("workspaceId", "status", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Campaign_workspaceId_provider_updatedAt_idx" ON "Campaign"("workspaceId", "provider", "updatedAt");
