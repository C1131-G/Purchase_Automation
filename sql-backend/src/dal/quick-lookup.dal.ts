import type { RequestHandler } from "express";

export const getOpenLines: RequestHandler = async (req, res, next) => {
  try {
    const { getDb } = await import("@/db/client");
    const { eq, and, asc, sql } = await import("drizzle-orm");
    const { purchaseQuotations } = await import("@/db/schema/purchase-quotations");
    const { purchaseQuotationLines } = await import("@/db/schema/purchase-quotation-lines");
    const { calculateOpenQty } = await import("@/services/copy-flow.service");
    const { toPascalCase } = await import("@/core/utils/response-transformer");

    const cardCode = req.query.cardCode as string;
    if (!cardCode) {
      return res
        .status(400)
        .json({ message: "cardCode query parameter is required", success: false });
    }

    const db = getDb();
    const pqs = await db
      .select({
        id: purchaseQuotations.id,
        docNum: purchaseQuotations.docNum,
        docDate: purchaseQuotations.docDate,
        docCurrency: purchaseQuotations.docCurrency,
        discountPercent: purchaseQuotations.discountPercent,
      })
      .from(purchaseQuotations)
      .where(
        and(
          eq(purchaseQuotations.cardCode, cardCode),
          eq(purchaseQuotations.docStatus, "O"),
          sql`COALESCE(${purchaseQuotations.canceled}, 'N') <> 'Y'`,
        ),
      );

    const openLines = [];
    for (const pq of pqs) {
      const lines = await db
        .select()
        .from(purchaseQuotationLines)
        .where(eq(purchaseQuotationLines.docEntry, pq.id))
        .orderBy(asc(purchaseQuotationLines.lineNum));

      for (const line of lines) {
        const openQty = await calculateOpenQty(
          db,
          540000006,
          pq.id,
          line.lineNum,
          Number(line.quantity || 0),
        );
        if (openQty > 0) {
          openLines.push({
            discountPercent: Number(line.discountPercent || pq.discountPercent || 0),
            docCurr: pq.docCurrency || "",
            docDate: pq.docDate,
            docEntry: pq.id,
            docNum: pq.docNum,
            itemCode: line.itemCode,
            itemDescription: line.itemDescription || "",
            lineNum: line.lineNum,
            lineTotal: Number(line.lineTotal || 0),
            openQty,
            price: Number(line.unitPrice || 0),
            quantity: Number(line.quantity || 0),
            uoMCode: line.uomCode || "",
            warehouseCode: line.warehouseCode || "",
            vatGroup: line.vatGroup || "",
            vatPrcnt: 0,
          });
        }
      }
    }

    const transformed = toPascalCase({ lines: openLines });
    res.status(200).json({ data: transformed.DocumentLines || [], success: true });
  } catch (e) {
    next(e);
  }
};

export const getOpenSalesQuotationLines: RequestHandler = async (req, res, next) => {
  try {
    const { getDb } = await import("@/db/client");
    const { eq, and, asc, sql } = await import("drizzle-orm");
    const { salesQuotations } = await import("@/db/schema/sales-quotations");
    const { salesQuotationLines } = await import("@/db/schema/sales-quotation-lines");
    const { calculateOpenQty } = await import("@/services/copy-flow.service");
    const { toPascalCase } = await import("@/core/utils/response-transformer");

    const cardCode = req.query.cardCode as string;
    if (!cardCode) {
      return res
        .status(400)
        .json({ message: "cardCode query parameter is required", success: false });
    }

    const db = getDb();
    const sqs = await db
      .select({
        id: salesQuotations.id,
        docNum: salesQuotations.docNum,
        docDate: salesQuotations.docDate,
        docCurrency: salesQuotations.docCurrency,
        discountPercent: salesQuotations.discountPercent,
      })
      .from(salesQuotations)
      .where(
        and(
          eq(salesQuotations.cardCode, cardCode),
          eq(salesQuotations.docStatus, "O"),
          sql`COALESCE(${salesQuotations.canceled}, 'N') <> 'Y'`,
        ),
      );

    const openLines = [];
    for (const sq of sqs) {
      const lines = await db
        .select()
        .from(salesQuotationLines)
        .where(eq(salesQuotationLines.docEntry, sq.id))
        .orderBy(asc(salesQuotationLines.lineNum));

      for (const line of lines) {
        const openQty = await calculateOpenQty(
          db,
          23,
          sq.id,
          line.lineNum,
          Number(line.quantity || 0),
        );
        if (openQty > 0) {
          openLines.push({
            discountPercent: Number(line.discountPercent || sq.discountPercent || 0),
            docCurr: sq.docCurrency || "",
            docDate: sq.docDate,
            docEntry: sq.id,
            docNum: sq.docNum,
            itemCode: line.itemCode,
            itemDescription: line.itemDescription || "",
            lineNum: line.lineNum,
            lineTotal: Number(line.lineTotal || 0),
            openQty,
            price: Number(line.unitPrice || 0),
            quantity: Number(line.quantity || 0),
            uoMCode: line.uomCode || "",
            warehouseCode: line.warehouseCode || "",
          });
        }
      }
    }

    const transformed = toPascalCase({ lines: openLines });
    res.status(200).json({ data: transformed.DocumentLines || [], success: true });
  } catch (e) {
    next(e);
  }
};

export const getOpenSalesOrderLines: RequestHandler = async (req, res, next) => {
  try {
    const { getDb } = await import("@/db/client");
    const { eq, and, asc, sql } = await import("drizzle-orm");
    const { salesOrders } = await import("@/db/schema/sales-orders");
    const { salesOrderLines } = await import("@/db/schema/sales-order-lines");
    const { calculateOpenQty } = await import("@/services/copy-flow.service");
    const { toPascalCase } = await import("@/core/utils/response-transformer");

    const cardCode = req.query.cardCode as string;
    if (!cardCode) {
      return res
        .status(400)
        .json({ message: "cardCode query parameter is required", success: false });
    }

    const db = getDb();
    const sos = await db
      .select({
        id: salesOrders.id,
        docNum: salesOrders.docNum,
        docDate: salesOrders.docDate,
        docCurrency: salesOrders.docCurrency,
        discountPercent: salesOrders.discountPercent,
      })
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.cardCode, cardCode),
          eq(salesOrders.docStatus, "O"),
          sql`COALESCE(${salesOrders.canceled}, 'N') <> 'Y'`,
        ),
      );

    const openLines = [];
    for (const so of sos) {
      const lines = await db
        .select()
        .from(salesOrderLines)
        .where(eq(salesOrderLines.docEntry, so.id))
        .orderBy(asc(salesOrderLines.lineNum));

      for (const line of lines) {
        const openQty = await calculateOpenQty(
          db,
          17,
          so.id,
          line.lineNum,
          Number(line.quantity || 0),
        );
        if (openQty > 0) {
          openLines.push({
            discountPercent: Number(line.discountPercent || so.discountPercent || 0),
            docCurr: so.docCurrency || "",
            docDate: so.docDate,
            docEntry: so.id,
            docNum: so.docNum,
            itemCode: line.itemCode,
            itemDescription: line.itemDescription || "",
            lineNum: line.lineNum,
            lineTotal: Number(line.lineTotal || 0),
            openQty,
            price: Number(line.unitPrice || 0),
            quantity: Number(line.quantity || 0),
            uoMCode: line.uomCode || "",
            warehouseCode: line.warehouseCode || "",
          });
        }
      }
    }

    const transformed = toPascalCase({ lines: openLines });
    res.status(200).json({ data: transformed.DocumentLines || [], success: true });
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
    const { purchaseOrderLines } = await import("@/db/schema/purchase-order-lines");
    const { eq, and, sql } = await import("drizzle-orm");
    const { calculateOpenQty } = await import("@/services/copy-flow.service");

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
    for (const po of pos) {
      const lines = await db
        .select()
        .from(purchaseOrderLines)
        .where(eq(purchaseOrderLines.docEntry, po.id));

      let hasOpenLines = false;
      for (const line of lines) {
        const openQty = await calculateOpenQty(
          db,
          22,
          po.id,
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
          id: po.id,
          docNum: po.docNum,
          cardCode: po.cardCode,
          cardName: po.cardName,
          docDate: po.docDate,
          docTotal: po.docTotal,
        });
      }
    }

    res.status(200).json({ data: availablePos, success: true });
  } catch (e) {
    next(e);
  }
};

export const getPoDetail: RequestHandler = async (req, res, next) => {
  try {
    const { getDb } = await import("@/db/client");
    const { eq, asc } = await import("drizzle-orm");
    const { purchaseOrders } = await import("@/db/schema/purchase-orders");
    const { purchaseOrderLines } = await import("@/db/schema/purchase-order-lines");
    const { calculateOpenQty } = await import("@/services/copy-flow.service");
    const { toPascalCase } = await import("@/core/utils/response-transformer");

    const db = getDb();
    const poId = Number(req.params.id);
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1);

    if (!po) return res.status(404).json({ message: "PO not found", success: false });

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
        copyableLines.push({
          ...line,
          openQty,
        });
      }
    }

    res.status(200).json({
      data: toPascalCase({
        ...po,
        lines: copyableLines,
      }),
      success: true,
    });
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
  getOpenSalesQuotationLines,
  getOpenSalesOrderLines,
  getPoDetail,
  getSalesEmployee,
};
