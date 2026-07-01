// Relationship Map: Traces document links across AR, AP, and Inventory chains.
// Mirrors hana-backend's relationship-map with 3 chains: AR, AP, Inventory.

import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";

// ─── AP Chain: PQ → PO → GRPO → AP Invoice → AP Credit Memo → Outgoing Payment ───

import { purchaseOrders } from "@/db/schema/purchase-orders";
import { purchaseOrderLines } from "@/db/schema/purchase-order-lines";
import { purchaseQuotations } from "@/db/schema/purchase-quotations";
import { grpo } from "@/db/schema/grpo";
import { grpoLines } from "@/db/schema/grpo-lines";
import { apInvoices } from "@/db/schema/ap-invoices";
import { apInvoiceLines } from "@/db/schema/ap-invoice-lines";
import { apCreditMemos } from "@/db/schema/ap-credit-memos";
import { apCreditMemoLines } from "@/db/schema/ap-credit-memo-lines";

// ─── AR Chain: SQ → SO → AR Invoice → AR Credit Memo → Incoming Payment ───

import { salesOrders } from "@/db/schema/sales-orders";
import { salesOrderLines } from "@/db/schema/sales-order-lines";
import { salesQuotations } from "@/db/schema/sales-quotations";
import { salesQuotationLines } from "@/db/schema/sales-quotation-lines";
import { arInvoices } from "@/db/schema/ar-invoices";
import { arInvoiceLines } from "@/db/schema/ar-invoice-lines";
import { arCreditMemos } from "@/db/schema/ar-credit-memos";
import { arCreditMemoLines } from "@/db/schema/ar-credit-memo-lines";

// ─── Inventory Chain: GR → GI → Transfer Request → Transfer ───

import { goodsReceipts } from "@/db/schema/goods-receipts";
import { goodsIssues } from "@/db/schema/goods-issues";
import { inventoryTransferRequests } from "@/db/schema/inventory-transfer-requests";
import { inventoryTransfers } from "@/db/schema/inventory-transfers";
import { inventoryTransferLines } from "@/db/schema/inventory-transfer-lines";

const toRelation = (doc: any) => ({
  docEntry: doc.id,
  docNum: doc.docNum,
  docDate: doc.docDate,
  docTotal: doc.docTotal,
  docStatus: doc.docStatus,
  cardCode: doc.cardCode ?? doc.filler ?? null,
  cardName: doc.cardName ?? null,
});

// ─── AR Chain ────────────────────────────────────────────────────────────────

const getARMap = async (docType: string, docEntry: number) => {
  const db = getDb();

  // Start from the requested doc type
  let sqId: number | null = null;
  let soId: number | null = null;
  let invId: number | null = null;
  let cmId: number | null = null;
  let pmtId: number | null = null;

  switch (docType) {
    case "sales-quotation":
      sqId = docEntry;
      break;
    case "sales-order":
      soId = docEntry;
      break;
    case "ar-invoice":
      invId = docEntry;
      break;
    case "ar-credit-memo":
      cmId = docEntry;
      break;
    case "incoming-payment":
      pmtId = docEntry;
      break;
  }

  if (soId || sqId) {
    // Walk forward from SQ/SO
    const baseId = sqId ?? soId;
    const _lines = sqId
      ? await db.select().from(salesQuotationLines).where(eq(salesQuotationLines.docEntry, baseId!))
      : await db.select().from(salesOrderLines).where(eq(salesOrderLines.docEntry, baseId!));
    const soLines = await db
      .select()
      .from(salesOrderLines)
      .where(inArray(salesOrderLines.baseEntry, [baseId!]));
    const soEntries = [...new Set(soLines.map((l) => l.docEntry))];
    if (soEntries.length > 0) soId ??= soEntries[0];
  }

  if (soId) {
    const invLines = await db
      .select()
      .from(arInvoiceLines)
      .where(inArray(arInvoiceLines.baseEntry, [soId]));
    const invEntries = [...new Set(invLines.map((l) => l.docEntry))];
    if (invEntries.length > 0 && !invId) invId = invEntries[0];
  }

  if (invId) {
    const cmLines = await db
      .select()
      .from(arCreditMemoLines)
      .where(inArray(arCreditMemoLines.baseEntry, [invId]));
    const cmEntries = [...new Set(cmLines.map((l) => l.docEntry))];
    if (cmEntries.length > 0 && !cmId) cmId = cmEntries[0];
  }

  const [sq] = sqId
    ? await db.select().from(salesQuotations).where(eq(salesQuotations.id, sqId)).limit(1)
    : [];
  const [so] = soId
    ? await db.select().from(salesOrders).where(eq(salesOrders.id, soId)).limit(1)
    : [];
  const [inv] = invId
    ? await db.select().from(arInvoices).where(eq(arInvoices.id, invId)).limit(1)
    : [];
  const [cm] = cmId
    ? await db.select().from(arCreditMemos).where(eq(arCreditMemos.id, cmId)).limit(1)
    : [];

  return {
    salesQuotation: sq ? [toRelation(sq)] : [],
    salesOrder: so ? [toRelation(so)] : [],
    arInvoice: inv ? [toRelation(inv)] : [],
    arCreditMemo: cm ? [toRelation(cm)] : [],
    incomingPayment: pmtId
      ? [
          toRelation({
            id: pmtId,
            docNum: null,
            docDate: null,
            docTotal: null,
            docStatus: null,
            cardCode: null,
            cardName: null,
          }),
        ]
      : [],
  };
};

// ─── AP Chain ────────────────────────────────────────────────────────────────

const getAPMap = async (docType: string, docEntry: number) => {
  const db = getDb();

  let pqId: number | null = null;
  let poId: number | null = null;
  let grId: number | null = null;
  let apId: number | null = null;
  let cmId: number | null = null;
  let pmtId: number | null = null;

  switch (docType) {
    case "purchase-quotation":
      pqId = docEntry;
      break;
    case "purchase-order":
      poId = docEntry;
      break;
    case "grpo":
      grId = docEntry;
      break;
    case "ap-invoice":
      apId = docEntry;
      break;
    case "ap-credit-memo":
      cmId = docEntry;
      break;
    case "outgoing-payment":
      pmtId = docEntry;
      break;
  }

  if (pqId) {
    const poLines = await db
      .select()
      .from(purchaseOrderLines)
      .where(inArray(purchaseOrderLines.baseEntry, [pqId]));
    const poEntries = [...new Set(poLines.map((l) => l.docEntry))];
    if (poEntries.length > 0) poId ??= poEntries[0];
  }

  if (poId) {
    const grLines = await db
      .select()
      .from(grpoLines)
      .where(inArray(grpoLines.baseEntry, [poId]));
    const grEntries = [...new Set(grLines.map((l) => l.docEntry))];
    if (grEntries.length > 0) grId ??= grEntries[0];
    const apLines = await db
      .select()
      .from(apInvoiceLines)
      .where(inArray(apInvoiceLines.baseEntry, [poId]));
    const apEntries = [...new Set(apLines.map((l) => l.docEntry))];
    if (apEntries.length > 0) apId ??= apEntries[0];
  }

  if (grId && !apId) {
    const apLines = await db
      .select()
      .from(apInvoiceLines)
      .where(inArray(apInvoiceLines.baseEntry, [grId]));
    const apEntries = [...new Set(apLines.map((l) => l.docEntry))];
    if (apEntries.length > 0) apId = apEntries[0];
  }

  if (apId) {
    const cmLines = await db
      .select()
      .from(apCreditMemoLines)
      .where(inArray(apCreditMemoLines.baseEntry, [apId]));
    const cmEntries = [...new Set(cmLines.map((l) => l.docEntry))];
    if (cmEntries.length > 0) cmId ??= cmEntries[0];
  }

  const [pq] = pqId
    ? await db.select().from(purchaseQuotations).where(eq(purchaseQuotations.id, pqId)).limit(1)
    : [];
  const [po] = poId
    ? await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1)
    : [];
  const [gr] = grId ? await db.select().from(grpo).where(eq(grpo.id, grId)).limit(1) : [];
  const [ap] = apId
    ? await db.select().from(apInvoices).where(eq(apInvoices.id, apId)).limit(1)
    : [];
  const [cm] = cmId
    ? await db.select().from(apCreditMemos).where(eq(apCreditMemos.id, cmId)).limit(1)
    : [];

  return {
    purchaseQuotation: pq ? [toRelation(pq)] : [],
    purchaseOrder: po ? [toRelation(po)] : [],
    grpo: gr ? [toRelation(gr)] : [],
    apInvoice: ap ? [toRelation(ap)] : [],
    apCreditMemo: cm ? [toRelation(cm)] : [],
    outgoingPayment: pmtId
      ? [
          toRelation({
            id: pmtId,
            docNum: null,
            docDate: null,
            docTotal: null,
            docStatus: null,
            cardCode: null,
            cardName: null,
          }),
        ]
      : [],
  };
};

// ─── Inventory Chain ─────────────────────────────────────────────────────────

const getInventoryMap = async (docType: string, docEntry: number) => {
  const db = getDb();

  let grId: number | null = null;
  let giId: number | null = null;
  let trId: number | null = null;
  let tfId: number | null = null;

  switch (docType) {
    case "goods-receipt":
      grId = docEntry;
      break;
    case "goods-issue":
      giId = docEntry;
      break;
    case "transfer-request":
      trId = docEntry;
      break;
    case "transfer":
      tfId = docEntry;
      break;
  }

  if (trId) {
    const tfLines = await db
      .select()
      .from(inventoryTransferLines)
      .where(inArray(inventoryTransferLines.baseEntry, [trId!]));
    const tfEntries = [...new Set(tfLines.map((l) => l.docEntry))];
    if (tfEntries.length > 0) tfId ??= tfEntries[0];
  }

  if (tfId && !trId) {
    const tfLines = await db
      .select()
      .from(inventoryTransferLines)
      .where(eq(inventoryTransferLines.docEntry, tfId));
    const baseEntries = [
      ...new Set(tfLines.map((l) => l.baseEntry).filter((b): b is number => b !== null)),
    ];
    if (baseEntries.length > 0) trId = baseEntries[0];
  }

  const [gr] = grId
    ? await db.select().from(goodsReceipts).where(eq(goodsReceipts.id, grId)).limit(1)
    : [];
  const [gi] = giId
    ? await db.select().from(goodsIssues).where(eq(goodsIssues.id, giId)).limit(1)
    : [];
  const [tr] = trId
    ? await db
        .select()
        .from(inventoryTransferRequests)
        .where(eq(inventoryTransferRequests.id, trId))
        .limit(1)
    : [];
  const [tf] = tfId
    ? await db.select().from(inventoryTransfers).where(eq(inventoryTransfers.id, tfId)).limit(1)
    : [];

  return {
    goodsReceipt: gr ? [toRelation(gr)] : [],
    goodsIssue: gi ? [toRelation(gi)] : [],
    transferRequest: tr ? [toRelation(tr)] : [],
    transfer: tf ? [toRelation(tf)] : [],
  };
};

// ─── Unified Dispatch ────────────────────────────────────────────────────────

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

export const getRelationshipMap = async (docType: DocType, docEntry: number) => {
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
