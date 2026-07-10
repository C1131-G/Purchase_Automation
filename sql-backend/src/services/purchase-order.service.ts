// Purchase Order Service: CRUD for purchase orders against local PostgreSQL via Drizzle.
// Mirrors hana-backend/src/services/purchase-order.service.ts without SAP Service Layer logic.

import { asc, count, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { purchaseOrderLines } from "@/db/schema/purchase-order-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { calculateLineTotal } from "@/services/discount.util";
import { getNextDocNum, previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series";
import { buildSqlListFilters } from "@/core/utils/query-helper";
import { resolveCardName } from "@/services/master-data.service";
import {
  calculateOpenQty,
  validateBaseLinks,
  recalculateParentStatuses,
} from "@/services/copy-flow.service";

export interface POListFilters {
  page?: number;
  limit?: number;
  cardCode?: string;
  docStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface POLineInput {
  lineNum?: number;
  itemCode: string;
  itemDescription?: string;
  quantity: number;
  unitPrice?: number;
  discountPercent?: number;
  vatGroup?: string;
  warehouseCode?: string;
  uomCode?: string;
}

export interface CreatePOInput {
  docNum?: number;
  docDate: string;
  docDueDate?: string;
  cardCode: string;
  cardName?: string;
  docCurrency?: string;
  address?: string;
  address2?: string;
  comments?: string;
  salesPersonCode?: number;
  discountPercent?: number;
  lines: POLineInput[];
}

// ─── Listing ────────────────────────────────────────────────────────────────

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    DocNum: purchaseOrders.docNum,
    DocDate: purchaseOrders.docDate,
    CardCode: purchaseOrders.cardCode,
    CardName: purchaseOrders.cardName,
    DocTotal: purchaseOrders.docTotal,
    DocStatus: purchaseOrders.docStatus,
  };
  const { where, orderBy } = buildSqlListFilters(purchaseOrders, filters, sortColumns);

  const [totalResult] = await db.select({ total: count() }).from(purchaseOrders).where(where);

  const total = Number(totalResult.total);
  const totalPages = Math.ceil(total / limit);

  const rows = await db
    .select()
    .from(purchaseOrders)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return { data: rows, total, page, limit, totalPages };
};

// ─── Single Record ──────────────────────────────────────────────────────────

export const getById = async (id: number) => {
  const db = getDb();

  const [header] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);

  if (!header) {
    throw new AppError("Purchase order not found", 404, "NOT_FOUND");
  }

  const lines = await db
    .select()
    .from(purchaseOrderLines)
    .where(eq(purchaseOrderLines.docEntry, id))
    .orderBy(asc(purchaseOrderLines.lineNum));

  const linesWithQty = await Promise.all(
    lines.map(async (l) => ({
      ...l,
      openQty: await calculateOpenQty(db, 22, header.id, l.lineNum, Number(l.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();

  let header;
  if (draftDocEntry && draftDocEntry > 0) {
    [header] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, draftDocEntry))
      .limit(1);
  } else {
    [header] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.docNum, docNum))
      .limit(1);
  }

  if (!header) {
    throw new AppError("Purchase order not found", 404, "NOT_FOUND");
  }

  const lines = await db
    .select()
    .from(purchaseOrderLines)
    .where(eq(purchaseOrderLines.docEntry, header.id))
    .orderBy(asc(purchaseOrderLines.lineNum));

  const linesWithQty = await Promise.all(
    lines.map(async (l) => ({
      ...l,
      openQty: await calculateOpenQty(db, 22, header.id, l.lineNum, Number(l.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const safeLimit = getSafeDocNumLimit(limit);

  const rows = await db
    .select({ docNum: purchaseOrders.docNum })
    .from(purchaseOrders)
    .where(search ? sql`CAST(${purchaseOrders.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
    .limit(safeLimit)
    .orderBy(desc(purchaseOrders.docNum));

  return rows.map((r) => r.docNum);
};

// ─── Mutations ──────────────────────────────────────────────────────────────

export const create = async (payload: any) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const isDraft = payload.isDraft === true;
    const draftDocEntry = payload.draftDocEntry;

    if (!isDraft) {
      // Validate base links (from PQ: 540000006)
      await validateBaseLinks(tx, payload.lines, payload.cardCode);
    }

    let headerId: number;
    let docNum: number;

    if (draftDocEntry && draftDocEntry > 0) {
      const [existing] = await tx
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, draftDocEntry))
        .limit(1);

      if (!existing) {
        throw new AppError("Draft document not found", 404, "NOT_FOUND");
      }

      headerId = draftDocEntry;
      docNum = payload.docNum ?? (await getNextDocNum("purchase_orders", "purchase_orders", 20000));
      const lineTotal = payload.lines.reduce(
        (sum: number, l: any) =>
          sum + calculateLineTotal(l.unitPrice ?? 0, l.quantity, l.discountPercent),
        0,
      );
      const cardName = await resolveCardName(payload.cardCode, payload.cardName);

      await tx
        .update(purchaseOrders)
        .set({
          docNum,
          docDate: payload.docDate,
          docDueDate: payload.docDueDate ?? null,
          cardCode: payload.cardCode,
          cardName,
          docTotal: String(lineTotal),
          docCurrency: payload.docCurrency ?? null,
          docStatus: isDraft ? "D" : "O",
          canceled: "N",
          address: payload.address ?? null,
          address2: payload.address2 ?? null,
          comments: payload.comments ?? null,
          numAtCard: payload.numAtCard ?? null,
          salesPersonCode: payload.salesPersonCode ?? null,
          discountPercent: payload.discountPercent ? String(payload.discountPercent) : null,
        })
        .where(eq(purchaseOrders.id, draftDocEntry));

      await tx.delete(purchaseOrderLines).where(eq(purchaseOrderLines.docEntry, draftDocEntry));
    } else {
      const docStatus = isDraft ? "D" : "O";
      docNum = payload.docNum ?? (await getNextDocNum("purchase_orders", "purchase_orders", 20000));

      const lineTotal = payload.lines.reduce(
        (sum: number, l: any) =>
          sum + calculateLineTotal(l.unitPrice ?? 0, l.quantity, l.discountPercent),
        0,
      );

      const cardName = await resolveCardName(payload.cardCode, payload.cardName);

      const [header] = await tx
        .insert(purchaseOrders)
        .values({
          docNum,
          docDate: payload.docDate,
          docDueDate: payload.docDueDate ?? null,
          cardCode: payload.cardCode,
          cardName,
          docTotal: String(lineTotal),
          docCurrency: payload.docCurrency ?? null,
          docStatus,
          canceled: "N",
          address: payload.address ?? null,
          address2: payload.address2 ?? null,
          comments: payload.comments ?? null,
          numAtCard: payload.numAtCard ?? null,
          salesPersonCode: payload.salesPersonCode ?? null,
          discountPercent: payload.discountPercent ? String(payload.discountPercent) : null,
        })
        .returning();
      headerId = header.id;
    }

    if (payload.lines.length > 0) {
      await tx.insert(purchaseOrderLines).values(
        payload.lines.map((l: any, idx: number) => ({
          docEntry: headerId,
          lineNum: l.lineNum !== undefined && l.lineNum !== null ? l.lineNum : idx,
          itemCode: l.itemCode,
          itemDescription: l.itemDescription ?? null,
          quantity: String(l.quantity),
          unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
          discountPercent: l.discountPercent != null ? String(l.discountPercent) : null,
          vatGroup: l.vatGroup ?? null,
          warehouseCode: l.warehouseCode ?? null,
          uomCode: l.uomCode ?? null,
          lineTotal: String(calculateLineTotal(l.unitPrice ?? 0, l.quantity, l.discountPercent)),
          baseType: l.baseType ?? null,
          baseEntry: l.baseEntry ?? null,
          baseLine: l.baseLine ?? null,
          baseQuantity: l.baseQuantity != null ? String(l.baseQuantity) : null,
        })),
      );
    }

    if (!isDraft) {
      // Recalculate parent statuses
      const parentDocEntries = new Set<number>(
        payload.lines.map((l: any) => l.baseEntry).filter(Boolean),
      );
      await recalculateParentStatuses(tx, parentDocEntries, 540000006);
    }

    return getById(headerId);
  });
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError("Purchase order not found", 404, "NOT_FOUND");
    }

    const isDraft = payload.isDraft === true || existing.docStatus === "D";

    if (!isDraft && payload.lines) {
      // Validate base links (from PQ: 540000006)
      await validateBaseLinks(tx, payload.lines, payload.cardCode ?? existing.cardCode, id, 22);
    }

    const updatedDocStatus =
      payload.isDraft === true ? "D" : existing.docStatus === "D" ? "O" : existing.docStatus;

    const cardName = await resolveCardName(
      payload.cardCode ?? existing.cardCode,
      payload.cardName !== undefined ? payload.cardName : existing.cardName,
    );

    // Save old parent entries before we modify the lines
    const oldLines = await tx
      .select({ baseEntry: purchaseOrderLines.baseEntry })
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.docEntry, id));
    const oldParentEntries = new Set<number>(oldLines.map((l: any) => l.baseEntry).filter(Boolean));

    const lineTotal = payload.lines
      ? payload.lines.reduce(
          (sum: number, l: any) =>
            sum + calculateLineTotal(l.unitPrice ?? 0, l.quantity, l.discountPercent),
          0,
        )
      : Number(existing.docTotal);

    await tx
      .update(purchaseOrders)
      .set({
        docDate: payload.docDate,
        docDueDate: payload.docDueDate ?? undefined,
        cardCode: payload.cardCode ?? undefined,
        cardName: cardName ?? undefined,
        docCurrency: payload.docCurrency ?? undefined,
        docStatus: updatedDocStatus,
        canceled: "N",
        docTotal: String(lineTotal),
        address: payload.address ?? undefined,
        address2: payload.address2 ?? undefined,
        comments: payload.comments ?? undefined,
        numAtCard: payload.numAtCard ?? undefined,
        salesPersonCode: payload.salesPersonCode ?? undefined,
        discountPercent:
          payload.discountPercent != null ? String(payload.discountPercent) : undefined,
      })
      .where(eq(purchaseOrders.id, id));

    if (payload.lines) {
      await tx.delete(purchaseOrderLines).where(eq(purchaseOrderLines.docEntry, id));

      await tx.insert(purchaseOrderLines).values(
        payload.lines.map((l: any, idx: number) => ({
          docEntry: id,
          lineNum: l.lineNum !== undefined && l.lineNum !== null ? l.lineNum : idx,
          itemCode: l.itemCode,
          itemDescription: l.itemDescription ?? null,
          quantity: String(l.quantity),
          unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
          discountPercent: l.discountPercent != null ? String(l.discountPercent) : null,
          vatGroup: l.vatGroup ?? null,
          warehouseCode: l.warehouseCode ?? null,
          uomCode: l.uomCode ?? null,
          lineTotal: String(calculateLineTotal(l.unitPrice ?? 0, l.quantity, l.discountPercent)),
          baseType: l.baseType ?? null,
          baseEntry: l.baseEntry ?? null,
          baseLine: l.baseLine ?? null,
          baseQuantity: l.baseQuantity != null ? String(l.baseQuantity) : null,
        })),
      );

      if (!isDraft) {
        const newParentEntries = new Set<number>(
          payload.lines.map((l: any) => l.baseEntry).filter(Boolean),
        );
        const allParentEntries = new Set<number>([...oldParentEntries, ...newParentEntries]);
        await recalculateParentStatuses(tx, allParentEntries, 540000006);
      }
    }

    return getById(id);
  });
};

export const cancel = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError("Purchase order not found", 404, "NOT_FOUND");
    }

    await tx
      .update(purchaseOrders)
      .set({ docStatus: "C", canceled: "Y" })
      .where(eq(purchaseOrders.id, id));

    const lines = await tx
      .select({ baseEntry: purchaseOrderLines.baseEntry })
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.docEntry, id));
    const parentEntries = new Set<number>(lines.map((l: any) => l.baseEntry).filter(Boolean));
    await recalculateParentStatuses(tx, parentEntries, 540000006);

    logger.info({ id, docNum: existing.docNum }, "Purchase order cancelled");
    return getById(id);
  });
};

export const previewNextDocNum = async () => {
  return await previewNextDocNumHelper("purchase_orders", "purchase_orders", 10000);
};

export const purchaseOrderService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  update,
  previewNextDocNum,
};
