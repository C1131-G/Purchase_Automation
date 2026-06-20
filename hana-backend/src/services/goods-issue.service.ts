import { getTenantRepository } from "@/dal/tenant-dal.helper";
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
      ? { [requestedSortField]: requestedSortOrder }
      : { "gi.docDate": "DESC", "gi.docNum": "DESC" };

    const result = await PageService.getPagedData<GoodsIssue>({
      dbName,
      entityName: "GoodsIssues",
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

export const getGoodsIssueByDocNum = async (dbName: string, docNum: number | string) => {
  const repo = await getTenantRepository(dbName, GoodsIssueSchema);
  const header = await repo.findOne({ where: { docNum: Number(docNum) } });
  if (!header) return null;

  const lineRepo = await getTenantRepository(dbName, GoodsIssueLineSchema);
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
    DocTotal: Number(header.docTotal || 0),
    DocStatus: header.docStatus === "O" ? "Open" : "Closed",
    DocumentLines: lines.map((l) => ({
      DocEntry: l.docEntry,
      LineNum: l.lineNum,
      ItemCode: l.itemCode,
      Dscription: l.dscription,
      Quantity: Number(l.quantity || 0),
      Price: Number(l.price || 0),
      WhsCode: l.whsCode,
      AcctCode: l.acctCode,
      BaseType: l.baseType,
      BaseEntry: l.baseEntry,
      BaseLine: l.baseLine,
    })),
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

export const goodsIssueService = {
  getGoodsIssues,
  getGoodsIssueByDocNum,
  getGoodsIssueDocNums,
};
