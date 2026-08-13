// Purchase Order Reconciliation Utility
// After a GRPO or A/P Invoice is saved, walks back to the originating PO
// and closes it if the total consumed quantity meets or exceeds the ordered quantity.

import { logger } from "@/core/logger/pino-logger";
import { getTenantRepository } from "@/db/tenant-query";
import { GRPOHeaderSchema } from "@/db/schemas/grpoheader.schema";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";

// SAP Object Types
const BASE_TYPE_PURCHASE_ORDER = 22;
const BASE_TYPE_GRPO = 20;

/**
 * Reconciles the originating PO after a GRPO or A/P Invoice save.
 * Finds the PO from base linkage fields, checks if all lines are fully consumed,
 * and closes the PO via SAP if so.
 */
export async function reconcilePOAfterCopyTo(
  sessionId: string,
  dbName: string,
  documentLines: Record<string, unknown>[],
): Promise<void> {
  // Collect unique PO DocEntries from lines that reference a PO
  const poDocEntries = new Set<number>();
  const grpoDocEntries = new Set<number>();

  for (const line of documentLines) {
    const baseType = Number(line.BaseType);
    const baseEntry = Number(line.BaseEntry);

    if (!Number.isFinite(baseType) || !Number.isFinite(baseEntry)) {
      continue;
    }

    if (baseType === BASE_TYPE_PURCHASE_ORDER) {
      poDocEntries.add(baseEntry);
    } else if (baseType === BASE_TYPE_GRPO) {
      grpoDocEntries.add(baseEntry);
    }
  }

  // AP Invoice copy-from GRPO: resolve every originating PO in one HANA query.
  const grpoPurchaseOrderEntries = await findPOsFromGRPOs(dbName, [...grpoDocEntries]);
  for (const poEntry of grpoPurchaseOrderEntries) {
    poDocEntries.add(poEntry);
  }

  if (poDocEntries.size === 0) {
    return;
  }

  for (const poDocEntry of poDocEntries) {
    await closePOIfFullyConsumed(sessionId, dbName, poDocEntry);
  }
}

/**
 * Walks back from a GRPO to find the originating PO DocEntry.
 * Queries PDN1 for the GRPO's lines and extracts the baseEntry (PO DocEntry).
 */
async function findPOsFromGRPOs(dbName: string, grpoDocEntries: number[]): Promise<number[]> {
  if (grpoDocEntries.length === 0) {
    return [];
  }

  try {
    const pdn1Repo = await getTenantRepository(dbName, GRPOHeaderSchema);
    const pdn1Lines = await pdn1Repo
      .createQueryBuilder("pdn1")
      .select("pdn1.baseEntry", "baseEntry")
      .distinct(true)
      .where("pdn1.docEntry IN (:...docEntries)", { docEntries: grpoDocEntries })
      .andWhere("pdn1.baseType = :baseType", {
        baseType: BASE_TYPE_PURCHASE_ORDER,
      })
      .getRawMany<{ baseEntry: number | string }>();

    return pdn1Lines
      .map((line) => Number(line.baseEntry))
      .filter((baseEntry) => Number.isFinite(baseEntry));
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.warn({
      err: caughtError,
      grpoDocEntries,
      msg: "Failed to find POs from GRPOs during reconciliation",
    });
    return [];
  }
}

/**
 * Checks if a PO is fully consumed (all lines delivered) and closes it via SAP if so.
 */
async function closePOIfFullyConsumed(
  sessionId: string,
  dbName: string,
  poDocEntry: number,
): Promise<void> {
  try {
    // Fetch the PO from Service Layer to check open quantities
    const purchaseOrder = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/PurchaseOrders(${poDocEntry})`,
    )) as SAPDocumentResponse;

    if (!purchaseOrder?.DocumentLines?.length) {
      return;
    }

    // Check if all lines have OpenQty <= 0
    let allLinesClosed = true;
    for (const line of purchaseOrder.DocumentLines) {
      const lineData = line as unknown as Record<string, unknown>;
      const openQty = Number(
        lineData.OpenQty ??
          lineData.OpenQuantity ??
          lineData.RemainingOpenQuantity ??
          lineData.RemainingQuantity ??
          lineData.BaseOpenQuantity ??
          line.Quantity ??
          0,
      );
      if (openQty > 0) {
        allLinesClosed = false;
        break;
      }
    }

    if (!allLinesClosed) {
      return;
    }

    // PO docStatus check
    if (purchaseOrder.DocumentStatus === "bost_Close" || purchaseOrder.DocumentStatus === "C") {
      logger.info({
        msg: "PO already closed, skipping reconciliation",
        poDocEntry,
        poDocNum: purchaseOrder.DocNum,
      });
      return;
    }

    // Also verify via PDN1 that total delivered >= total ordered
    const pdn1Repo = await getTenantRepository(dbName, GRPOHeaderSchema);
    const totalOrdered = purchaseOrder.DocumentLines.reduce(
      (sum, line) => sum + Number(line.Quantity ?? 0),
      0,
    );
    const deliveredLines = await pdn1Repo
      .createQueryBuilder("pdn1")
      .select("SUM(pdn1.quantity)", "totalDelivered")
      .where("pdn1.baseEntry = :baseEntry", { baseEntry: poDocEntry })
      .andWhere("pdn1.baseType = :baseType", {
        baseType: BASE_TYPE_PURCHASE_ORDER,
      })
      .getRawOne<{ totalDelivered: string }>();

    const totalDelivered = Number(deliveredLines?.totalDelivered ?? 0);
    if (totalDelivered < totalOrdered) {
      logger.info({
        msg: "PO not yet fully delivered, skipping close",
        poDocEntry,
        poDocNum: purchaseOrder.DocNum,
        totalDelivered,
        totalOrdered,
      });
      return;
    }

    // Close the PO via SAP Service Layer
    await serviceLayerClient.request(sessionId, "POST", `/PurchaseOrders(${poDocEntry})/Close`);

    logger.info({
      msg: "PO closed after copy-to quantity reconciliation",
      poDocEntry,
      poDocNum: purchaseOrder.DocNum,
      totalDelivered,
      totalOrdered,
    });
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.warn({
      err: caughtError,
      msg: "Failed to reconcile/close PO after copy-to",
      poDocEntry,
    });
    // Do not rethrow — this is a best-effort reconciliation
  }
}
