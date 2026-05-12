import type { RecoveryAttemptRecord } from "@/lib/types";
import { logger } from "@/lib/logger";

export interface RecoveryQueue {
  enqueueAttempt(attempt: RecoveryAttemptRecord): Promise<void>;
  cancelPayment(paymentId: string): Promise<void>;
  retryFailed(paymentId: string): Promise<void>;
}

export class MockRecoveryQueue implements RecoveryQueue {
  async enqueueAttempt(attempt: RecoveryAttemptRecord) {
    logger.info("Mock recovery attempt scheduled", {
      attemptId: attempt.id,
      paymentId: attempt.paymentId,
      scheduledAt: attempt.scheduledAt
    });
  }

  async cancelPayment(paymentId: string) {
    logger.info("Mock recovery queue cancelled", { paymentId });
  }

  async retryFailed(paymentId: string) {
    logger.info("Mock recovery retry requested", { paymentId });
  }
}

export function getRecoveryQueue(): RecoveryQueue {
  // TODO: retornar BullMQRecoveryQueue quando REDIS_URL estiver configurado.
  return new MockRecoveryQueue();
}
