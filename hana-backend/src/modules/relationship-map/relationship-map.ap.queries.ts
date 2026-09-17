import type { NodeResult, RelationshipMapResult } from "./relationship-map.types";
import { getTenantRepository } from "@/db/tenant-query";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { logger } from "@/core/logger/pino-logger";

export const getAPRelationshipMap = async (
  dbName: string,
  docType: "purchase-quotation" | "purchase-order",
  docEntry: number,
): Promise<RelationshipMapResult> => {
  try {
    const repo = await getTenantRepository(dbName, ARInvoiceSchema);
    const manager = repo.manager;

    const result: RelationshipMapResult = {
      salesQuotation: [],
      salesOrder: [],
      arInvoice: [],
      arCreditMemo: [],
      incomingPayment: [],
      purchaseQuotation: [],
      purchaseOrder: [],
    };

    let currentPQs: number[] = [];
    let currentPOs: number[] = [];

    const getDocNums = async (table: string, entries: number[]): Promise<NodeResult[]> => {
      const validEntries = [...new Set(entries)].filter((id) => id && !Number.isNaN(id) && id > 0);
      if (!validEntries || validEntries.length === 0) return [];
      const query = `SELECT "DocEntry", "DocNum" FROM "${table}" WHERE "DocEntry" IN (${validEntries.join(",")})`;
      const rows = await manager.query(query);
      return rows.map((result: any) => ({ docEntry: result.DocEntry, docNum: result.DocNum }));
    };

    const extractIds = (rows: any[], field: string): number[] => {
      return [
        ...new Set(rows.map((row) => row[field]).filter((id) => id && !Number.isNaN(id) && id > 0)),
      ];
    };

    if (docType === "purchase-quotation") {
      currentPQs = [docEntry];
      // Down to PO
      const sqlQuery = `SELECT DISTINCT "DocEntry" FROM "POR1" WHERE "BaseType" = 540000006 AND "BaseEntry" IN (${docEntry})`;
      const rows = await manager.query(sqlQuery);
      currentPOs = extractIds(rows, "DocEntry");
    } else if (docType === "purchase-order") {
      currentPOs = [docEntry];
      // Up to PQ
      const qUp = `SELECT DISTINCT "BaseEntry" FROM "POR1" WHERE "BaseType" = 540000006 AND "DocEntry" IN (${docEntry})`;
      const pqs = await manager.query(qUp);
      currentPQs = extractIds(pqs, "BaseEntry");
    }

    const [purchaseQuotation, purchaseOrder] = await Promise.all([
      getDocNums("OPQT", currentPQs),
      getDocNums("OPOR", currentPOs),
    ]);

    result.purchaseQuotation = purchaseQuotation;
    result.purchaseOrder = purchaseOrder;

    return result;
  } catch (error) {
    logger.error({ error, msg: "Failed to fetch AP relationship map" });
    throw error;
  }
};
