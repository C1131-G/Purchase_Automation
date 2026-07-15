import { getDb } from "@/db/client";
import type { DynRow } from "@/types/drizzle.types";

import { relationshipMapRepository } from "./relationship-map.repository";

const toRelation = (doc: Record<string, unknown>) => ({
  cardCode: doc.cardCode ?? doc.filler ?? null,
  cardName: doc.cardName ?? null,
  docDate: doc.docDate,
  docEntry: doc.id,
  docNum: doc.docNum,
  docStatus: doc.docStatus,
  docTotal: doc.docTotal,
});

const getARMap = async (docType: string, docEntry: number) => {
  const db = getDb();
  let sqId: number | null = null;
  let soId: number | null = null;
  let invId: number | null = null;
  let cmId: number | null = null;
  let pmtId: number | null = null;

  switch (docType) {
    case "sales-quotation": {
      sqId = docEntry;
      break;
    }
    case "sales-order": {
      soId = docEntry;
      break;
    }
    case "ar-invoice": {
      invId = docEntry;
      break;
    }
    case "ar-credit-memo": {
      cmId = docEntry;
      break;
    }
    case "incoming-payment": {
      pmtId = docEntry;
      break;
    }
  }

  if (soId || sqId) {
    const baseId = sqId ?? soId;
    if (sqId) {
      await relationshipMapRepository.findSalesQuotationLines(db, baseId!);
    } else {
      await relationshipMapRepository.findSalesOrderLines(db, baseId!);
    }
    const soLines = await relationshipMapRepository.findSalesOrderLinesByBaseEntry(db, [baseId!]);
    const soEntries = [...new Set(soLines.map((l: DynRow) => l.docEntry))];
    if (soEntries.length > 0) {
      soId ??= soEntries[0] as number;
    }
  }

  if (soId) {
    const invLines = await relationshipMapRepository.findArInvoiceLinesByBaseEntry(db, [soId]);
    const invEntries = [...new Set(invLines.map((l: DynRow) => l.docEntry))];
    if (invEntries.length > 0 && !invId) {
      invId = invEntries[0] as number;
    }
  }

  if (invId) {
    const cmLines = await relationshipMapRepository.findArCreditMemoLinesByBaseEntry(db, [invId]);
    const cmEntries = [...new Set(cmLines.map((l: DynRow) => l.docEntry))];
    if (cmEntries.length > 0 && !cmId) {
      cmId = cmEntries[0] as number;
    }
  }

  const sq = sqId ? await relationshipMapRepository.findSalesQuotation(db, sqId) : null;
  const so = soId ? await relationshipMapRepository.findSalesOrder(db, soId) : null;
  const inv = invId ? await relationshipMapRepository.findArInvoice(db, invId) : null;
  const cm = cmId ? await relationshipMapRepository.findArCreditMemo(db, cmId) : null;

  return {
    arCreditMemo: cm ? [toRelation(cm)] : [],
    arInvoice: inv ? [toRelation(inv)] : [],
    incomingPayment: pmtId
      ? [
          toRelation({
            cardCode: null,
            cardName: null,
            docDate: null,
            docNum: null,
            docStatus: null,
            docTotal: null,
            id: pmtId,
          }),
        ]
      : [],
    salesOrder: so ? [toRelation(so)] : [],
    salesQuotation: sq ? [toRelation(sq)] : [],
  };
};

const getAPMap = async (docType: string, docEntry: number) => {
  const db = getDb();
  let pqId: number | null = null;
  let poId: number | null = null;
  let grId: number | null = null;
  let apId: number | null = null;
  let cmId: number | null = null;
  let pmtId: number | null = null;

  switch (docType) {
    case "purchase-quotation": {
      pqId = docEntry;
      break;
    }
    case "purchase-order": {
      poId = docEntry;
      break;
    }
    case "grpo": {
      grId = docEntry;
      break;
    }
    case "ap-invoice": {
      apId = docEntry;
      break;
    }
    case "ap-credit-memo": {
      cmId = docEntry;
      break;
    }
    case "outgoing-payment": {
      pmtId = docEntry;
      break;
    }
  }

  if (pqId) {
    const poLines = await relationshipMapRepository.findPurchaseOrderLinesByBaseEntry(db, [pqId]);
    const poEntries = [...new Set(poLines.map((l: DynRow) => l.docEntry))];
    if (poEntries.length > 0) {
      poId ??= poEntries[0] as number;
    }
  }

  if (poId) {
    const grLines = await relationshipMapRepository.findGrpoLinesByBaseEntry(db, [poId]);
    const grEntries = [...new Set(grLines.map((l: DynRow) => l.docEntry))];
    if (grEntries.length > 0) {
      grId ??= grEntries[0] as number;
    }
    const apLines = await relationshipMapRepository.findApInvoiceLinesByBaseEntry(db, [poId]);
    const apEntries = [...new Set(apLines.map((l: DynRow) => l.docEntry))];
    if (apEntries.length > 0) {
      apId ??= apEntries[0] as number;
    }
  }

  if (grId && !apId) {
    const apLines = await relationshipMapRepository.findApInvoiceLinesByBaseEntry(db, [grId]);
    const apEntries = [...new Set(apLines.map((l: DynRow) => l.docEntry))];
    if (apEntries.length > 0) {
      apId = apEntries[0] as number;
    }
  }

  if (apId) {
    const cmLines = await relationshipMapRepository.findApCreditMemoLinesByBaseEntry(db, [apId]);
    const cmEntries = [...new Set(cmLines.map((l: DynRow) => l.docEntry))];
    if (cmEntries.length > 0) {
      cmId ??= cmEntries[0] as number;
    }
  }

  const pq = pqId ? await relationshipMapRepository.findPurchaseQuotation(db, pqId) : null;
  const po = poId ? await relationshipMapRepository.findPurchaseOrder(db, poId) : null;
  const gr = grId ? await relationshipMapRepository.findGrpo(db, grId) : null;
  const ap = apId ? await relationshipMapRepository.findApInvoice(db, apId) : null;
  const cm = cmId ? await relationshipMapRepository.findApCreditMemo(db, cmId) : null;

  return {
    apCreditMemo: cm ? [toRelation(cm)] : [],
    apInvoice: ap ? [toRelation(ap)] : [],
    grpo: gr ? [toRelation(gr)] : [],
    outgoingPayment: pmtId
      ? [
          toRelation({
            cardCode: null,
            cardName: null,
            docDate: null,
            docNum: null,
            docStatus: null,
            docTotal: null,
            id: pmtId,
          }),
        ]
      : [],
    purchaseOrder: po ? [toRelation(po)] : [],
    purchaseQuotation: pq ? [toRelation(pq)] : [],
  };
};

const getInventoryMap = async (docType: string, docEntry: number) => {
  const db = getDb();
  let grId: number | null = null;
  let giId: number | null = null;
  let trId: number | null = null;
  let tfId: number | null = null;

  switch (docType) {
    case "goods-receipt": {
      grId = docEntry;
      break;
    }
    case "goods-issue": {
      giId = docEntry;
      break;
    }
    case "transfer-request": {
      trId = docEntry;
      break;
    }
    case "transfer": {
      tfId = docEntry;
      break;
    }
  }

  if (trId) {
    const tfLines = await relationshipMapRepository.findInventoryTransferLinesByBaseEntry(db, [
      trId!,
    ]);
    const tfEntries = [...new Set(tfLines.map((l: DynRow) => l.docEntry))];
    if (tfEntries.length > 0) {
      tfId ??= tfEntries[0] as number;
    }
  }

  if (tfId && !trId) {
    const tfLines = await relationshipMapRepository.findInventoryTransferLines(db, tfId);
    const baseEntries = [
      ...new Set(
        tfLines
          .map((l: DynRow) => l.baseEntry)
          .filter((b: unknown): b is number => typeof b === "number"),
      ),
    ];
    if (baseEntries.length > 0) {
      trId = baseEntries[0] as number;
    }
  }

  const gr = grId ? await relationshipMapRepository.findGoodsReceipt(db, grId) : null;
  const gi = giId ? await relationshipMapRepository.findGoodsIssue(db, giId) : null;
  const tr = trId ? await relationshipMapRepository.findInventoryTransferRequest(db, trId) : null;
  const tf = tfId ? await relationshipMapRepository.findInventoryTransfer(db, tfId) : null;

  return {
    goodsIssue: gi ? [toRelation(gi)] : [],
    goodsReceipt: gr ? [toRelation(gr)] : [],
    transfer: tf ? [toRelation(tf)] : [],
    transferRequest: tr ? [toRelation(tr)] : [],
  };
};

export type DocType =
  | "sales-quotation"
  | "sales-order"
  | "ar-invoice"
  | "ar-credit-memo"
  | "incoming-payment"
  | "purchase-quotation"
  | "purchase-order"
  | "grpo"
  | "ap-invoice"
  | "ap-credit-memo"
  | "outgoing-payment"
  | "goods-receipt"
  | "goods-issue"
  | "transfer-request"
  | "transfer";

export const getRelationshipMap = (docType: DocType, docEntry: number) => {
  if (
    ["sales-quotation", "sales-order", "ar-invoice", "ar-credit-memo", "incoming-payment"].includes(
      docType,
    )
  ) {
    return getARMap(docType, docEntry);
  }
  if (
    [
      "purchase-quotation",
      "purchase-order",
      "grpo",
      "ap-invoice",
      "ap-credit-memo",
      "outgoing-payment",
    ].includes(docType)
  ) {
    return getAPMap(docType, docEntry);
  }
  if (["goods-receipt", "goods-issue", "transfer-request", "transfer"].includes(docType)) {
    return getInventoryMap(docType, docEntry);
  }
  throw new Error(`Unknown docType: ${docType}`);
};

export const relationshipMapService = { getRelationshipMap };
