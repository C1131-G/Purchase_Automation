import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { getDisplayCurrency } from "@/services/currency.util";
import { InventoryTransferRequestSchema } from "@/db/schemas/inventory-transfer-request.schema";
import { InventoryTransferRequestLineSchema } from "@/db/schemas/inventory-transfer-request-line.schema";
import type { InventoryTransferRequest } from "@/db/schemas/inventory-transfer-request.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import type { TransferRequestQuery } from "@/validation/schemas/inputs/transfer-request.input";

export const getTransferRequests = async (dbName: string, filters: TransferRequestQuery) => {
  try {
    const repo = await getTenantRepository(dbName, InventoryTransferRequestSchema);
    const queryBuilder = repo.createQueryBuilder("wtrq");
    queryBuilder.where("1=1");

    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(wtrq.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    if (filters.Comments) {
      queryBuilder.andWhere("LOWER(wtrq.comments) LIKE LOWER(:comments)", {
        comments: `%${filters.Comments}%`,
      });
    }

    if (filters.Filler) {
      queryBuilder.andWhere("LOWER(wtrq.filler) LIKE LOWER(:filler)", {
        filler: `%${filters.Filler}%`,
      });
    }

    if (filters.ToWhsCode) {
      queryBuilder.andWhere("LOWER(wtrq.toWhsCode) LIKE LOWER(:toWhsCode)", {
        toWhsCode: `%${filters.ToWhsCode}%`,
      });
    }

    if (filters.DocStatus) {
      queryBuilder.andWhere("wtrq.docStatus = :docStatus", {
        docStatus: filters.DocStatus,
      });
    }

    if (filters.DocDateStart) {
      queryBuilder.andWhere("wtrq.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    if (filters.DocDateEnd) {
      queryBuilder.andWhere("wtrq.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("wtrq.docTotal = :docTotal", { docTotal: filters.DocTotal });
      } else if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("wtrq.docTotal < :docTotal", { docTotal: filters.DocTotal });
      } else if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("wtrq.docTotal > :docTotal", { docTotal: filters.DocTotal });
      }
    }

    const sortFieldMap: Record<string, string> = {
      DocNum: "wtrq.docNum",
      DocDate: "wtrq.docDate",
      DocStatus: "wtrq.docStatus",
      DocTotal: "wtrq.docTotal",
      Filler: "wtrq.filler",
      ToWhsCode: "wtrq.toWhsCode",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? { [requestedSortField]: requestedSortOrder }
      : { "wtrq.docDate": "DESC", "wtrq.docNum": "DESC" };

    const result = await PageService.getPagedData<InventoryTransferRequest>({
      dbName,
      entityName: "InventoryTransferRequests",
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
          Comments: data.comments,
          DocTotal: Number(data.docTotal || 0),
          DocCurr: data.docCurr || displayCurrency,
          DocStatus: data.docStatus === "O" ? "Open" : "Closed",
          Filler: data.filler,
          ToWhsCode: data.toWhsCode,
          id: data.docEntry,
        })),
      ),
    };
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(String(err));
  }
};

export const getTransferRequestByDocNum = async (dbName: string, docNum: number | string) => {
  const repo = await getTenantRepository(dbName, InventoryTransferRequestSchema);
  const header = await repo.findOne({ where: { docNum: Number(docNum) } });
  if (!header) return null;

  const lineRepo = await getTenantRepository(dbName, InventoryTransferRequestLineSchema);
  const lines = await lineRepo.find({ where: { docEntry: header.docEntry } });

  return {
    DocEntry: header.docEntry,
    DocNum: header.docNum,
    DocDate:
      header.docDate instanceof Date
        ? header.docDate.toISOString().slice(0, 10)
        : String(header.docDate).slice(0, 10),
    Comments: header.comments,
    DocTotal: Number(header.docTotal || 0),
    DocCurr: header.docCurr || (await getDisplayCurrency(dbName)),
    DocStatus: header.docStatus === "O" ? "Open" : "Closed",
    Filler: header.filler,
    ToWhsCode: header.toWhsCode,
    DocumentLines: lines.map((l) => ({
      DocEntry: l.docEntry,
      LineNum: l.lineNum,
      ItemCode: l.itemCode,
      Dscription: l.dscription,
      Quantity: Number(l.quantity || 0),
      FromWhsCod: l.fromWhsCod,
      WhsCode: l.whsCode,
      OpenQty: Number(l.openQty || 0),
      LineStatus: l.lineStatus === "O" ? "Open" : "Closed",
    })),
  };
};

export const getTransferRequestDocNums = async (
  dbName: string,
  search?: string,
  limit?: number,
) => {
  const repo = await getTenantRepository(dbName, InventoryTransferRequestSchema);
  const queryBuilder = repo.createQueryBuilder("wtrq");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("wtrq.docNum", "DocNum").distinct(true);

  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(wtrq.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }

  queryBuilder.orderBy("wtrq.docNum", "DESC");
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

export const transferRequestService = {
  getTransferRequests,
  getTransferRequestByDocNum,
  getTransferRequestDocNums,
};
