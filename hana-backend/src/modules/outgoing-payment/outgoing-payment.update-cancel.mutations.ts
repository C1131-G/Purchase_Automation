// Outgoing Payment Service: Manages payment transactions to vendors. Uses HANA database for listings and SAP Service Layer for payment creation.
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { serviceLayerClient } from "@/services/service-layer.service";
// Fetches a paginated list of Outgoing Payments from HANA.

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

    // Allow direct PaymentMode update if provided and valid
    const allowedModes = ["M-Pesa", "My Cash", "EFTPOS", "Direct Pay", "CASH"];
    if (payload.PaymentMode && allowedModes.includes(payload.PaymentMode as string)) {
      sapPayload.U_Mode_Pay = payload.PaymentMode;
    }

    await serviceLayerClient.request(sessionId, "PATCH", `/VendorPayments(${id})`, sapPayload);

    // Invalidate purchase-related dashboard metrics for the tenant.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dashboard:overview:${session.companyDB}`);
    }

    return { message: "Outgoing Payment updated successfully", success: true };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to update Outgoing Payment",
    });
    throw caughtError;
  }
};

// Cancels the outgoing payment document in SAP B1.

export const cancelPayment = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/VendorPayments(${id})/Cancel`);

    // Dashboard must be cleared to reflect the reinstatement of the payable.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dashboard:overview:${session.companyDB}`);
    }

    return {
      message: "Outgoing Payment cancelled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to cancel Outgoing Payment in Service Layer",
    });
    throw caughtError;
  }
};

// Backfills U_Mode_Pay for existing OVPM rows via SAP Service Layer.
