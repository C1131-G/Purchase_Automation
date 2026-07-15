// Base Document Quantity Resolution Utility
// For copy-to document lines that reference a base document, this utility validates
// whether the requested quantity exceeds the base document's open quantity.
//
// Unlike the previous split approach, over-limit lines are kept as a SINGLE row.
// The backend forwards the full requested quantity to SAP as one line.
// This utility exists so future validation or logging logic can be added centrally.
//
// Currently: passes all lines through unchanged (no splitting, no clamping).

import { logger } from "@/core/logger/pino-logger";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";

// SAP object type constants (BaseType values used in document line references)
const BASE_TYPE_PURCHASE_ORDER = 22;
const BASE_TYPE_GRPO = 20;
const BASE_TYPE_PURCHASE_QUOTATION = 540000006;

const BASE_TYPE_ENDPOINT_MAP: Record<number, string> = {
  [BASE_TYPE_PURCHASE_ORDER]: "PurchaseOrders",
  [BASE_TYPE_GRPO]: "PurchaseDeliveryNotes",
  [BASE_TYPE_PURCHASE_QUOTATION]: "PurchaseQuotations",
};

/**
 * Fetches the open quantity for a specific line on a base document from SAP Service Layer.
 * Returns null if the base type is unknown or the document cannot be fetched.
 */
async function fetchBaseLineOpenQty(
  sessionId: string,
  baseType: number,
  baseEntry: number,
  baseLine: number,
): Promise<{ openQty: number; docNum: string } | null> {
  const endpoint = BASE_TYPE_ENDPOINT_MAP[baseType];
  if (!endpoint) {
    return null;
  }

  try {
    const doc = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/${endpoint}(${baseEntry})`,
    )) as SAPDocumentResponse;

    let line = (doc.DocumentLines || []).find(
      (l) => (l as unknown as Record<string, unknown>).LineNum === baseLine,
    );
    if (!line && baseLine < doc.DocumentLines.length) {
      line = doc.DocumentLines[baseLine];
    }
    if (!line) {
      return null;
    }

    const lineData = line as unknown as Record<string, unknown>;
    const orderedQty = Number(line.Quantity ?? 0);
    const openQty = Number(
      lineData.OpenQty ??
        lineData.OpenQuantity ??
        lineData.RemainingOpenQuantity ??
        lineData.RemainingQuantity ??
        lineData.BaseOpenQuantity ??
        orderedQty,
    );

    return { docNum: String(doc.DocNum), openQty };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.warn({
      baseEntry,
      baseLine,
      baseType,
      err: caughtError,
      msg: "Failed to fetch base document for quantity resolution",
    });
    return null;
  }
}

/**
 * Processes all document lines that have base linkage (BaseType/BaseEntry/BaseLine).
 * Currently: keeps every line as-is without splitting or clamping.
 * Returns a summary for observability.
 *
 * Future: this is where any pre-SAP validation or logging for over-limit lines
 * can be added without changing the no-split behavior.
 */
export async function resolveBaseLineQuantities(
  sessionId: string,
  lines: Record<string, unknown>[],
): Promise<{ overLimit: number; withinLimit: number }> {
  let overLimit = 0;
  let withinLimit = 0;

  for (const line of lines) {
    const baseType = Number(line.BaseType);
    const baseEntry = Number(line.BaseEntry);
    const baseLine = Number(line.BaseLine);
    const requestedQty = Number(line.Quantity ?? 0);

    // Skip lines without complete base linkage (manual entry rows)
    if (!Number.isFinite(baseType) || !Number.isFinite(baseEntry) || !Number.isFinite(baseLine)) {
      continue;
    }

    // Skip unknown base types
    if (!BASE_TYPE_ENDPOINT_MAP[baseType]) {
      continue;
    }

    const baseInfo = await fetchBaseLineOpenQty(sessionId, baseType, baseEntry, baseLine);
    if (!baseInfo) {
      continue;
    }

    if (requestedQty > baseInfo.openQty) {
      // Keep the line as-is with the full requested quantity.
      // No splitting, no clamping — SAP receives one line.
      logger.info({
        baseDocNum: baseInfo.docNum,
        itemCode: line.ItemCode,
        msg: "Copy-to line exceeds base open quantity; forwarding as single line",
        openQty: baseInfo.openQty,
        requestedQty,
      });
      overLimit++;
    } else {
      withinLimit++;
    }
  }

  return { overLimit, withinLimit };
}
