ALTER TABLE "Customer"
ADD COLUMN "ctwaClid" TEXT,
ADD COLUMN "ctwaSourceId" TEXT,
ADD COLUMN "ctwaSourceUrl" TEXT,
ADD COLUMN "ctwaHeadline" TEXT,
ADD COLUMN "ctwaCapturedAt" TIMESTAMP(3);

CREATE INDEX "Customer_workspaceId_ctwaClid_idx" ON "Customer"("workspaceId", "ctwaClid");
