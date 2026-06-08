import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { logger } from "@/core/logger/pino-logger";

export interface NodeResult {
  docEntry: number;
  docNum: number;
}

export interface RelationshipMapResult {
  salesQuotation: NodeResult[];
  salesOrder: NodeResult[];
  arInvoice: NodeResult[];
  arCreditMemo: NodeResult[];
  incomingPayment: NodeResult[];
  purchaseQuotation?: NodeResult[];
  purchaseOrder?: NodeResult[];
  grpo?: NodeResult[];
  apInvoice?: NodeResult[];
  apCreditMemo?: NodeResult[];
  outgoingPayment?: NodeResult[];
  delivery?: NodeResult[];
}

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
      return rows.map((r: any) => ({ docEntry: r.DocEntry, docNum: r.DocNum }));
    };

    // Helper to safely extract IDs and filter
    const extractIds = (rows: any[], field: string): number[] => {
      return [
        ...new Set(rows.map((r) => r[field]).filter((id) => id && !Number.isNaN(id) && id > 0)),
      ];
    };

    // Depending on start node, resolve initial arrays
    if (docType === "sales-quotation") {
      currentSQs = [docEntry];
      // Down to SO
      const q = `SELECT DISTINCT "DocEntry" FROM "RDR1" WHERE "BaseType" = 23 AND "BaseEntry" IN (${docEntry})`;
      const rows = await manager.query(q);
      currentSOs = extractIds(rows, "DocEntry");

      if (currentSOs.length > 0) {
        const q2 = `SELECT DISTINCT "DocEntry" FROM "INV1" WHERE "BaseType" = 17 AND "BaseEntry" IN (${currentSOs.join(",")})`;
        const invs = await manager.query(q2);
        currentInvs = extractIds(invs, "DocEntry");
      }
    } else if (docType === "sales-order") {
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
    const [sq, so, inv, cm, ip] = await Promise.all([
      getDocNums("OQUT", currentSQs),
      getDocNums("ORDR", currentSOs),
      getDocNums("OINV", currentInvs),
      getDocNums("ORIN", currentCMs),
      getDocNums("ORCT", currentIPs),
    ]);

    result.salesQuotation = sq;
    result.salesOrder = so;
    result.arInvoice = inv;
    result.arCreditMemo = cm;
    result.incomingPayment = ip;

    return result;
  } catch (error) {
    logger.error({ error, msg: "Failed to fetch relationship map" });
    throw error;
  }
};

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
      return rows.map((r: any) => ({ docEntry: r.DocEntry, docNum: r.DocNum }));
    };

    const extractIds = (rows: any[], field: string): number[] => {
      return [
        ...new Set(rows.map((r) => r[field]).filter((id) => id && !Number.isNaN(id) && id > 0)),
      ];
    };

    if (docType === "purchase-quotation") {
      currentPQs = [docEntry];
      // Down to PO
      const q = `SELECT DISTINCT "DocEntry" FROM "POR1" WHERE "BaseType" = 54 AND "BaseEntry" IN (${docEntry})`;
      const rows = await manager.query(q);
      currentPOs = extractIds(rows, "DocEntry");

      if (currentPOs.length > 0) {
        // Down to GRPO
        const qGRPO = `SELECT DISTINCT "DocEntry" FROM "PDN1" WHERE "BaseType" = 22 AND "BaseEntry" IN (${currentPOs.join(",")})`;
        const grpos = await manager.query(qGRPO);
        currentGRPOs = extractIds(grpos, "DocEntry");

        // Down to Inv (can skip GRPO)
        const qInv = `SELECT DISTINCT "DocEntry" FROM "PCH1" WHERE "BaseType" = 22 AND "BaseEntry" IN (${currentPOs.join(",")})`;
        const invs = await manager.query(qInv);
        currentInvs = extractIds(invs, "DocEntry");
      }
    } else if (docType === "purchase-order") {
      currentPOs = [docEntry];
      // Up to PQ
      const qUp = `SELECT DISTINCT "BaseEntry" FROM "POR1" WHERE "BaseType" = 54 AND "DocEntry" IN (${docEntry})`;
      const pqs = await manager.query(qUp);
      currentPQs = extractIds(pqs, "BaseEntry");

      // Down to GRPO
      const qGRPO = `SELECT DISTINCT "DocEntry" FROM "PDN1" WHERE "BaseType" = 22 AND "BaseEntry" IN (${docEntry})`;
      const grpos = await manager.query(qGRPO);
      currentGRPOs = extractIds(grpos, "DocEntry");

      // Down to Inv (can skip GRPO)
      const qInv = `SELECT DISTINCT "DocEntry" FROM "PCH1" WHERE "BaseType" = 22 AND "BaseEntry" IN (${docEntry})`;
      const invs = await manager.query(qInv);
      currentInvs = extractIds(invs, "DocEntry");
    } else if (docType === "grpo") {
      currentGRPOs = [docEntry];
      // Up to PO
      const qUp = `SELECT DISTINCT "BaseEntry" FROM "PDN1" WHERE "BaseType" = 22 AND "DocEntry" IN (${docEntry})`;
      const pos = await manager.query(qUp);
      currentPOs = extractIds(pos, "BaseEntry");

      if (currentPOs.length > 0) {
        const qUp2 = `SELECT DISTINCT "BaseEntry" FROM "POR1" WHERE "BaseType" = 54 AND "DocEntry" IN (${currentPOs.join(",")})`;
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
        bases.filter((r: any) => r.BaseType === 22),
        "BaseEntry",
      );
      const grpoBases = extractIds(
        bases.filter((r: any) => r.BaseType === 20),
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
        const qUpPQ = `SELECT DISTINCT "BaseEntry" FROM "POR1" WHERE "BaseType" = 54 AND "DocEntry" IN (${currentPOs.join(",")})`;
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
          bases.filter((r: any) => r.BaseType === 22),
          "BaseEntry",
        );
        currentGRPOs = extractIds(
          bases.filter((r: any) => r.BaseType === 20),
          "BaseEntry",
        );

        if (currentGRPOs.length > 0) {
          const qUpPO = `SELECT DISTINCT "BaseEntry" FROM "PDN1" WHERE "BaseType" = 22 AND "DocEntry" IN (${currentGRPOs.join(",")})`;
          const posFromGRPO = await manager.query(qUpPO);
          currentPOs = [...new Set([...currentPOs, ...extractIds(posFromGRPO, "BaseEntry")])];
        }

        if (currentPOs.length > 0) {
          const qUpPQ = `SELECT DISTINCT "BaseEntry" FROM "POR1" WHERE "BaseType" = 54 AND "DocEntry" IN (${currentPOs.join(",")})`;
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
          bases.filter((r: any) => r.BaseType === 22),
          "BaseEntry",
        );
        currentGRPOs = extractIds(
          bases.filter((r: any) => r.BaseType === 20),
          "BaseEntry",
        );

        if (currentGRPOs.length > 0) {
          const qUpPO = `SELECT DISTINCT "BaseEntry" FROM "PDN1" WHERE "BaseType" = 22 AND "DocEntry" IN (${currentGRPOs.join(",")})`;
          const posFromGRPO = await manager.query(qUpPO);
          currentPOs = [...new Set([...currentPOs, ...extractIds(posFromGRPO, "BaseEntry")])];
        }

        if (currentPOs.length > 0) {
          const qUpPQ = `SELECT DISTINCT "BaseEntry" FROM "POR1" WHERE "BaseType" = 54 AND "DocEntry" IN (${currentPOs.join(",")})`;
          const pqs = await manager.query(qUpPQ);
          currentPQs = extractIds(pqs, "BaseEntry");
        }
      }
    }

    if (currentInvs.length > 0 && docType !== "ap-credit-memo") {
      const qCM = `SELECT DISTINCT "DocEntry" FROM "RPC1" WHERE "BaseType" = 18 AND "BaseEntry" IN (${currentInvs.join(",")})`;
      const cms = await manager.query(qCM);
      currentCMs = extractIds(cms, "DocEntry");

      const qOP = `SELECT DISTINCT "DocNum" FROM "VPM2" WHERE "InvType" = 18 AND "DocEntry" IN (${currentInvs.join(",")})`;
      const ops = await manager.query(qOP);
      currentOPs = extractIds(ops, "DocNum");
    } else if (currentInvs.length > 0 && docType === "ap-credit-memo") {
      const qCM = `SELECT DISTINCT "DocEntry" FROM "RPC1" WHERE "BaseType" = 18 AND "BaseEntry" IN (${currentInvs.join(",")})`;
      const cms = await manager.query(qCM);
      const newCMs = extractIds(cms, "DocEntry");
      currentCMs = [...new Set([...currentCMs, ...newCMs])];

      const qOP = `SELECT DISTINCT "DocNum" FROM "VPM2" WHERE "InvType" = 18 AND "DocEntry" IN (${currentInvs.join(",")})`;
      const ops = await manager.query(qOP);
      currentOPs = extractIds(ops, "DocNum");
    }

    const [pq, po, grpo, inv, cm, op] = await Promise.all([
      getDocNums("OPQT", currentPQs),
      getDocNums("OPOR", currentPOs),
      getDocNums("OPDN", currentGRPOs),
      getDocNums("OPCH", currentInvs),
      getDocNums("ORPC", currentCMs),
      getDocNums("OVPM", currentOPs),
    ]);

    result.purchaseQuotation = pq;
    result.purchaseOrder = po;
    result.grpo = grpo;
    result.apInvoice = inv;
    result.apCreditMemo = cm;
    result.outgoingPayment = op;

    return result;
  } catch (error) {
    logger.error({ error, msg: "Failed to fetch AP relationship map" });
    throw error;
  }
};

export const relationshipMapService = {
  getARRelationshipMap,
  getAPRelationshipMap,
};
