// Incoming Payment Service: Logic for processing payments from customers. Manages HANA database lookups for listings and SAP Service Layer for payment transactions.

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { serviceLayerClient } from "@/services/service-layer.service";
// Fetches a paginated list of Incoming Payments from HANA.

export const updatePayment = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};
    if (payload.Remarks) {
      sapPayload.Remarks = payload.Remarks;
    }
    if (payload.Reference) {
      sapPayload.Reference = payload.Reference;
    }

    await serviceLayerClient.request(sessionId, "PATCH", `/IncomingPayments(${id})`, sapPayload);

    // Clear dashboard cache for the tenant to ensure consistency.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return { message: "Incoming Payment updated successfully", success: true };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to update Incoming Payment",
    });
    throw caughtError;
  }
};

// Triggers the cancellation workflow for a payment document in SAP B1.

export const cancelPayment = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/IncomingPayments(${id})/Cancel`);

    // Must clear dashboard cache as receivables will increase upon payment cancellation.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: "Incoming Payment cancelled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to cancel Incoming Payment in Service Layer",
    });
    throw caughtError;
  }
};
