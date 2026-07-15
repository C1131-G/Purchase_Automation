import { getTenantRepository } from "@/db/tenant-query";
import { getDisplayCurrency } from "@/services/currency-format";
import { GoodsReceiptSchema } from "@/db/schemas/goods-receipt.schema";
import { GoodsReceiptLineSchema } from "@/db/schemas/goods-receipt-line.schema";
import type { GoodsReceipt } from "@/db/schemas/goods-receipt.schema";
import { PageService } from "@/services/page-service";
import type { GoodsReceiptQuery } from "./goods-receipt.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup";

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
      return {
        DocEntry: line.docEntry,
        LineNum: line.lineNum,
        ItemCode: line.itemCode,
        Dscription: line.dscription,
        Quantity: Number(line.quantity || 0),
        Price: Number(line.price || 0),
        WhsCode: line.whsCode,
        AcctCode: line.acctCode,
        UomCode: line.uomCode,
        BaseType: line.baseType,
        BaseEntry: line.baseEntry,
        BaseLine: line.baseLine,
        CostingCode: slLine?.CostingCode || slLine?.OcrCode || "",
        InventoryAdjustmentReason: slLine?.U_INVADJMTRES || "",
        U_INVADJMTRES: slLine?.U_INVADJMTRES || "",
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
