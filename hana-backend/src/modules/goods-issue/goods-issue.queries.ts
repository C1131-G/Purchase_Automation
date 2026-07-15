import { getTenantRepository } from "@/db/tenant-query";
import { getDisplayCurrency } from "@/services/currency-format";
import { GoodsIssueSchema } from "@/db/schemas/goods-issue.schema";
import { GoodsIssueLineSchema } from "@/db/schemas/goods-issue-line.schema";
import type { GoodsIssue } from "@/db/schemas/goods-issue.schema";
import { PageService } from "@/services/page-service";
import type { GoodsIssueQuery } from "./goods-issue.schema";

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
      const { attachmentsService } = await import("@/modules/attachments/attachments.service");
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
    DocumentLines: lines.map((line) => {
      const slLine = slDoc?.DocumentLines?.find((serviceLayerLine: any) => serviceLayerLine.LineNum === line.lineNum);
      const lineBinAllocations = slLine?.DocumentLinesBinAllocations || [];
      return {
        LineNum: line.lineNum,
        ItemCode: line.itemCode,
        Dscription: line.dscription,
        Quantity: Number(line.quantity || 0),
        Price: Number(line.price || 0),
        LineTotal: Number((line as { lineTotal?: number }).lineTotal || 0),
        WhsCode: line.whsCode,
        AcctCode: line.acctCode,
        CostingCode: line.ocrCode,
        OcrCode: line.ocrCode,
        UomCode: line.uomCode,
        unitMsr: line.unitMsr,
        BaseType: line.baseType,
        BaseEntry: line.baseEntry,
        BaseLine: line.baseLine,
        InventoryAdjustmentReason: slLine?.U_INVADJMTRES || "",
        U_INVADJMTRES: slLine?.U_INVADJMTRES || "",
        DocumentLinesBinAllocations: lineBinAllocations.map((binAllocation: any) => ({
          BinAbsEntry: binAllocation.BinAbsEntry,
          Quantity: binAllocation.Quantity,
          AllowNegativeQuantity: binAllocation.AllowNegativeQuantity,
          BaseLineNumber: binAllocation.BaseLineNumber,
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
