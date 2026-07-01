import type { RequestHandler } from "express";
import { eq, sql } from "drizzle-orm";

// Quick-lookup endpoints needed by frontend
export const getOpenLines: RequestHandler = async (_req, res, next) => {
  try {
    const { getDb } = await import("@/db/client");
    const { purchaseQuotationLines } = await import("@/db/schema/purchase-quotation-lines");
    const db = getDb();
    const rows = await db
      .select()
      .from(purchaseQuotationLines)
      .where(sql`${purchaseQuotationLines.baseEntry} IS NULL`)
      .limit(50);
    res.status(200).json({ data: rows, success: true });
  } catch (e) {
    next(e);
  }
};

export const getSalesEmployee: RequestHandler = async (_req, res, next) => {
  try {
    const { getDb } = await import("@/db/client");
    const { salesEmployees } = await import("@/db/schema/sales-employees");
    const db = getDb();
    const rows = await db.select().from(salesEmployees).limit(100);
    res.status(200).json({ data: rows, success: true });
  } catch (e) {
    next(e);
  }
};

export const getAvailablePos: RequestHandler = async (_req, res, next) => {
  try {
    const { getDb } = await import("@/db/client");
    const { purchaseOrders } = await import("@/db/schema/purchase-orders");
    const db = getDb();
    const rows = await db
      .select({
        id: purchaseOrders.id,
        docNum: purchaseOrders.docNum,
        cardCode: purchaseOrders.cardCode,
        cardName: purchaseOrders.cardName,
        docDate: purchaseOrders.docDate,
        docTotal: purchaseOrders.docTotal,
      })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.docStatus, "O"))
      .limit(50);
    res.status(200).json({ data: rows, success: true });
  } catch (e) {
    next(e);
  }
};

export const getPoDetail: RequestHandler = async (req, res, next) => {
  try {
    const { getDb } = await import("@/db/client");
    const { eq } = await import("drizzle-orm");
    const { purchaseOrders } = await import("@/db/schema/purchase-orders");
    const { purchaseOrderLines } = await import("@/db/schema/purchase-order-lines");
    const db = getDb();
    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, Number(req.params.id)))
      .limit(1);
    if (!po) return res.status(404).json({ message: "PO not found", success: false });
    const lines = await db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.docEntry, po.id));
    res.status(200).json({ data: { ...po, DocumentLines: lines }, success: true });
  } catch (e) {
    next(e);
  }
};

export const getAccounts: RequestHandler = async (_req, res, next) => {
  try {
    const { getDb } = await import("@/db/client");
    const { chartOfAccounts } = await import("@/db/schema/chart-of-accounts");
    const db = getDb();
    const rows = await db.select().from(chartOfAccounts).limit(100);
    res.status(200).json({ data: rows, success: true });
  } catch (e) {
    next(e);
  }
};

export const quickLookupDal = {
  getAccounts,
  getAvailablePos,
  getOpenLines,
  getPoDetail,
  getSalesEmployee,
};
