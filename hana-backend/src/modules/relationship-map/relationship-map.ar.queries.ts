import type { NodeResult, RelationshipMapResult } from "./relationship-map.types";
import { resolveIcRfqForSalesQuotation } from "./relationship-map.ic.queries";
import { getTenantRepository } from "@/db/tenant-query";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { logger } from "@/core/logger/pino-logger";

export const getARRelationshipMap = async (
  dbName: string,
  docType: "sales-quotation" | "sales-order" | "ar-invoice" | "ar-credit-memo" | "incoming-payment",
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
    };

    let currentSQs: number[] = [];
    let currentSOs: number[] = [];
    let currentInvs: number[] = [];
    let currentCMs: number[] = [];
    let currentIPs: number[] = [];

    // Helper to fetch docNum
    const getDocNums = async (table: string, entries: number[]): Promise<NodeResult[]> => {
      const validEntries = [...new Set(entries)].filter((id) => id && !Number.isNaN(id) && id > 0);
      if (!validEntries || validEntries.length === 0) return [];
      const query = `SELECT "DocEntry", "DocNum" FROM "${table}" WHERE "DocEntry" IN (${validEntries.join(",")})`;
      const rows = await manager.query(query);
      return rows.map((result: any) => ({ docEntry: result.DocEntry, docNum: result.DocNum }));
    };

    // Helper to safely extract IDs and filter
    const extractIds = (rows: any[], field: string): number[] => {
      return [
        ...new Set(rows.map((row) => row[field]).filter((id) => id && !Number.isNaN(id) && id > 0)),
      ];
    };

    // Seller SQ map: RFQ → SQ only (no downstream SAP chain).
    if (docType === "sales-quotation") {
      const requestForQuotation = await resolveIcRfqForSalesQuotation(dbName, docEntry);
      const salesQuotation = await getDocNums("OQUT", [docEntry]);
      result.salesQuotation = salesQuotation;
      if (requestForQuotation.length > 0) {
        result.requestForQuotation = requestForQuotation;
      }
      return result;
    }

    // Depending on start node, resolve initial arrays
    if (docType === "sales-order") {
      currentSOs = [docEntry];
      // Up to SQ
      const qUp = `SELECT DISTINCT "BaseEntry" FROM "RDR1" WHERE "BaseType" = 23 AND "DocEntry" IN (${docEntry})`;
      const sqs = await manager.query(qUp);
      currentSQs = extractIds(sqs, "BaseEntry");

      // Down to Inv
      const qDown = `SELECT DISTINCT "DocEntry" FROM "INV1" WHERE "BaseType" = 17 AND "BaseEntry" IN (${docEntry})`;
      const invs = await manager.query(qDown);
      currentInvs = extractIds(invs, "DocEntry");
    } else if (docType === "ar-invoice") {
      currentInvs = [docEntry];
      // Up to SO
      const qUp = `SELECT DISTINCT "BaseEntry" FROM "INV1" WHERE "BaseType" = 17 AND "DocEntry" IN (${docEntry})`;
      const sos = await manager.query(qUp);
      currentSOs = extractIds(sos, "BaseEntry");

      if (currentSOs.length > 0) {
        const qUp2 = `SELECT DISTINCT "BaseEntry" FROM "RDR1" WHERE "BaseType" = 23 AND "DocEntry" IN (${currentSOs.join(",")})`;
        const sqs = await manager.query(qUp2);
        currentSQs = extractIds(sqs, "BaseEntry");
      }
    } else if (docType === "ar-credit-memo") {
      currentCMs = [docEntry];
      // Up to Inv
      const qUp = `SELECT DISTINCT "BaseEntry" FROM "RIN1" WHERE "BaseType" = 13 AND "DocEntry" IN (${docEntry})`;
      const invs = await manager.query(qUp);
      currentInvs = extractIds(invs, "BaseEntry");

      if (currentInvs.length > 0) {
        const qUp2 = `SELECT DISTINCT "BaseEntry" FROM "INV1" WHERE "BaseType" = 17 AND "DocEntry" IN (${currentInvs.join(",")})`;
        const sos = await manager.query(qUp2);
        currentSOs = extractIds(sos, "BaseEntry");

        if (currentSOs.length > 0) {
          const qUp3 = `SELECT DISTINCT "BaseEntry" FROM "RDR1" WHERE "BaseType" = 23 AND "DocEntry" IN (${currentSOs.join(",")})`;
          const sqs = await manager.query(qUp3);
          currentSQs = extractIds(sqs, "BaseEntry");
        }
      }
    } else if (docType === "incoming-payment") {
      currentIPs = [docEntry];
      // Up to Inv
      const qUp = `SELECT DISTINCT "DocEntry" FROM "RCT2" WHERE "DocNum" IN (${docEntry})`;
      const invs = await manager.query(qUp);
      currentInvs = extractIds(invs, "DocEntry");

      if (currentInvs.length > 0) {
        const qUp2 = `SELECT DISTINCT "BaseEntry" FROM "INV1" WHERE "BaseType" = 17 AND "DocEntry" IN (${currentInvs.join(",")})`;
        const sos = await manager.query(qUp2);
        currentSOs = extractIds(sos, "BaseEntry");

        if (currentSOs.length > 0) {
          const qUp3 = `SELECT DISTINCT "BaseEntry" FROM "RDR1" WHERE "BaseType" = 23 AND "DocEntry" IN (${currentSOs.join(",")})`;
          const sqs = await manager.query(qUp3);
          currentSQs = extractIds(sqs, "BaseEntry");
        }
      }
    }

    // From Invoices, find downstream CMs and IPs
    if (currentInvs.length > 0 && docType !== "ar-credit-memo") {
      // Find CMs
      const qCM = `SELECT DISTINCT "DocEntry" FROM "RIN1" WHERE "BaseType" = 13 AND "BaseEntry" IN (${currentInvs.join(",")})`;
      const cms = await manager.query(qCM);
      currentCMs = extractIds(cms, "DocEntry");

      // Find IPs
      const qIP = `SELECT DISTINCT "DocNum" FROM "RCT2" WHERE "InvType" = 13 AND "DocEntry" IN (${currentInvs.join(",")})`;
      const ips = await manager.query(qIP);
      currentIPs = extractIds(ips, "DocNum");
    } else if (currentInvs.length > 0 && docType === "ar-credit-memo") {
      // We still want to find other CMs and IPs linked to the base invoice
      const qCM = `SELECT DISTINCT "DocEntry" FROM "RIN1" WHERE "BaseType" = 13 AND "BaseEntry" IN (${currentInvs.join(",")})`;
      const cms = await manager.query(qCM);
      const newCMs = extractIds(cms, "DocEntry");
      currentCMs = [...new Set([...currentCMs, ...newCMs])];

      const qIP = `SELECT DISTINCT "DocNum" FROM "RCT2" WHERE "InvType" = 13 AND "DocEntry" IN (${currentInvs.join(",")})`;
      const ips = await manager.query(qIP);
      currentIPs = extractIds(ips, "DocNum");
    }

    // Populate actual details concurrently
    const [salesQuotation, salesOrder, inv, creditMemo, incomingPayment] = await Promise.all([
      getDocNums("OQUT", currentSQs),
      getDocNums("ORDR", currentSOs),
      getDocNums("OINV", currentInvs),
      getDocNums("ORIN", currentCMs),
      getDocNums("ORCT", currentIPs),
    ]);

    result.salesQuotation = salesQuotation;
    result.salesOrder = salesOrder;
    result.arInvoice = inv;
    result.arCreditMemo = creditMemo;
    result.incomingPayment = incomingPayment;

    return result;
  } catch (error) {
    logger.error({ error, msg: "Failed to fetch relationship map" });
    throw error;
  }
};
