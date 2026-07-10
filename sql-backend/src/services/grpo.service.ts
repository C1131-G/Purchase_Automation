// GRPO Service: CRUD for goods receipt purchase orders.

import { asc, count, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { grpo } from "@/db/schema/grpo";
import { grpoLines } from "@/db/schema/grpo-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { getNextDocNum, previewNextDocNum as previewNextDocNumHelper } from "@/core/utils/series";
import { buildSqlListFilters } from "@/core/utils/query-helper";
import { resolveCardName } from "@/services/master-data.service";

import {
  calculateOpenQty,
  validateBaseLinks,
  recalculateParentStatuses,
} from "@/services/copy-flow.service";

export const getList = async (filters: any = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    DocNum: grpo.docNum,
    DocDate: grpo.docDate,
    CardCode: grpo.cardCode,
    CardName: grpo.cardName,
    DocTotal: grpo.docTotal,
    DocStatus: grpo.docStatus,
  };
  const { where, orderBy } = buildSqlListFilters(grpo, filters, sortColumns);

  const [totalResult] = await db.select({ total: count() }).from(grpo).where(where);
  const rows = await db
    .select()
    .from(grpo)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);
  return {
    data: rows,
    total: Number(totalResult.total),
    page,
    limit,
    totalPages: Math.ceil(Number(totalResult.total) / limit),
  };
};

export const getById = async (id: number) => {
  const db = getDb();
  const [header] = await db.select().from(grpo).where(eq(grpo.id, id)).limit(1);
  if (!header) throw new AppError("GRPO not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(grpoLines)
    .where(eq(grpoLines.docEntry, id))
    .orderBy(asc(grpoLines.lineNum));

  const linesWithQty = await Promise.all(
    lines.map(async (l) => ({
      ...l,
      openQty: await calculateOpenQty(db, 20, header.id, l.lineNum, Number(l.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getByDocNum = async (docNum: number, draftDocEntry?: number) => {
  const db = getDb();
  let header;
  if (draftDocEntry && draftDocEntry > 0) {
    [header] = await db.select().from(grpo).where(eq(grpo.id, draftDocEntry)).limit(1);
  } else {
    [header] = await db.select().from(grpo).where(eq(grpo.docNum, docNum)).limit(1);
  }
  if (!header) throw new AppError("GRPO not found", 404, "NOT_FOUND");
  const lines = await db
    .select()
    .from(grpoLines)
    .where(eq(grpoLines.docEntry, header.id))
    .orderBy(asc(grpoLines.lineNum));

  const linesWithQty = await Promise.all(
    lines.map(async (l) => ({
      ...l,
      openQty: await calculateOpenQty(db, 20, header.id, l.lineNum, Number(l.quantity || 0)),
    })),
  );

  return { ...header, lines: linesWithQty };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const rows = await db
    .select({ docNum: grpo.docNum })
    .from(grpo)
    .where(search ? sql`CAST(${grpo.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
    .limit(getSafeDocNumLimit(limit))
    .orderBy(desc(grpo.docNum));
  return rows.map((r) => r.docNum);
};

export const create = async (payload: any) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const isDraft = payload.isDraft === true;
    const draftDocEntry = payload.draftDocEntry;

    if (!isDraft) {
      await validateBaseLinks(tx, payload.lines, payload.cardCode);
    }

    let headerId: number;
    let docNum: number;

    if (draftDocEntry && draftDocEntry > 0) {
      const [existing] = await tx.select().from(grpo).where(eq(grpo.id, draftDocEntry)).limit(1);

      if (!existing) {
        throw new AppError("Draft document not found", 404, "NOT_FOUND");
      }

      headerId = draftDocEntry;
      docNum = await getNextDocNum("grpo", "grpo", 50000);
      const lineTotal = payload.lines.reduce(
        (sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity,
        0,
      );

      const cardName = await resolveCardName(payload.cardCode, payload.cardName);

      await tx
        .update(grpo)
        .set({
          docNum,
          docDate: payload.docDate,
          docDueDate: payload.docDueDate ?? null,
          cardCode: payload.cardCode,
          cardName,
          docCurrency: payload.docCurrency ?? null,
          docStatus: isDraft ? "D" : "O",
          canceled: "N",
          docTotal: String(lineTotal),
          address: payload.address ?? null,
          address2: payload.address2 ?? null,
          comments: payload.comments ?? null,
          numAtCard: payload.numAtCard ?? null,
        })
        .where(eq(grpo.id, draftDocEntry));

      await tx.delete(grpoLines).where(eq(grpoLines.docEntry, draftDocEntry));
    } else {
      const docStatus = isDraft ? "D" : "O";
      docNum = await getNextDocNum("grpo", "grpo", 50000);
      const lineTotal = payload.lines.reduce(
        (sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity,
        0,
      );

      const cardName = await resolveCardName(payload.cardCode, payload.cardName);

      const [header] = await tx
        .insert(grpo)
        .values({
          docNum,
          docDate: payload.docDate,
          docDueDate: payload.docDueDate ?? null,
          cardCode: payload.cardCode,
          cardName,
          docCurrency: payload.docCurrency ?? null,
          docStatus,
          canceled: "N",
          docTotal: String(lineTotal),
          address: payload.address ?? null,
          address2: payload.address2 ?? null,
          comments: payload.comments ?? null,
          numAtCard: payload.numAtCard ?? null,
        })
        .returning();
      headerId = header.id;
    }

    if (payload.lines?.length) {
      await tx.insert(grpoLines).values(
        payload.lines.map((l: any, idx: number) => ({
          docEntry: headerId,
          lineNum: l.lineNum !== undefined && l.lineNum !== null ? l.lineNum : idx,
          itemCode: l.itemCode,
          itemDescription: l.itemDescription ?? null,
          quantity: String(l.quantity),
          unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
          warehouseCode: l.warehouseCode ?? null,
          uomCode: l.uomCode ?? null,
          lineTotal: String((l.unitPrice ?? 0) * l.quantity),
          baseEntry: l.baseEntry ?? null,
          baseLine: l.baseLine ?? null,
          baseType: l.baseType ?? null,
          baseQuantity: l.baseQuantity != null ? String(l.baseQuantity) : null,
        })),
      );
    }

    if (!isDraft) {
      const parentDocEntries = new Set<number>(
        payload.lines.map((l: any) => l.baseEntry).filter(Boolean),
      );
      await recalculateParentStatuses(tx, parentDocEntries, 22);
    }

    logger.info({ docNum, id: headerId }, "GRPO processed");
    return getById(headerId);
  });
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(grpo).where(eq(grpo.id, id)).limit(1);
    if (!existing) throw new AppError("GRPO not found", 404, "NOT_FOUND");

    const isDraft = payload.isDraft === true || existing.docStatus === "D";

    if (!isDraft && payload.lines) {
      await validateBaseLinks(tx, payload.lines, payload.cardCode ?? existing.cardCode, id, 20);
    }

    const updatedDocStatus =
      payload.isDraft === true ? "D" : existing.docStatus === "D" ? "O" : existing.docStatus;
    const lineTotal = payload.lines
      ? payload.lines.reduce((sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity, 0)
      : Number(existing.docTotal);

    // Save old parent entries before we modify the lines
    const oldLines = await tx
      .select({ baseEntry: grpoLines.baseEntry })
      .from(grpoLines)
      .where(eq(grpoLines.docEntry, id));
    const oldParentEntries = new Set<number>(oldLines.map((l: any) => l.baseEntry).filter(Boolean));

    await tx
      .update(grpo)
      .set({
        docDate: payload.docDate,
        docDueDate: payload.docDueDate ?? undefined,
        docCurrency: payload.docCurrency,
        docStatus: updatedDocStatus,
        canceled: "N",
        docTotal: String(lineTotal),
        address: payload.address ?? undefined,
        address2: payload.address2 ?? undefined,
        comments: payload.comments,
        numAtCard: payload.numAtCard ?? undefined,
      })
      .where(eq(grpo.id, id));

    if (payload.lines) {
      await tx.delete(grpoLines).where(eq(grpoLines.docEntry, id));
      await tx.insert(grpoLines).values(
        payload.lines.map((l: any, idx: number) => ({
          docEntry: id,
          lineNum: l.lineNum !== undefined && l.lineNum !== null ? l.lineNum : idx,
          itemCode: l.itemCode,
          itemDescription: l.itemDescription ?? null,
          quantity: String(l.quantity),
          unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
          warehouseCode: l.warehouseCode ?? null,
          uomCode: l.uomCode ?? null,
          lineTotal: String((l.unitPrice ?? 0) * l.quantity),
          baseEntry: l.baseEntry ?? null,
          baseLine: l.baseLine ?? null,
          baseType: l.baseType ?? null,
          baseQuantity: l.baseQuantity != null ? String(l.baseQuantity) : null,
        })),
      );

      if (!isDraft) {
        const newParentEntries = new Set<number>(
          payload.lines.map((l: any) => l.baseEntry).filter(Boolean),
        );
        const allParentEntries = new Set<number>([...oldParentEntries, ...newParentEntries]);
        await recalculateParentStatuses(tx, allParentEntries, 22);
      }
    }

    return getById(id);
  });
};

export const cancel = async (id: number) => {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(grpo).where(eq(grpo.id, id)).limit(1);
    if (!existing) throw new AppError("GRPO not found", 404, "NOT_FOUND");
    await tx.update(grpo).set({ docStatus: "C", canceled: "Y" }).where(eq(grpo.id, id));

    const lines = await tx
      .select({ baseEntry: grpoLines.baseEntry })
      .from(grpoLines)
      .where(eq(grpoLines.docEntry, id));
    const parentEntries = new Set<number>(lines.map((l: any) => l.baseEntry).filter(Boolean));
    await recalculateParentStatuses(tx, parentEntries, 22);

    return getById(id);
  });
};

export const previewNextDocNum = async () => {
  return previewNextDocNumHelper("grpo", "grpo", 50000);
};

export const grpoService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
