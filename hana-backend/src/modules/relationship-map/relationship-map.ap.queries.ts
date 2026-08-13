import type { NodeResult, RelationshipMapResult } from "./relationship-map.types";
import { getTenantRepository } from "@/db/tenant-query";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { logger } from "@/core/logger/pino-logger";

export const getAPRelationshipMap = async (
  dbName: string,
  docType:
    | "purchase-quotation"
    | "purchase-order"
    | "grpo"
    | "ap-invoice"
    | "ap-credit-memo"
    | "outgoing-payment",
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
      grpo: [],
      apInvoice: [],
      apCreditMemo: [],
      outgoingPayment: [],
    };

    let currentPQs: number[] = [];
    let currentPOs: number[] = [];
    let currentGRPOs: number[] = [];
    let currentInvs: number[] = [];
    let currentCMs: number[] = [];
    let currentOPs: number[] = [];

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

      if (currentPOs.length > 0) {
        // Down to GRPO
        const qGRPO = `SELECT DISTINCT "DocEntry" FROM "PDN1" WHERE "BaseType" = 22 AND "BaseEntry" IN (${currentPOs.join(",")})`;
        const qInv = `SELECT DISTINCT "DocEntry" FROM "PCH1" WHERE "BaseType" = 22 AND "BaseEntry" IN (${currentPOs.join(",")})`;
        const [grpos, invs] = await Promise.all([manager.query(qGRPO), manager.query(qInv)]);
        currentGRPOs = extractIds(grpos, "DocEntry");
        currentInvs = extractIds(invs, "DocEntry");
      }
    } else if (docType === "purchase-order") {
      currentPOs = [docEntry];
      // Up to PQ
      const qUp = `SELECT DISTINCT "BaseEntry" FROM "POR1" WHERE "BaseType" = 540000006 AND "DocEntry" IN (${docEntry})`;
      const qGRPO = `SELECT DISTINCT "DocEntry" FROM "PDN1" WHERE "BaseType" = 22 AND "BaseEntry" IN (${docEntry})`;
      const qInv = `SELECT DISTINCT "DocEntry" FROM "PCH1" WHERE "BaseType" = 22 AND "BaseEntry" IN (${docEntry})`;
      const [pqs, grpos, invs] = await Promise.all([
        manager.query(qUp),
        manager.query(qGRPO),
        manager.query(qInv),
      ]);
      currentPQs = extractIds(pqs, "BaseEntry");
      currentGRPOs = extractIds(grpos, "DocEntry");
      currentInvs = extractIds(invs, "DocEntry");
    } else if (docType === "grpo") {
      currentGRPOs = [docEntry];
      // Up to PO
      const qUp = `SELECT DISTINCT "BaseEntry" FROM "PDN1" WHERE "BaseType" = 22 AND "DocEntry" IN (${docEntry})`;
      const pos = await manager.query(qUp);
      currentPOs = extractIds(pos, "BaseEntry");

      if (currentPOs.length > 0) {
        const qUp2 = `SELECT DISTINCT "BaseEntry" FROM "POR1" WHERE "BaseType" = 540000006 AND "DocEntry" IN (${currentPOs.join(",")})`;
        const pqs = await manager.query(qUp2);
        currentPQs = extractIds(pqs, "BaseEntry");
      }

      // Down to Inv
      const qDown = `SELECT DISTINCT "DocEntry" FROM "PCH1" WHERE "BaseType" = 20 AND "BaseEntry" IN (${docEntry})`;
      const invs = await manager.query(qDown);
      currentInvs = extractIds(invs, "DocEntry");
    } else if (docType === "ap-invoice") {
      currentInvs = [docEntry];
      // Up to GRPO or PO
      const qUp = `SELECT DISTINCT "BaseType", "BaseEntry" FROM "PCH1" WHERE "BaseType" IN (20, 22) AND "DocEntry" IN (${docEntry})`;
      const bases = await manager.query(qUp);

      const poBases = extractIds(
        bases.filter((result: any) => result.BaseType === 22),
        "BaseEntry",
      );
      const grpoBases = extractIds(
        bases.filter((result: any) => result.BaseType === 20),
        "BaseEntry",
      );

      currentPOs = poBases;
      currentGRPOs = grpoBases;

      if (currentGRPOs.length > 0) {
        const qUpPO = `SELECT DISTINCT "BaseEntry" FROM "PDN1" WHERE "BaseType" = 22 AND "DocEntry" IN (${currentGRPOs.join(",")})`;
        const posFromGRPO = await manager.query(qUpPO);
        currentPOs = [...new Set([...currentPOs, ...extractIds(posFromGRPO, "BaseEntry")])];
      }

      if (currentPOs.length > 0) {
        const qUpPQ = `SELECT DISTINCT "BaseEntry" FROM "POR1" WHERE "BaseType" = 540000006 AND "DocEntry" IN (${currentPOs.join(",")})`;
        const pqs = await manager.query(qUpPQ);
        currentPQs = extractIds(pqs, "BaseEntry");
      }
    } else if (docType === "ap-credit-memo") {
      currentCMs = [docEntry];
      // Up to Inv
      const qUp = `SELECT DISTINCT "BaseEntry" FROM "RPC1" WHERE "BaseType" = 18 AND "DocEntry" IN (${docEntry})`;
      const invs = await manager.query(qUp);
      currentInvs = extractIds(invs, "BaseEntry");

      if (currentInvs.length > 0) {
        const qUpBases = `SELECT DISTINCT "BaseType", "BaseEntry" FROM "PCH1" WHERE "BaseType" IN (20, 22) AND "DocEntry" IN (${currentInvs.join(",")})`;
        const bases = await manager.query(qUpBases);

        currentPOs = extractIds(
          bases.filter((result: any) => result.BaseType === 22),
          "BaseEntry",
        );
        currentGRPOs = extractIds(
          bases.filter((result: any) => result.BaseType === 20),
          "BaseEntry",
        );

        if (currentGRPOs.length > 0) {
          const qUpPO = `SELECT DISTINCT "BaseEntry" FROM "PDN1" WHERE "BaseType" = 22 AND "DocEntry" IN (${currentGRPOs.join(",")})`;
          const posFromGRPO = await manager.query(qUpPO);
          currentPOs = [...new Set([...currentPOs, ...extractIds(posFromGRPO, "BaseEntry")])];
        }

        if (currentPOs.length > 0) {
          const qUpPQ = `SELECT DISTINCT "BaseEntry" FROM "POR1" WHERE "BaseType" = 540000006 AND "DocEntry" IN (${currentPOs.join(",")})`;
          const pqs = await manager.query(qUpPQ);
          currentPQs = extractIds(pqs, "BaseEntry");
        }
      }
    } else if (docType === "outgoing-payment") {
      currentOPs = [docEntry];
      // Up to Inv
      const qUp = `SELECT DISTINCT "DocEntry" FROM "VPM2" WHERE "DocNum" IN (${docEntry})`;
      const invs = await manager.query(qUp);
      currentInvs = extractIds(invs, "DocEntry");

      if (currentInvs.length > 0) {
        const qUpBases = `SELECT DISTINCT "BaseType", "BaseEntry" FROM "PCH1" WHERE "BaseType" IN (20, 22) AND "DocEntry" IN (${currentInvs.join(",")})`;
        const bases = await manager.query(qUpBases);

        currentPOs = extractIds(
          bases.filter((result: any) => result.BaseType === 22),
          "BaseEntry",
        );
        currentGRPOs = extractIds(
          bases.filter((result: any) => result.BaseType === 20),
          "BaseEntry",
        );

        if (currentGRPOs.length > 0) {
          const qUpPO = `SELECT DISTINCT "BaseEntry" FROM "PDN1" WHERE "BaseType" = 22 AND "DocEntry" IN (${currentGRPOs.join(",")})`;
          const posFromGRPO = await manager.query(qUpPO);
          currentPOs = [...new Set([...currentPOs, ...extractIds(posFromGRPO, "BaseEntry")])];
        }

        if (currentPOs.length > 0) {
          const qUpPQ = `SELECT DISTINCT "BaseEntry" FROM "POR1" WHERE "BaseType" = 540000006 AND "DocEntry" IN (${currentPOs.join(",")})`;
          const pqs = await manager.query(qUpPQ);
          currentPQs = extractIds(pqs, "BaseEntry");
        }
      }
    }

    if (currentInvs.length > 0 && docType !== "ap-credit-memo") {
      const qCM = `SELECT DISTINCT "DocEntry" FROM "RPC1" WHERE "BaseType" = 18 AND "BaseEntry" IN (${currentInvs.join(",")})`;
      const qOP = `SELECT DISTINCT "DocNum" FROM "VPM2" WHERE "InvType" = 18 AND "DocEntry" IN (${currentInvs.join(",")})`;
      const [cms, ops] = await Promise.all([manager.query(qCM), manager.query(qOP)]);
      currentCMs = extractIds(cms, "DocEntry");
      currentOPs = extractIds(ops, "DocNum");
    } else if (currentInvs.length > 0 && docType === "ap-credit-memo") {
      const qCM = `SELECT DISTINCT "DocEntry" FROM "RPC1" WHERE "BaseType" = 18 AND "BaseEntry" IN (${currentInvs.join(",")})`;
      const qOP = `SELECT DISTINCT "DocNum" FROM "VPM2" WHERE "InvType" = 18 AND "DocEntry" IN (${currentInvs.join(",")})`;
      const [cms, ops] = await Promise.all([manager.query(qCM), manager.query(qOP)]);
      const newCMs = extractIds(cms, "DocEntry");
      currentCMs = [...new Set([...currentCMs, ...newCMs])];
      currentOPs = extractIds(ops, "DocNum");
    }

    const [purchaseQuotation, purchaseOrder, grpo, apInvoice, creditMemo, outgoingPayment] =
      await Promise.all([
        getDocNums("OPQT", currentPQs),
        getDocNums("OPOR", currentPOs),
        getDocNums("OPDN", currentGRPOs),
        getDocNums("OPCH", currentInvs),
        getDocNums("ORPC", currentCMs),
        getDocNums("OVPM", currentOPs),
      ]);

    result.purchaseQuotation = purchaseQuotation;
    result.purchaseOrder = purchaseOrder;
    result.grpo = grpo;
    result.apInvoice = apInvoice;
    result.apCreditMemo = creditMemo;
    result.outgoingPayment = outgoingPayment;

    return result;
  } catch (error) {
    logger.error({ error, msg: "Failed to fetch AP relationship map" });
    throw error;
  }
};
