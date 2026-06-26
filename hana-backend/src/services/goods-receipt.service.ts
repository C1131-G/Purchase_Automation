import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { GoodsReceiptSchema } from "@/db/schemas/goods-receipt.schema";
import { GoodsReceiptLineSchema } from "@/db/schemas/goods-receipt-line.schema";
import type { GoodsReceipt } from "@/db/schemas/goods-receipt.schema";
import { PageService } from "@/services/page-service.service";
import type { GoodsReceiptQuery } from "@/validation/schemas/inputs/goods-receipt.input";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";

export const getGoodsReceipts = async (dbName: string, filters: GoodsReceiptQuery) => {
  try {
    const repo = await getTenantRepository(dbName, GoodsReceiptSchema);
    const queryBuilder = repo.createQueryBuilder("gr");
    queryBuilder.where("1=1");

    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(gr.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    if (filters.Comments) {
      queryBuilder.andWhere("LOWER(gr.comments) LIKE LOWER(:comments)", {
        comments: `%${filters.Comments}%`,
      });
    }

    if (filters.JrnlMemo) {
      queryBuilder.andWhere("LOWER(gr.jrnlMemo) LIKE LOWER(:jrnlMemo)", {
        jrnlMemo: `%${filters.JrnlMemo}%`,
      });
    }

    if (filters.DocDateStart) {
      queryBuilder.andWhere("gr.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    if (filters.DocDateEnd) {
      queryBuilder.andWhere("gr.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    if (filters.TaxDateStart) {
      queryBuilder.andWhere("gr.taxDate >= :taxStartDate", {
        taxStartDate: filters.TaxDateStart,
      });
    }

    if (filters.TaxDateEnd) {
      queryBuilder.andWhere("gr.taxDate <= :taxEndDate", {
        taxEndDate: filters.TaxDateEnd,
      });
    }

    if (filters.DocStatus) {
      queryBuilder.andWhere("gr.docStatus = :docStatus", {
        docStatus: filters.DocStatus,
      });
    }

    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("gr.docTotal = :docTotal", { docTotal: filters.DocTotal });
      } else if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("gr.docTotal < :docTotal", { docTotal: filters.DocTotal });
      } else if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("gr.docTotal > :docTotal", { docTotal: filters.DocTotal });
      }
    }

    const sortFieldMap: Record<string, string> = {
      DocNum: "gr.docNum",
      DocDate: "gr.docDate",
      TaxDate: "gr.taxDate",
      DocTotal: "gr.docTotal",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? { [requestedSortField]: requestedSortOrder }
      : { "gr.docDate": "DESC", "gr.docNum": "DESC" };

    const result = await PageService.getPagedData<GoodsReceipt>({
      dbName,
      entityName: "GoodsReceipts",
      limit: Number(filters.limit) || 10,
      page: Number(filters.page) || 1,
      query: queryBuilder,
      sort,
    });

    return {
      ...result,
      data: result.data.map((data) => ({
        DocEntry: data.docEntry,
        DocNum: data.docNum,
        DocDate:
          data.docDate instanceof Date
            ? data.docDate.toISOString().slice(0, 10)
            : String(data.docDate).slice(0, 10),
        TaxDate:
          data.taxDate instanceof Date
            ? data.taxDate.toISOString().slice(0, 10)
            : String(data.taxDate).slice(0, 10),
        Comments: data.comments,
        JrnlMemo: data.jrnlMemo,
        DocTotal: Number(data.docTotal || 0),
        DocCurr: data.docCurr || "FJD",
        DocStatus: data.docStatus === "O" ? "Open" : "Closed",
        id: data.docEntry,
      })),
    };
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(String(err));
  }
};

export const getGoodsReceiptByDocNum = async (dbName: string, docNum: number | string) => {
  const repo = await getTenantRepository(dbName, GoodsReceiptSchema);
  const header = await repo.findOne({ where: { docNum: Number(docNum) } });
  if (!header) return null;

  const lineRepo = await getTenantRepository(dbName, GoodsReceiptLineSchema);
  const lines = await lineRepo.find({ where: { docEntry: header.docEntry } });

  return {
    DocEntry: header.docEntry,
    DocNum: header.docNum,
    DocDate:
      header.docDate instanceof Date
        ? header.docDate.toISOString().slice(0, 10)
        : String(header.docDate).slice(0, 10),
    TaxDate:
      header.taxDate instanceof Date
        ? header.taxDate.toISOString().slice(0, 10)
        : String(header.taxDate).slice(0, 10),
    Comments: header.comments,
    JrnlMemo: header.jrnlMemo,
    DocTotal: Number(header.docTotal || 0),
    DocStatus: header.docStatus === "O" ? "Open" : "Closed",
    Ref2: header.ref2,
    Series: header.series,
    DocumentLines: lines.map((l) => ({
      DocEntry: l.docEntry,
      LineNum: l.lineNum,
      ItemCode: l.itemCode,
      Dscription: l.dscription,
      Quantity: Number(l.quantity || 0),
      Price: Number(l.price || 0),
      WhsCode: l.whsCode,
      AcctCode: l.acctCode,
      UomCode: l.uomCode,
      BaseType: l.baseType,
      BaseEntry: l.baseEntry,
      BaseLine: l.baseLine,
    })),
  };
};

export const getGoodsReceiptDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, GoodsReceiptSchema);
  const queryBuilder = repo.createQueryBuilder("gr");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("gr.docNum", "DocNum").distinct(true);

  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(gr.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }

  queryBuilder.orderBy("gr.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{
    DocNum: number | string;
  }>();

  return rows
    .map((row) => ({
      code: String(row.DocNum).trim(),
      name: String(row.DocNum).trim(),
    }))
    .filter((item) => item.code.length > 0);
};

export const createGoodsReceipt = async (sessionId: string, payload: Record<string, unknown>) => {
  try {
    const sapPayload: Record<string, unknown> = {
      DocDate: payload.DocDate,
      TaxDate: payload.TaxDate,
      Comments: payload.Comments,
      JrnlMemo: payload.JrnlMemo,
      Ref2: payload.Ref2,
      ...(payload.Series !== undefined && payload.Series !== null
        ? { Series: Number(payload.Series) }
        : {}),
      DocumentLines: ((payload.DocumentLines as Record<string, unknown>[]) || []).map((line) => {
        const l: Record<string, unknown> = {
          ItemCode: line.ItemCode,
          Quantity: Number(line.Quantity) || 1,
          UnitPrice: Number(line.UnitPrice) || 0,
        };
        if (line.WarehouseCode) l.WarehouseCode = line.WarehouseCode;
        if (line.UoMCode) l.UoMCode = line.UoMCode;
        if (line.AccountCode) l.AccountCode = line.AccountCode;
        // Forward bin allocations if the warehouse has bins enabled
        if (
          Array.isArray(line.DocumentLinesBinAllocations) &&
          (line.DocumentLinesBinAllocations as unknown[]).length > 0
        ) {
          l.DocumentLinesBinAllocations = line.DocumentLinesBinAllocations;
        }
        return l;
      }),
    };

    const { serviceLayerClient } = await import("@/services/service-layer.service");
    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/InventoryGenEntries",
      sapPayload,
    )) as { DocEntry: number; DocNum: number };

    const { purgeCache } = await import("@/core/utils/cache");
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:inventory:${session.companyDB}:`);
    }

    return {
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      message: "Goods Receipt created successfully",
      success: true,
    };
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(String(err));
  }
};

export const goodsReceiptService = {
  getGoodsReceipts,
  getGoodsReceiptByDocNum,
  getGoodsReceiptDocNums,
  createGoodsReceipt,
};
