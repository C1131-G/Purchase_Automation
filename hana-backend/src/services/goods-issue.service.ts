import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { getDisplayCurrency } from "@/services/currency.util";
import { GoodsIssueSchema } from "@/db/schemas/goods-issue.schema";
import { GoodsIssueLineSchema } from "@/db/schemas/goods-issue-line.schema";
import type { GoodsIssue } from "@/db/schemas/goods-issue.schema";
import { PageService } from "@/services/page-service.service";
import type { GoodsIssueQuery } from "@/validation/schemas/inputs/goods-issue.input";

export const getGoodsIssues = async (dbName: string, filters: GoodsIssueQuery) => {
  try {
    const repo = await getTenantRepository(dbName, GoodsIssueSchema);
    const queryBuilder = repo.createQueryBuilder("gi");
    queryBuilder.where("1=1");

    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(gi.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    if (filters.Comments) {
      queryBuilder.andWhere("LOWER(gi.comments) LIKE LOWER(:comments)", {
        comments: `%${filters.Comments}%`,
      });
    }

    if (filters.DocDateStart) {
      queryBuilder.andWhere("gi.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    if (filters.DocDateEnd) {
      queryBuilder.andWhere("gi.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    if (filters.TaxDateStart) {
      queryBuilder.andWhere("gi.taxDate >= :taxStartDate", {
        taxStartDate: filters.TaxDateStart,
      });
    }

    if (filters.TaxDateEnd) {
      queryBuilder.andWhere("gi.taxDate <= :taxEndDate", {
        taxEndDate: filters.TaxDateEnd,
      });
    }

    if (filters.DocStatus) {
      queryBuilder.andWhere("gi.docStatus = :docStatus", {
        docStatus: filters.DocStatus,
      });
    }

    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("gi.docTotal = :docTotal", { docTotal: filters.DocTotal });
      } else if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("gi.docTotal < :docTotal", { docTotal: filters.DocTotal });
      } else if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("gi.docTotal > :docTotal", { docTotal: filters.DocTotal });
      }
    }

    const sortFieldMap: Record<string, string> = {
      DocNum: "gi.docNum",
      DocDate: "gi.docDate",
      TaxDate: "gi.taxDate",
      DocTotal: "gi.docTotal",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "gi.docDate": "DESC", "gi.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    const {
      data: pagedData,
      total,
      page,
      limit,
    } = await PageService.getPagedData<GoodsIssue>({
      dbName,
      entityName: "GoodsIssues",
      limit: Number(filters.limit) || 10,
      page: Number(filters.page) || 1,
      query: queryBuilder,
      sort,
    });

    const displayCurrency = await getDisplayCurrency(dbName);
    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: await Promise.all(
        pagedData.map(async (data: any) => ({
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

export const getGoodsIssueByDocNum = async (
  sessionId: string,
  dbName: string,
  docNum: number | string,
) => {
  const repo = await getTenantRepository(dbName, GoodsIssueSchema);
  const header = await repo.findOne({ where: { docNum: Number(docNum) } });
  if (!header) return null;

  const lineRepo = await getTenantRepository(dbName, GoodsIssueLineSchema);
  const lines = await lineRepo.find({ where: { docEntry: header.docEntry } });

  const { serviceLayerClient } = await import("@/services/service-layer.service");
  let slDoc: any = null;
  let attachments: any[] = [];
  try {
    slDoc = await serviceLayerClient.request(
      sessionId,
      "GET",
      `/InventoryGenExits(${header.docEntry})`,
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
      const lineBinAllocations = slLine?.DocumentLinesBinAllocations || [];
      return {
        LineNum: l.lineNum,
        ItemCode: l.itemCode,
        Dscription: l.dscription,
        Quantity: Number(l.quantity || 0),
        Price: Number(l.price || 0),
        LineTotal: Number((l as { lineTotal?: number }).lineTotal || 0),
        WhsCode: l.whsCode,
        AcctCode: l.acctCode,
        CostingCode: l.ocrCode,
        OcrCode: l.ocrCode,
        UomCode: l.uomCode,
        unitMsr: l.unitMsr,
        BaseType: l.baseType,
        BaseEntry: l.baseEntry,
        BaseLine: l.baseLine,
        DocumentLinesBinAllocations: lineBinAllocations.map((ba: any) => ({
          BinAbsEntry: ba.BinAbsEntry,
          Quantity: ba.Quantity,
          AllowNegativeQuantity: ba.AllowNegativeQuantity,
          BaseLineNumber: ba.BaseLineNumber,
        })),
      };
    }),
    Attachments: attachments,
  };
};

export const getGoodsIssueDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, GoodsIssueSchema);
  const queryBuilder = repo.createQueryBuilder("gi");
  const safeLimit = limit ? Math.min(Math.max(limit, 1), 100) : 10;

  queryBuilder.select("gi.docNum", "DocNum").distinct(true);

  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(gi.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }

  queryBuilder.orderBy("gi.docNum", "DESC");
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

export const createGoodsIssue = async (sessionId: string, payload: Record<string, unknown>) => {
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

    const sapPayload: Record<string, unknown> = {
      DocDate: payload.DocDate,
      TaxDate: payload.TaxDate,
      Comments: payload.Comments,
      JrnlMemo: payload.JrnlMemo,
      Reference2: payload.Ref2,
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
          if (line.CostingCode) l.CostingCode = line.CostingCode; // This is the "Branch"

          if (
            Array.isArray(line.DocumentLinesBinAllocations) &&
            (line.DocumentLinesBinAllocations as unknown[]).length > 0
          ) {
            l.DocumentLinesBinAllocations = (line.DocumentLinesBinAllocations as any[]).map(
              (ba) => ({
                BaseLineNumber: ba.BaseLineNumber ?? index,
                BinAbsEntry: Number(ba.BinAbsEntry),
                Quantity: Number(ba.Quantity) || 1,
              }),
            );
          }
          return l;
        },
      ),
    };

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/InventoryGenExits",
      sapPayload,
    )) as { DocEntry: number; DocNum: number };

    const { purgeCache } = await import("@/core/utils/cache");

    if (absoluteEntry !== null && dbName) {
      const { attachmentsService } = await import("@/services/attachments.service");
      await attachmentsService.finalizeAndLinkAttachments(
        dbName,
        "GoodsIssues",
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
      message: "Goods Issue created successfully",
      success: true,
    };
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(String(err));
  }
};

export const updateGoodsIssue = async (
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

    if (payload.Attachments !== undefined) {
      const session = serviceLayerClient.getSession(sessionId);
      const dbName = session?.companyDB || "";
      if (dbName) {
        const { attachmentsService } = await import("@/services/attachments.service");
        const existingDoc = await serviceLayerClient.request<{
          DocNum: number;
          AttachmentEntry: number | null;
        }>(sessionId, "GET", `/InventoryGenExits(${docEntry})?$select=DocNum,AttachmentEntry`);

        const syncResult = await attachmentsService.syncAttachmentsOnUpdate(
          sessionId,
          dbName,
          "GoodsIssues",
          docEntry,
          existingDoc.DocNum,
          payload.Attachments as any[],
          existingDoc.AttachmentEntry || null,
        );

        if (syncResult.shouldUpdateDoc) {
          sapPayload.AttachmentEntry = syncResult.attachmentEntry;
        }

        if (Object.keys(sapPayload).length === 0) {
          shouldUpdateDoc = false;
        }
      }
    }

    if (shouldUpdateDoc) {
      await serviceLayerClient.request(
        sessionId,
        "PATCH",
        `/InventoryGenExits(${docEntry})`,
        sapPayload,
      );
    }

    const { purgeCache } = await import("@/core/utils/cache");
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:inventory:${session.companyDB}:`);
    }

    return {
      message: "Goods Issue updated successfully",
      success: true,
    };
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(String(err));
  }
};

export const goodsIssueService = {
  getGoodsIssues,
  getGoodsIssueByDocNum,
  getGoodsIssueDocNums,
  createGoodsIssue,
  updateGoodsIssue,
};
