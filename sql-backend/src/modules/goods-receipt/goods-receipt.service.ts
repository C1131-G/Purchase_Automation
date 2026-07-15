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
  const header = await goodsReceiptRepository.findById(db, id);
  if (!header) {
    throw new AppError("Goods receipt not found", 404, "NOT_FOUND");
  }
  const lines = await goodsReceiptRepository.findLines(db, id);

  const attachmentsList = header.attachmentEntry
    ? await goodsReceiptRepository.findAttachments(db, header.attachmentEntry)
    : [];

  return {
    ...header,
    attachments: attachmentsList,
    lines: lines.map((line: DynRow) => ({
      ...line,
      InventoryAdjustmentReason: line.inventoryAdjustmentReason || "",
      U_INVADJMTRES: line.inventoryAdjustmentReason || "",
      binAllocations: line.binAllocations || [],
      inventoryAdjustmentReason: line.inventoryAdjustmentReason || "",
    })),
  };
};

export const getByDocNum = async (docNum: number) => {
  const db = getDb();
  const header = await goodsReceiptRepository.findByDocNum(db, docNum);
  if (!header) {
    throw new AppError("Goods receipt not found", 404, "NOT_FOUND");
  }
  const lines = await goodsReceiptRepository.findLines(db, header.id);

  const attachmentsList = header.attachmentEntry
    ? await goodsReceiptRepository.findAttachments(db, header.attachmentEntry)
    : [];

  return {
    ...header,
    attachments: attachmentsList,
    lines: lines.map((line: DynRow) => ({
      ...line,
      InventoryAdjustmentReason: line.inventoryAdjustmentReason || "",
      U_INVADJMTRES: line.inventoryAdjustmentReason || "",
      binAllocations: line.binAllocations || [],
      inventoryAdjustmentReason: line.inventoryAdjustmentReason || "",
    })),
  };
};

export const getDocNums = async (search?: string, limit?: number) => {
  const db = getDb();
  const safeLimit = Math.min(limit ?? 10, 100_000);
  const rows = await goodsReceiptRepository.findDocNums(db, search, safeLimit);
  return rows.map((row: DynRow) => row.docNum);
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

  const header = await goodsReceiptRepository.insertHeader(db, {
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
      payload.lines.map((line: DynRow, idx: number) => ({
        acctCode: line.acctCode ?? null,
        binAllocations: line.documentLinesBinAllocations ?? null,
        docEntry: header.id,
        dscription: line.dscription ?? null,
        inventoryAdjustmentReason: line.inventoryAdjustmentReason ?? null,
        itemCode: line.itemCode,
        lineNum: line.lineNum !== undefined && line.lineNum !== null ? line.lineNum : idx,
        ocrCode: line.ocrCode ?? line.costingCode ?? null,
        price: line.price === null || line.price === undefined ? null : String(line.price),
        quantity: String(line.quantity),
        unitMsr: line.unitMsr ?? null,
        uomCode: line.uomCode ?? null,
        warehouseCode: line.warehouseCode ?? null,
      })),
    );
  }

  logger.info({ docNum: payload.docNum }, "Goods receipt created");
  return getById(header.id);
};

export const update = async (id: number, payload: DynRow) => {
  const db = getDb();
  const existing = await goodsReceiptRepository.findById(db, id);
  if (!existing) {
    throw new AppError("Goods receipt not found", 404, "NOT_FOUND");
  }

  let { attachmentEntry } = existing;
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
    comments: payload.comments === undefined ? existing.comments : payload.comments,
    jrnlMemo: payload.jrnlMemo === undefined ? existing.jrnlMemo : payload.jrnlMemo,
    ref2: payload.ref2 === undefined ? existing.ref2 : payload.ref2,
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
