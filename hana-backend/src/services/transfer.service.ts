import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { InventoryTransferSchema } from "@/db/schemas/inventory-transfer.schema";
import { InventoryTransferLineSchema } from "@/db/schemas/inventory-transfer-line.schema";
import type { InventoryTransfer } from "@/db/schemas/inventory-transfer.schema";
import { PageService } from "@/services/page-service.service";
import type { TransferQuery } from "@/validation/schemas/inputs/transfer.input";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";

export const getTransfers = async (dbName: string, filters: TransferQuery) => {
  try {
    const repo = await getTenantRepository(dbName, InventoryTransferSchema);
    const queryBuilder = repo.createQueryBuilder("wtr");
    queryBuilder.where("1=1");

    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(wtr.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    if (filters.Comments) {
      queryBuilder.andWhere("LOWER(wtr.comments) LIKE LOWER(:comments)", {
        comments: `%${filters.Comments}%`,
      });
    }

    if (filters.Filler) {
      queryBuilder.andWhere("LOWER(wtr.filler) LIKE LOWER(:filler)", {
        filler: `%${filters.Filler}%`,
      });
    }

    if (filters.ToWhsCode) {
      queryBuilder.andWhere("LOWER(wtr.toWhsCode) LIKE LOWER(:toWhsCode)", {
        toWhsCode: `%${filters.ToWhsCode}%`,
      });
    }

    if (filters.DocDateStart) {
      queryBuilder.andWhere("wtr.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    if (filters.DocDateEnd) {
      queryBuilder.andWhere("wtr.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    if (filters.DocStatus) {
      queryBuilder.andWhere("wtr.docStatus = :docStatus", {
        docStatus: filters.DocStatus,
      });
    }

    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("wtr.docTotal = :docTotal", { docTotal: filters.DocTotal });
      } else if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("wtr.docTotal < :docTotal", { docTotal: filters.DocTotal });
      } else if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("wtr.docTotal > :docTotal", { docTotal: filters.DocTotal });
      }
    }

    const sortFieldMap: Record<string, string> = {
      DocNum: "wtr.docNum",
      DocDate: "wtr.docDate",
      Filler: "wtr.filler",
      ToWhsCode: "wtr.toWhsCode",
      DocTotal: "wtr.docTotal",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? { [requestedSortField]: requestedSortOrder }
      : { "wtr.docDate": "DESC", "wtr.docNum": "DESC" };

    const result = await PageService.getPagedData<InventoryTransfer>({
      dbName,
      entityName: "InventoryTransfers",
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
        Comments: data.comments,
        Filler: data.filler,
        ToWhsCode: data.toWhsCode,
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

export const getTransferByDocNum = async (dbName: string, docNum: number | string) => {
  const repo = await getTenantRepository(dbName, InventoryTransferSchema);
  const header = await repo.findOne({ where: { docNum: Number(docNum) } });
  if (!header) return null;

  const lineRepo = await getTenantRepository(dbName, InventoryTransferLineSchema);
  const lines = await lineRepo.find({ where: { docEntry: header.docEntry } });

  return {
    DocEntry: header.docEntry,
    DocNum: header.docNum,
    DocDate:
      header.docDate instanceof Date
        ? header.docDate.toISOString().slice(0, 10)
        : String(header.docDate).slice(0, 10),
    Comments: header.comments,
    Filler: header.filler,
    ToWhsCode: header.toWhsCode,
    DocTotal: Number(header.docTotal || 0),
    DocStatus: header.docStatus === "O" ? "Open" : "Closed",
    DocumentLines: lines.map((l) => ({
      DocEntry: l.docEntry,
      LineNum: l.lineNum,
      ItemCode: l.itemCode,
      Dscription: l.dscription,
      Quantity: Number(l.quantity || 0),
      FromWhsCod: l.fromWhsCod,
      WhsCode: l.whsCode,
      BaseType: l.baseType,
      BaseEntry: l.baseEntry,
      BaseLine: l.baseLine,
    })),
  };
};

export const getTransferDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, InventoryTransferSchema);
  const queryBuilder = repo.createQueryBuilder("wtr");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("wtr.docNum", "DocNum").distinct(true);

  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(wtr.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }

  queryBuilder.orderBy("wtr.docNum", "DESC");
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

export const transferService = {
  getTransfers,
  getTransferByDocNum,
  getTransferDocNums,
};
