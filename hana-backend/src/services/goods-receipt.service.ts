import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { serviceLayerClient } from "@/services/service-layer.service";
import { getDisplayCurrency } from "@/services/currency.util";
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
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "gr.docDate": "DESC", "gr.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    const result = await PageService.getPagedData<GoodsReceipt>({
      dbName,
      entityName: "GoodsReceipts",
      limit: Number(filters.limit) || 10,
      page: Number(filters.page) || 1,
      query: queryBuilder,
      sort,
    });

    const displayCurrency = await getDisplayCurrency(dbName);
    return {
      ...result,
      data: await Promise.all(
        result.data.map(async (data) => ({
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
          DocCurr: data.docCurr || displayCurrency,
          DocStatus: data.docStatus === "O" ? "Open" : "Closed",
          id: data.docEntry,
        })),
      ),
    };
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(String(err));
  }
};

export const getGoodsReceiptByDocNum = async (
  sessionId: string,
  dbName: string,
  docNum: number | string,
) => {
  const repo = await getTenantRepository(dbName, GoodsReceiptSchema);
  const header = await repo.findOne({ where: { docNum: Number(docNum) } });
  if (!header) return null;

  const lineRepo = await getTenantRepository(dbName, GoodsReceiptLineSchema);
  const lines = await lineRepo.find({ where: { docEntry: header.docEntry } });

  const { serviceLayerClient } = await import("@/services/service-layer.service");
  let slDoc: any = null;
  let attachments: any[] = [];
  try {
    slDoc = await serviceLayerClient.request(
      sessionId,
      "GET",
      `/InventoryGenEntries(${header.docEntry})`,
    );
    if (slDoc?.AttachmentEntry) {
      const { attachmentsService } = await import("@/services/attachments.service");
      attachments = await attachmentsService.getSAPAttachment(
        sessionId,
        slDoc.AttachmentEntry,
        dbName,
      );
    }
  } catch {
    // Ignore error, fallback to without bin allocations
  }

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
    DocCurr: header.docCurr || (await getDisplayCurrency(dbName)),
    DocStatus: header.docStatus === "O" ? "Open" : "Closed",
    Ref2: header.ref2,
    Series: header.series,
    PriceList: slDoc?.PriceList,
    DocumentLines: lines.map((l) => {
      const slLine = slDoc?.DocumentLines?.find((sl: any) => sl.LineNum === l.lineNum);
      return {
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
        CostingCode: slLine?.CostingCode || slLine?.OcrCode || "",
        DocumentLinesBinAllocations: slLine?.DocumentLinesBinAllocations || [],
      };
    }),
    Attachments: attachments,
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
    const { serviceLayerClient } = await import("@/services/service-layer.service");
    const session = serviceLayerClient.getSession(sessionId);
    const dbName = session?.companyDB || "";
    let absoluteEntry: number | null = null;
    if (
      payload.Attachments &&
      Array.isArray(payload.Attachments) &&
      payload.Attachments.length > 0 &&
      dbName
    ) {
      const { attachmentsService } = await import("@/services/attachments.service");
      absoluteEntry = await attachmentsService.createSAPAttachment(
        sessionId,
        dbName,
        payload.Attachments as any[],
      );
    }

    const { masterDataService } = await import("@/services/master-data.service");
    const firstWhs = (payload.DocumentLines as Record<string, unknown>[])?.[0]?.WarehouseCode;
    let branchId: number | null = null;
    if (firstWhs) {
      branchId = await masterDataService.getWarehouseBranch(dbName, String(firstWhs));
    }
    if (branchId === null) {
      branchId = await masterDataService.getDefaultBranch(dbName);
    }

    const sapPayload: Record<string, unknown> = {
      DocDate: payload.DocDate,
      TaxDate: payload.TaxDate,
      Comments: payload.Comments,
      JrnlMemo: payload.JrnlMemo,
      Reference2: payload.Ref2,
      ...(branchId !== null ? { BPL_IDAssignedToInvoice: branchId } : {}),
      ...(payload.Series !== undefined && payload.Series !== null
        ? { Series: Number(payload.Series) }
        : {}),
      ...(payload.PriceList !== undefined && payload.PriceList !== null
        ? { PriceList: Number(payload.PriceList) }
        : {}),
      AttachmentEntry: absoluteEntry ?? undefined,
      DocumentLines: ((payload.DocumentLines as Record<string, unknown>[]) || []).map(
        (line, index) => {
          const l: Record<string, unknown> = {
            ItemCode: line.ItemCode,
            Quantity: Number(line.Quantity) || 1,
            UnitPrice: Number(line.UnitPrice) || 0,
          };
          if (line.WarehouseCode) l.WarehouseCode = line.WarehouseCode;
          if (line.UoMCode) l.UoMCode = line.UoMCode;
          if (line.AccountCode) l.AccountCode = line.AccountCode;
          if (line.CostingCode) l.CostingCode = line.CostingCode; // Maps the selected Branch (Distribution Rule)
          if (line.InventoryAdjustmentReason) l.U_INVADJMTRES = line.InventoryAdjustmentReason;
          return l;
        },
      ),
    };

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/InventoryGenEntries",
      sapPayload,
    )) as { DocEntry: number; DocNum: number };

    const { purgeCache } = await import("@/core/utils/cache");

    // Process attachments if they exist
    if (absoluteEntry !== null && dbName) {
      const { attachmentsService } = await import("@/services/attachments.service");
      await attachmentsService.finalizeAndLinkAttachments(
        dbName,
        "GoodsReceipt",
        result.DocEntry,
        result.DocNum,
        absoluteEntry,
        payload.Attachments as any[],
      );
    }

    if (dbName) {
      purgeCache(`dash:inventory:${dbName}:`);
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

export const updateGoodsReceipt = async (
  sessionId: string,
  docEntry: number | string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};
    if (payload.Comments !== undefined) sapPayload.Comments = payload.Comments;
    if (payload.JrnlMemo !== undefined) sapPayload.JrnlMemo = payload.JrnlMemo;
    if (payload.Ref2 !== undefined) sapPayload.Reference2 = payload.Ref2;

    const { serviceLayerClient } = await import("@/services/service-layer.service");

    let shouldUpdateDoc = true;

    // Process attachments if they exist
    if (payload.Attachments !== undefined) {
      const session = serviceLayerClient.getSession(sessionId);
      const dbName = session?.companyDB || "";
      if (dbName) {
        const { attachmentsService } = await import("@/services/attachments.service");
        // Get the docNum to pass to sync method
        const existingDoc = await serviceLayerClient.request<{
          DocNum: number;
          AttachmentEntry: number | null;
        }>(sessionId, "GET", `/InventoryGenEntries(${docEntry})?$select=DocNum,AttachmentEntry`);

        const syncResult = await attachmentsService.syncAttachmentsOnUpdate(
          sessionId,
          dbName,
          "GoodsReceipts",
          docEntry,
          existingDoc.DocNum,
          payload.Attachments as any[],
          existingDoc.AttachmentEntry || null,
        );

        if (syncResult.shouldUpdateDoc) {
          sapPayload.AttachmentEntry = syncResult.attachmentEntry;
        }

        // If we only updated attachments and have no other fields, we can skip if shouldUpdateDoc is false
        if (Object.keys(sapPayload).length === 0) {
          shouldUpdateDoc = false;
        }
      }
    }

    if (shouldUpdateDoc) {
      await serviceLayerClient.request(
        sessionId,
        "PATCH",
        `/InventoryGenEntries(${docEntry})`,
        sapPayload,
      );
    }

    const { purgeCache } = await import("@/core/utils/cache");
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:inventory:${session.companyDB}:`);
    }

    return {
      message: "Goods Receipt updated successfully",
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
  updateGoodsReceipt,
};
