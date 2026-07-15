import { eq, inArray } from "drizzle-orm";

import { apCreditMemoLines } from "@/db/schema/ap-credit-memo-lines";
import { apCreditMemos } from "@/db/schema/ap-credit-memos";
import { apInvoiceLines } from "@/db/schema/ap-invoice-lines";
import { apInvoices } from "@/db/schema/ap-invoices";
import { arCreditMemoLines } from "@/db/schema/ar-credit-memo-lines";
import { arCreditMemos } from "@/db/schema/ar-credit-memos";
import { arInvoiceLines } from "@/db/schema/ar-invoice-lines";
import { arInvoices } from "@/db/schema/ar-invoices";
import { goodsIssues } from "@/db/schema/goods-issues";
import { goodsReceipts } from "@/db/schema/goods-receipts";
import { grpo } from "@/db/schema/grpo";
import { grpoLines } from "@/db/schema/grpo-lines";
import { inventoryTransferLines } from "@/db/schema/inventory-transfer-lines";
import { inventoryTransferRequests } from "@/db/schema/inventory-transfer-requests";
import { inventoryTransfers } from "@/db/schema/inventory-transfers";
import { purchaseOrderLines } from "@/db/schema/purchase-order-lines";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { purchaseQuotations } from "@/db/schema/purchase-quotations";
import { salesOrderLines } from "@/db/schema/sales-order-lines";
import { salesOrders } from "@/db/schema/sales-orders";
import { salesQuotationLines } from "@/db/schema/sales-quotation-lines";
import { salesQuotations } from "@/db/schema/sales-quotations";
import type { LooseDb } from "@/types/db.types";

export const relationshipMapRepository = {
  async findSalesQuotationLines(db: LooseDb, docEntry: number) {
    return db.select().from(salesQuotationLines).where(eq(salesQuotationLines.docEntry, docEntry));
  },
  async findSalesOrderLines(db: LooseDb, docEntry: number) {
    return db.select().from(salesOrderLines).where(eq(salesOrderLines.docEntry, docEntry));
  },
  async findSalesOrderLinesByBaseEntry(db: LooseDb, baseEntries: number[]) {
    return db.select().from(salesOrderLines).where(inArray(salesOrderLines.baseEntry, baseEntries));
  },
  async findArInvoiceLinesByBaseEntry(db: LooseDb, baseEntries: number[]) {
    return db.select().from(arInvoiceLines).where(inArray(arInvoiceLines.baseEntry, baseEntries));
  },
  async findArCreditMemoLinesByBaseEntry(db: LooseDb, baseEntries: number[]) {
    return db
      .select()
      .from(arCreditMemoLines)
      .where(inArray(arCreditMemoLines.baseEntry, baseEntries));
  },
  async findSalesQuotation(db: LooseDb, id: number) {
    const [row] = await db
      .select()
      .from(salesQuotations)
      .where(eq(salesQuotations.id, id))
      .limit(1);
    return row || null;
  },
  async findSalesOrder(db: LooseDb, id: number) {
    const [row] = await db.select().from(salesOrders).where(eq(salesOrders.id, id)).limit(1);
    return row || null;
  },
  async findArInvoice(db: LooseDb, id: number) {
    const [row] = await db.select().from(arInvoices).where(eq(arInvoices.id, id)).limit(1);
    return row || null;
  },
  async findArCreditMemo(db: LooseDb, id: number) {
    const [row] = await db.select().from(arCreditMemos).where(eq(arCreditMemos.id, id)).limit(1);
    return row || null;
  },

  // AP Chain
  async findPurchaseOrderLinesByBaseEntry(db: LooseDb, baseEntries: number[]) {
    return db
      .select()
      .from(purchaseOrderLines)
      .where(inArray(purchaseOrderLines.baseEntry, baseEntries));
  },
  async findGrpoLinesByBaseEntry(db: LooseDb, baseEntries: number[]) {
    return db.select().from(grpoLines).where(inArray(grpoLines.baseEntry, baseEntries));
  },
  async findApInvoiceLinesByBaseEntry(db: LooseDb, baseEntries: number[]) {
    return db.select().from(apInvoiceLines).where(inArray(apInvoiceLines.baseEntry, baseEntries));
  },
  async findApCreditMemoLinesByBaseEntry(db: LooseDb, baseEntries: number[]) {
    return db
      .select()
      .from(apCreditMemoLines)
      .where(inArray(apCreditMemoLines.baseEntry, baseEntries));
  },
  async findPurchaseQuotation(db: LooseDb, id: number) {
    const [row] = await db
      .select()
      .from(purchaseQuotations)
      .where(eq(purchaseQuotations.id, id))
      .limit(1);
    return row || null;
  },
  async findPurchaseOrder(db: LooseDb, id: number) {
    const [row] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
    return row || null;
  },
  async findGrpo(db: LooseDb, id: number) {
    const [row] = await db.select().from(grpo).where(eq(grpo.id, id)).limit(1);
    return row || null;
  },
  async findApInvoice(db: LooseDb, id: number) {
    const [row] = await db.select().from(apInvoices).where(eq(apInvoices.id, id)).limit(1);
    return row || null;
  },
  async findApCreditMemo(db: LooseDb, id: number) {
    const [row] = await db.select().from(apCreditMemos).where(eq(apCreditMemos.id, id)).limit(1);
    return row || null;
  },

  // Inventory Chain
  async findInventoryTransferLinesByBaseEntry(db: LooseDb, baseEntries: number[]) {
    return db
      .select()
      .from(inventoryTransferLines)
      .where(inArray(inventoryTransferLines.baseEntry, baseEntries));
  },
  async findInventoryTransferLines(db: LooseDb, docEntry: number) {
    return db
      .select()
      .from(inventoryTransferLines)
      .where(eq(inventoryTransferLines.docEntry, docEntry));
  },
  async findGoodsReceipt(db: LooseDb, id: number) {
    const [row] = await db.select().from(goodsReceipts).where(eq(goodsReceipts.id, id)).limit(1);
    return row || null;
  },
  async findGoodsIssue(db: LooseDb, id: number) {
    const [row] = await db.select().from(goodsIssues).where(eq(goodsIssues.id, id)).limit(1);
    return row || null;
  },
  async findInventoryTransferRequest(db: LooseDb, id: number) {
    const [row] = await db
      .select()
      .from(inventoryTransferRequests)
      .where(eq(inventoryTransferRequests.id, id))
      .limit(1);
    return row || null;
  },
  async findInventoryTransfer(db: LooseDb, id: number) {
    const [row] = await db
      .select()
      .from(inventoryTransfers)
      .where(eq(inventoryTransfers.id, id))
      .limit(1);
    return row || null;
  },
};
