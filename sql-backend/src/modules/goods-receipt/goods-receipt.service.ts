import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { buildSqlListFilters } from "@/core/utils/query-helper.util";
import { getDb } from "@/db/client";
import { goodsReceipts } from "@/db/schema/goods-receipts";
import type { DynRow } from "@/types/drizzle.types";

import { goodsReceiptRepository } from "./goods-receipt.repository";

export const getList = async (filters: DynRow = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    DocDate: goodsReceipts.docDate,
    DocNum: goodsReceipts.docNum,
    DocStatus: goodsReceipts.docStatus,
    DocTotal: goodsReceipts.docTotal,
  };
  const { where, orderBy } = buildSqlListFilters(goodsReceipts, filters, sortColumns);

  const total = await goodsReceiptRepository.countList(db, where);
  const rows = await goodsReceiptRepository.findList(db, where, orderBy, limit, offset);

  return {
    data: rows,
    limit,
    page,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const getById = async (id: number) => {
  const db = getDb();
  const h = await goodsReceiptRepository.findById(db, id);
  if (!h) {
    throw new AppError("Goods receipt not found", 404, "NOT_FOUND");
  }
  const lines = await goodsReceiptRepository.findLines(db, id);

  const attachmentsList = h.attachmentEntry
    ? await goodsReceiptRepository.findAttachments(db, h.attachmentEntry)
    : [];

  return {
    ...h,
    attachments: attachmentsList,
    lines: lines.map((l: DynRow) => ({
      ...l,
      InventoryAdjustmentReason: l.inventoryAdjustmentReason || "",
      U_INVADJMTRES: l.inventoryAdjustmentReason || "",
      binAllocations: l.binAllocations || [],
      inventoryAdjustmentReason: l.inventoryAdjustmentReason || "",
    })),
  };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const h = await goodsReceiptRepository.findByDocNum(db, docNum);
  if (!h) {
    throw new AppError("Goods receipt not found", 404, "NOT_FOUND");
  }
  const lines = await goodsReceiptRepository.findLines(db, h.id);

  const attachmentsList = h.attachmentEntry
    ? await goodsReceiptRepository.findAttachments(db, h.attachmentEntry)
    : [];

  return {
    ...h,
    attachments: attachmentsList,
    lines: lines.map((l: DynRow) => ({
      ...l,
      InventoryAdjustmentReason: l.inventoryAdjustmentReason || "",
      U_INVADJMTRES: l.inventoryAdjustmentReason || "",
      binAllocations: l.binAllocations || [],
      inventoryAdjustmentReason: l.inventoryAdjustmentReason || "",
    })),
  };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const safeLimit = Math.min(limit ?? 10, 100_000);
  const rows = await goodsReceiptRepository.findDocNums(db, search, safeLimit);
  return rows.map((r: DynRow) => r.docNum);
};

export const create = async (payload: DynRow) => {
  const db = getDb();

  let attachmentEntry: number | null = null;
  if (payload.attachments && Array.isArray(payload.attachments) && payload.attachments.length > 0) {
    attachmentEntry = Date.now() + Math.floor(Math.random() * 10_000);
    await goodsReceiptRepository.insertAttachments(
      db,
      payload.attachments.map((att: DynRow) => ({
        absEntry: attachmentEntry,
        attachmentDate: att.attachmentDate
          ? att.attachmentDate.split("T")[0]
          : new Date().toISOString().split("T")[0],
        fileExtension: att.fileExtension,
        fileName: att.fileName,
        freeText: att.freeText ?? null,
        sourcePath: att.sourcePath,
      })),
    );
  }

  const h = await goodsReceiptRepository.insertHeader(db, {
    attachmentEntry,
    comments: payload.comments ?? null,
    docCurrency: payload.docCurrency ?? null,
    docDate: payload.docDate,
    docNum: payload.docNum,
    docStatus: "O",
    jrnlMemo: payload.jrnlMemo ?? null,
    priceList: payload.priceList ?? null,
    ref2: payload.ref2 ?? null,
    series: payload.series ?? null,
    taxDate: payload.taxDate ?? null,
  });

  if (payload.lines?.length) {
    await goodsReceiptRepository.insertLines(
      db,
      payload.lines.map((l: DynRow, idx: number) => ({
        acctCode: l.acctCode ?? null,
        binAllocations: l.documentLinesBinAllocations ?? null,
        docEntry: h.id,
        dscription: l.dscription ?? null,
        inventoryAdjustmentReason: l.inventoryAdjustmentReason ?? null,
        itemCode: l.itemCode,
        lineNum: l.lineNum !== undefined && l.lineNum !== null ? l.lineNum : idx,
        ocrCode: l.ocrCode ?? l.costingCode ?? null,
        price: l.price === null || l.price === undefined ? null : String(l.price),
        quantity: String(l.quantity),
        unitMsr: l.unitMsr ?? null,
        uomCode: l.uomCode ?? null,
        warehouseCode: l.warehouseCode ?? null,
      })),
    );
  }

  logger.info({ docNum: payload.docNum }, "Goods receipt created");
  return getById(h.id);
};

export const update = async (id: number, payload: DynRow) => {
  const db = getDb();
  const ex = await goodsReceiptRepository.findById(db, id);
  if (!ex) {
    throw new AppError("Goods receipt not found", 404, "NOT_FOUND");
  }

  let { attachmentEntry } = ex;
  if (payload.attachments !== undefined) {
    if (
      payload.attachments &&
      Array.isArray(payload.attachments) &&
      payload.attachments.length > 0
    ) {
      if (attachmentEntry) {
        await goodsReceiptRepository.deleteAttachments(db, attachmentEntry);
      } else {
        attachmentEntry = Date.now() + Math.floor(Math.random() * 10_000);
      }
      await goodsReceiptRepository.insertAttachments(
        db,
        payload.attachments.map((att: DynRow) => ({
          absEntry: attachmentEntry,
          attachmentDate: att.attachmentDate
            ? att.attachmentDate.split("T")[0]
            : new Date().toISOString().split("T")[0],
          fileExtension: att.fileExtension,
          fileName: att.fileName,
          freeText: att.freeText ?? null,
          sourcePath: att.sourcePath,
        })),
      );
    } else {
      if (attachmentEntry) {
        await goodsReceiptRepository.deleteAttachments(db, attachmentEntry);
        attachmentEntry = null;
      }
    }
  }

  await goodsReceiptRepository.updateHeader(db, id, {
    attachmentEntry,
    comments: payload.comments === undefined ? ex.comments : payload.comments,
    jrnlMemo: payload.jrnlMemo === undefined ? ex.jrnlMemo : payload.jrnlMemo,
    ref2: payload.ref2 === undefined ? ex.ref2 : payload.ref2,
  });

  return getById(id);
};

export const previewNextDocNum = async () => {
  const { previewNextDocNum: previewNextDocNumHelper } = await import("@/core/utils/series.util");
  return previewNextDocNumHelper("goods_receipts", "goods_receipts", 80_000);
};

export const goodsReceiptService = {
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
