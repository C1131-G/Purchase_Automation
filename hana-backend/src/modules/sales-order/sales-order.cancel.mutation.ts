// Sales Order Service: Orchestrates order processing flows. Interfaces with HANA for high-volume order queries and Service Layer for document lifecycle management (Creation, Update, Cancellation).

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { serviceLayerClient } from "@/services/service-layer.service";
// Fetches a filtered and paginated list of Sales Orders from the tenant-specific HANA database.
// Uses a UNION ALL pattern to combine final documents (ORDR) with drafts (ODRF, ObjType='17').

export const cancelSalesOrder = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/Orders(${id})/Cancel`);

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:sales:${session.companyDB}:`);
    }

    return {
      message: "Sales Order canceled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      id,
      msg: "Failed to cancel sales order in Service Layer",
    });
    throw caughtError;
  }
};

// Fetches the active list of Sales Employees (Sales Persons) from the tenant's HANA DB.
