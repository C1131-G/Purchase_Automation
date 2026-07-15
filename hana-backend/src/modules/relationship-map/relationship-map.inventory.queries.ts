import type { NodeResult, RelationshipMapResult } from "./relationship-map.types";
import { getTenantRepository } from "@/db/tenant-query";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { logger } from "@/core/logger/pino-logger";

export const getInventoryRelationshipMap = async (
  dbName: string,
  docType: "goods-receipt" | "goods-issue" | "transfer-request" | "transfer",
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
      goodsReceipt: [],
      goodsIssue: [],
      transferRequest: [],
      transfer: [],
    };

    const getDocNums = async (table: string, entries: number[]): Promise<NodeResult[]> => {
      const validEntries = [...new Set(entries)].filter((id) => id && !Number.isNaN(id) && id > 0);
      if (!validEntries || validEntries.length === 0) return [];
      const query = `SELECT "DocEntry", "DocNum" FROM "${table}" WHERE "DocEntry" IN (${validEntries.join(",")})`;
      const rows = await manager.query(query);
      return rows.map((result: any) => ({ docEntry: result.DocEntry, docNum: result.DocNum }));
    };

    if (docType === "goods-receipt") {
      result.goodsReceipt = await getDocNums("OIGN", [docEntry]);
    } else if (docType === "goods-issue") {
      result.goodsIssue = await getDocNums("OIGE", [docEntry]);
    } else if (docType === "transfer-request") {
      result.transferRequest = await getDocNums("OWTQ", [docEntry]);

      const transferSql = `SELECT DISTINCT "DocEntry" FROM "WTR1" WHERE "BaseType" = 1250000001 AND "BaseEntry" = ${docEntry}`;
      const transferRows = await manager.query(transferSql);
      const transferEntries = transferRows
        .map((row: { DocEntry: number }) => row.DocEntry as number)
        .filter(Boolean);
      if (transferEntries.length > 0) {
        result.transfer = await getDocNums("OWTR", transferEntries);
      }
    } else if (docType === "transfer") {
      result.transfer = await getDocNums("OWTR", [docEntry]);

      const requestSql = `SELECT DISTINCT "BaseEntry" FROM "WTR1" WHERE "BaseType" = 1250000001 AND "DocEntry" = ${docEntry}`;
      const requestRows = await manager.query(requestSql);
      const requestEntries = requestRows
        .map((row: { BaseEntry: number }) => row.BaseEntry as number)
        .filter(Boolean);
      if (requestEntries.length > 0) {
        result.transferRequest = await getDocNums("OWTQ", requestEntries);
      }
    }

    return result;
  } catch (error) {
    logger.error({ error, msg: "Failed to fetch inventory relationship map" });
    throw error;
  }
};
