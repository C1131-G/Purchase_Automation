import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { buildSqlListFilters } from "@/core/utils/query-helper.util";
import { getDb } from "@/db/client";
import { goodsIssues } from "@/db/schema/goods-issues";
import type { DynRow } from "@/types/drizzle.types";

import { goodsIssueRepository } from "./goods-issue.repository";

export const getList = async (filters: DynRow = {}) => {
  const db = getDb();
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const offset = (page - 1) * limit;

  const sortColumns = {
    DocDate: goodsIssues.docDate,
    DocNum: goodsIssues.docNum,
    DocStatus: goodsIssues.docStatus,
    DocTotal: goodsIssues.docTotal,
  };
  const { where, orderBy } = buildSqlListFilters(goodsIssues, filters, sortColumns);

  const total = await goodsIssueRepository.countList(db, where);
  const rows = await goodsIssueRepository.findList(db, where, orderBy, limit, offset);

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
  const header = await goodsIssueRepository.findById(db, id);
  if (!header) {
    throw new AppError("Goods issue not found", 404, "NOT_FOUND");
  }
  const lines = await goodsIssueRepository.findLines(db, id);

  const attachmentsList = header.attachmentEntry
    ? await goodsIssueRepository.findAttachments(db, header.attachmentEntry)
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
  const header = await goodsIssueRepository.findByDocNum(db, docNum);
  if (!header) {
    throw new AppError("Goods issue not found", 404, "NOT_FOUND");
  }
  const lines = await goodsIssueRepository.findLines(db, header.id);

  const attachmentsList = header.attachmentEntry
    ? await goodsIssueRepository.findAttachments(db, header.attachmentEntry)
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
  const rows = await goodsIssueRepository.findDocNums(db, search, safeLimit);
  return rows.map((row: DynRow) => row.docNum);
};

export const create = async (payload: DynRow) => {
  const db = getDb();

  let attachmentEntry: number | null = null;
  if (payload.attachments && Array.isArray(payload.attachments) && payload.attachments.length > 0) {
    attachmentEntry = Date.now() + Math.floor(Math.random() * 10_000);
    await goodsIssueRepository.insertAttachments(
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

  const header = await goodsIssueRepository.insertHeader(db, {
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
    await goodsIssueRepository.insertLines(
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

  logger.info({ docNum: payload.docNum }, "Goods issue created");
  return getById(header.id);
};

export const update = async (id: number, payload: DynRow) => {
  const db = getDb();
  const existing = await goodsIssueRepository.findById(db, id);
  if (!existing) {
    throw new AppError("Goods issue not found", 404, "NOT_FOUND");
  }

  let { attachmentEntry } = existing;
  if (payload.attachments !== undefined) {
    if (
      payload.attachments &&
      Array.isArray(payload.attachments) &&
      payload.attachments.length > 0
    ) {
      if (attachmentEntry) {
        await goodsIssueRepository.deleteAttachments(db, attachmentEntry);
      } else {
        attachmentEntry = Date.now() + Math.floor(Math.random() * 10_000);
      }
      await goodsIssueRepository.insertAttachments(
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
        await goodsIssueRepository.deleteAttachments(db, attachmentEntry);
        attachmentEntry = null;
      }
    }
  }

  await goodsIssueRepository.updateHeader(db, id, {
    attachmentEntry,
    comments: payload.comments === undefined ? existing.comments : payload.comments,
    jrnlMemo: payload.jrnlMemo === undefined ? existing.jrnlMemo : payload.jrnlMemo,
    ref2: payload.ref2 === undefined ? existing.ref2 : payload.ref2,
  });

  return getById(id);
};

export const previewNextDocNum = async () => {
  const { previewNextDocNum: previewNextDocNumHelper } = await import("@/core/utils/series.util");
  return previewNextDocNumHelper("goods_issues", "goods_issues", 81_000);
};

export const goodsIssueService = {
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
