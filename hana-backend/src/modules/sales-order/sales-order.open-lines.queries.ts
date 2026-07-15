// Sales Order Service: Orchestrates order processing flows. Interfaces with HANA for high-volume order queries and Service Layer for document lifecycle management (Creation, Update, Cancellation).

import { logger } from "@/core/logger/pino-logger";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentLine, SAPDocumentResponse } from "@/services/types/sap.types";
// Fetches a filtered and paginated list of Sales Orders from the tenant-specific HANA database.
// Uses a UNION ALL pattern to combine final documents (ORDR) with drafts (ODRF, ObjType='17').

export const getOpenSalesOrderLines = async (sessionId: string, cardCode: string) => {
  try {
    const query = `/Orders?$filter=CardCode eq '${cardCode}' and DocumentStatus eq 'bost_Open'`;
    const result = (await serviceLayerClient.request(sessionId, "GET", query)) as {
      value: SAPDocumentResponse[];
    };

    const orders = result.value || [];
    const openLines: {
      DocEntry: number;
      DocNum: number;
      DocDate: string;
      DocCurr: string;
      LineNum: number;
      ItemCode: string;
      ItemDescription?: string;
      Quantity: number;
      OpenQty: number;
      Price?: number;
      TaxCode?: string;
      WarehouseCode?: string;
      UoMCode?: string | number;
      UoMEntry?: number;
      DiscountPercent?: number;
      VatGroup?: string;
      VatPrcnt?: number;
    }[] = [];

    for (const order of orders) {
      const lines = order.DocumentLines || [];
      for (const line of lines) {
        const lineWithStatus = line as SAPDocumentLine & {
          LineStatus?: string;
        };
        if (lineWithStatus.LineStatus === "bost_Open") {
          const lineWithOpenQty = lineWithStatus as SAPDocumentLine & {
            LineStatus?: string;
            OpenQuantity?: number;
            RemainingOpenQuantity?: number;
            RemainingOpenInventoryQuantity?: number;
            RemainingQuantity?: number;
            BaseOpenQuantity?: number;
            UoMCode?: string | number;
            UoMEntry?: number;
          };
          openLines.push({
            DiscountPercent:
              Number(line.DiscountPercent ?? 0) ||
              Number((order as unknown as { DiscountPercent?: number }).DiscountPercent ?? 0),
            DocCurr: order.DocCurrency,
            DocDate: order.DocDate,
            DocEntry: order.DocEntry,
            DocNum: order.DocNum,
            ItemCode: line.ItemCode,
            ItemDescription: line.ItemDescription,
            LineNum: lineWithOpenQty.LineNum ?? 0,
            OpenQty: Number(
              lineWithOpenQty.OpenQuantity ??
                lineWithOpenQty.RemainingOpenQuantity ??
                lineWithOpenQty.RemainingOpenInventoryQuantity ??
                lineWithOpenQty.RemainingQuantity ??
                lineWithOpenQty.BaseOpenQuantity ??
                line.Quantity,
            ),
            Price: line.Price || line.UnitPrice,
            Quantity: line.Quantity,
            UoMCode: lineWithOpenQty.UoMCode,
            UoMEntry: lineWithOpenQty.UoMEntry,
            VatGroup: lineWithOpenQty.VatGroup || String(lineWithOpenQty.TaxCode ?? "").trim(),
            VatPrcnt: Number(lineWithOpenQty.TaxPercentagePerRow ?? lineWithOpenQty.VatPrcnt ?? 0),
            WarehouseCode: line.WarehouseCode,
          });
        }
      }
    }

    return openLines;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      cardCode,
      err: caughtError,
      msg: "Failed to fetch open sales order lines from Service Layer",
    });
    throw caughtError;
  }
};
