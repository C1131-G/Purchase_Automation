// Quick-lookup handlers: Shared Express handlers for cross-module lookups
// (open lines, PO details, accounts, sales employees).

import type { RequestHandler } from "express";

import { toPascalCase } from "@/core/utils/sap-format.util";
import { getDb } from "@/db/client";
import { calculateOpenQty, getOpenLinesForDocType } from "@/services/document-link/document-link";

export const getOpenLines: RequestHandler = async (req, res, next) => {
  try {
    const cardCode = req.query.cardCode as string;
    if (!cardCode) {
      return res.status(400).json({
        message: "cardCode query parameter is required",
        success: false,
      });
    }

    const db = getDb();
    const openLines = await getOpenLinesForDocType(db, 540_000_006, cardCode);
    const transformed = toPascalCase({ lines: openLines });
    res.status(200).json({ data: transformed.DocumentLines || [], success: true });
  } catch (error) {
    return next(error);
  }
};

export const getOpenSalesQuotationLines: RequestHandler = async (req, res, next) => {
  try {
    const cardCode = req.query.cardCode as string;
    if (!cardCode) {
      return res.status(400).json({
        message: "cardCode query parameter is required",
        success: false,
      });
    }

    const db = getDb();
    const openLines = await getOpenLinesForDocType(db, 23, cardCode);
    const transformed = toPascalCase({ lines: openLines });
    res.status(200).json({ data: transformed.DocumentLines || [], success: true });
  } catch (error) {
    return next(error);
  }
};

export const getOpenSalesOrderLines: RequestHandler = async (req, res, next) => {
  try {
    const cardCode = req.query.cardCode as string;
    if (!cardCode) {
      return res.status(400).json({
        message: "cardCode query parameter is required",
        success: false,
      });
    }

    const db = getDb();
    const openLines = await getOpenLinesForDocType(db, 17, cardCode);
    const transformed = toPascalCase({ lines: openLines });
    res.status(200).json({ data: transformed.DocumentLines || [], success: true });
  } catch (error) {
    return next(error);
  }
};

export const getSalesEmployee: RequestHandler = async (_req, res, next) => {
  try {
    const { salesEmployees } = await import("@/db/schema/sales-employees");
    const db = getDb();
    const rows = await db.select().from(salesEmployees).limit(100);
    res.status(200).json({ data: rows, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getAvailablePos: RequestHandler = async (_req, res, next) => {
  try {
    const { purchaseOrders } = await import("@/db/schema/purchase-orders");
    const { purchaseOrderLines } = await import("@/db/schema/purchase-order-lines");
    const { eq, and, sql } = await import("drizzle-orm");

    const db = getDb();
    const pos = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.docStatus, "O"),
          sql`COALESCE(${purchaseOrders.canceled}, 'N') <> 'Y'`,
        ),
      );

    const availablePos = [];
    for (const purchaseOrder of pos) {
      const lines = await db
        .select()
        .from(purchaseOrderLines)
        .where(eq(purchaseOrderLines.docEntry, purchaseOrder.id));

      let hasOpenLines = false;
      for (const line of lines) {
        const openQty = await calculateOpenQty(
          db,
          22,
          purchaseOrder.id,
          line.lineNum,
          Number(line.quantity || 0),
        );
        if (openQty > 0) {
          hasOpenLines = true;
          break;
        }
      }
      if (hasOpenLines) {
        availablePos.push({
          cardCode: purchaseOrder.cardCode,
          cardName: purchaseOrder.cardName,
          docDate: purchaseOrder.docDate,
          docNum: purchaseOrder.docNum,
          docTotal: purchaseOrder.docTotal,
          id: purchaseOrder.id,
        });
      }
    }

    res.status(200).json({ data: availablePos, success: true });
  } catch (error) {
    return next(error);
  }
};

export const getPoDetail: RequestHandler = async (req, res, next) => {
  try {
    const { eq, asc } = await import("drizzle-orm");
    const { purchaseOrders } = await import("@/db/schema/purchase-orders");
    const { purchaseOrderLines } = await import("@/db/schema/purchase-order-lines");

    const db = getDb();
    const poId = Number(req.params.id);
    const [purchaseOrder] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1);

    if (!purchaseOrder) {
      return res.status(404).json({ message: "PO not found", success: false });
    }

    const lines = await db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.docEntry, poId))
      .orderBy(asc(purchaseOrderLines.lineNum));

    const copyableLines = [];
    for (const line of lines) {
      const openQty = await calculateOpenQty(
        db,
        22,
        poId,
        line.lineNum,
        Number(line.quantity || 0),
      );
      if (openQty > 0) {
        copyableLines.push({ ...line, openQty });
      }
    }

    res.status(200).json({
      data: toPascalCase({ ...purchaseOrder, lines: copyableLines }),
      success: true,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAccounts: RequestHandler = async (_req, res, next) => {
  try {
    const { chartOfAccounts } = await import("@/db/schema/chart-of-accounts");
    const db = getDb();
    const rows = await db.select().from(chartOfAccounts).limit(100);
    res.status(200).json({ data: rows, success: true });
  } catch (error) {
    return next(error);
  }
};

export const quickLookupController = {
  getAccounts,
  getAvailablePos,
  getOpenLines,
  getOpenSalesOrderLines,
  getOpenSalesQuotationLines,
  getPoDetail,
  getSalesEmployee,
};
