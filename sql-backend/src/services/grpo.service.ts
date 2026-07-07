// GRPO Service: CRUD for goods receipt purchase orders.

import { asc, count, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { grpo } from "@/db/schema/grpo";
import { grpoLines } from "@/db/schema/grpo-lines";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { buildSqlListFilters } from "@/core/utils/query-helper";

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
  return { ...header, lines };
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
  return { ...header, lines };
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
  const isDraft = payload.isDraft === true;
  const draftDocEntry = payload.draftDocEntry;

  if (!isDraft && draftDocEntry && draftDocEntry > 0) {
    const [existing] = await db.select().from(grpo).where(eq(grpo.id, draftDocEntry)).limit(1);

    if (!existing) {
      throw new AppError("Draft document not found", 404, "NOT_FOUND");
    }

    const docNum = await getNextDocNum("grpo", "grpo", 50000);
    const lineTotal = payload.lines.reduce(
      (sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity,
      0,
    );

    await db
      .update(grpo)
      .set({
        docNum,
        docDate: payload.docDate,
        cardCode: payload.cardCode,
        cardName: payload.cardName ?? null,
        docCurrency: payload.docCurrency ?? null,
        docStatus: "O",
        docTotal: String(lineTotal),
        comments: payload.comments ?? null,
      })
      .where(eq(grpo.id, draftDocEntry));

    await db.delete(grpoLines).where(eq(grpoLines.docEntry, draftDocEntry));
    if (payload.lines?.length) {
      await db.insert(grpoLines).values(
        payload.lines.map((l: any) => ({
          docEntry: draftDocEntry,
          lineNum: l.lineNum,
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
        })),
      );
    }

    logger.info({ docNum, id: draftDocEntry }, "Draft converted to real GRPO");
    return getById(draftDocEntry);
  }

  const docStatus = isDraft ? "D" : "O";
  const docNum = await getNextDocNum("grpo", "grpo", 50000);
  const lineTotal = payload.lines.reduce(
    (sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity,
    0,
  );

  const [header] = await db
    .insert(grpo)
    .values({
      docNum,
      docDate: payload.docDate,
      cardCode: payload.cardCode,
      cardName: payload.cardName ?? null,
      docCurrency: payload.docCurrency ?? null,
      docStatus,
      docTotal: String(lineTotal),
      comments: payload.comments ?? null,
    })
    .returning();

  if (payload.lines?.length) {
    await db.insert(grpoLines).values(
      payload.lines.map((l: any) => ({
        docEntry: header.id,
        lineNum: l.lineNum,
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
      })),
    );
  }

  logger.info({ docNum }, "GRPO created");
  return getById(header.id);
};

export const update = async (id: number, payload: any) => {
  const db = getDb();
  const [existing] = await db.select().from(grpo).where(eq(grpo.id, id)).limit(1);
  if (!existing) throw new AppError("GRPO not found", 404, "NOT_FOUND");

  const updatedDocStatus = payload.isDraft === true ? "D" : existing.docStatus;
  const lineTotal = payload.lines
    ? payload.lines.reduce((sum: number, l: any) => sum + (l.unitPrice ?? 0) * l.quantity, 0)
    : Number(existing.docTotal);

  await db
    .update(grpo)
    .set({
      comments: payload.comments,
      docCurrency: payload.docCurrency,
      docStatus: updatedDocStatus,
      docTotal: String(lineTotal),
    })
    .where(eq(grpo.id, id));

  if (payload.lines) {
    await db.delete(grpoLines).where(eq(grpoLines.docEntry, id));
    await db.insert(grpoLines).values(
      payload.lines.map((l: any) => ({
        docEntry: id,
        lineNum: l.lineNum,
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
      })),
    );
  }

  return getById(id);
};

export const cancel = async (id: number) => {
  const db = getDb();
  const [existing] = await db.select().from(grpo).where(eq(grpo.id, id)).limit(1);
  if (!existing) throw new AppError("GRPO not found", 404, "NOT_FOUND");
  await db.update(grpo).set({ docStatus: "C" }).where(eq(grpo.id, id));
  return getById(id);
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
