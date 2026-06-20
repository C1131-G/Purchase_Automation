import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { ItemSchema } from "@/db/schemas/item.schema";
import type { Item } from "@/db/schemas/item.schema";
import { PageService } from "@/services/page-service.service";
import type { ItemMasterQuery } from "@/validation/schemas/inputs/item-master.input";

export const getItems = async (dbName: string, filters: ItemMasterQuery) => {
  try {
    const repo = await getTenantRepository(dbName, ItemSchema);
    const queryBuilder = repo.createQueryBuilder("item");
    queryBuilder.where("1=1");

    if (filters.ItemCode) {
      queryBuilder.andWhere("LOWER(item.ItemCode) LIKE LOWER(:itemCode)", {
        itemCode: `%${filters.ItemCode}%`,
      });
    }

    if (filters.ItemName) {
      queryBuilder.andWhere("LOWER(item.ItemName) LIKE LOWER(:itemName)", {
        itemName: `%${filters.ItemName}%`,
      });
    }

    if (filters.frozenFor) {
      queryBuilder.andWhere("item.frozenFor = :frozenFor", {
        frozenFor: filters.frozenFor,
      });
    }

    if (filters.validFor) {
      queryBuilder.andWhere("item.validFor = :validFor", {
        validFor: filters.validFor,
      });
    }

    if (filters.ItmsGrpCod !== undefined) {
      queryBuilder.andWhere("item.ItmsGrpCod = :itmsGrpCod", {
        itmsGrpCod: filters.ItmsGrpCod,
      });
    }

    if (filters.InvntryUom) {
      queryBuilder.andWhere("LOWER(item.InvntryUom) LIKE LOWER(:invntryUom)", {
        invntryUom: `%${filters.InvntryUom}%`,
      });
    }

    if (filters.CodeBars) {
      queryBuilder.andWhere("LOWER(item.CodeBars) LIKE LOWER(:codeBars)", {
        codeBars: `%${filters.CodeBars}%`,
      });
    }

    const sortFieldMap: Record<string, string> = {
      ItemCode: "item.ItemCode",
      ItemName: "item.ItemName",
      ItmsGrpCod: "item.ItmsGrpCod",
      OnHand: "item.OnHand",
      AvgPrice: "item.AvgPrice",
      InvntItem: "item.InvntItem",
      CodeBars: "item.CodeBars",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? { [requestedSortField]: requestedSortOrder }
      : { "item.ItemCode": "ASC" };

    const result = await PageService.getPagedData<Item>({
      dbName,
      entityName: "Items",
      limit: Number(filters.limit) || 10,
      page: Number(filters.page) || 1,
      query: queryBuilder,
      sort,
    });

    return {
      ...result,
      data: result.data.map((data) => ({
        ItemCode: data.ItemCode,
        ItemName: data.ItemName,
        FrgnName: data.FrgnName,
        ItmsGrpCod: data.ItmsGrpCod,
        InvntryUom: data.InvntryUom,
        OnHand: Number(data.OnHand || 0),
        IsCommited: Number(data.IsCommited || 0),
        OnOrder: Number(data.OnOrder || 0),
        AvgPrice: Number(data.AvgPrice || 0),
        LastPurPrc: Number(data.LastPurPrc || 0),
        LastPurDat: data.LastPurDat
          ? data.LastPurDat instanceof Date
            ? data.LastPurDat.toISOString().slice(0, 10)
            : String(data.LastPurDat).slice(0, 10)
          : null,
        ManBtchNum: data.ManBtchNum,
        ManSerNum: data.ManSerNum,
        validFor: data.validFor,
        frozenFor: data.frozenFor,
        InvntItem: data.InvntItem,
        CodeBars: data.CodeBars,
        id: data.ItemCode,
      })),
    };
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(String(err));
  }
};

export const getItemByItemCode = async (dbName: string, itemCode: string) => {
  const repo = await getTenantRepository(dbName, ItemSchema);
  return repo.findOne({ where: { ItemCode: itemCode } });
};

export const getItemCodes = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, ItemSchema);
  const queryBuilder = repo.createQueryBuilder("item");
  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.min(100000, limit)) : 10;

  queryBuilder
    .select("item.ItemCode", "ItemCode")
    .addSelect("item.ItemName", "ItemName")
    .distinct(true);

  if (search && search.trim().length > 0) {
    const term = `%${search.trim().toLowerCase()}%`;
    queryBuilder.where("LOWER(item.ItemCode) LIKE :search OR LOWER(item.ItemName) LIKE :search", {
      search: term,
    });
  }

  queryBuilder.orderBy("item.ItemCode", "ASC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{
    ItemCode: string;
    ItemName: string;
  }>();

  return rows.map((row) => ({
    code: String(row.ItemCode).trim(),
    name: String(row.ItemName || "").trim() || String(row.ItemCode).trim(),
  }));
};

export const getItemNames = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, ItemSchema);
  const queryBuilder = repo.createQueryBuilder("item");
  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.min(100000, limit)) : 10;

  queryBuilder
    .select("item.ItemCode", "ItemCode")
    .addSelect("item.ItemName", "ItemName")
    .distinct(true);

  if (search && search.trim().length > 0) {
    const term = `%${search.trim().toLowerCase()}%`;
    queryBuilder.where("LOWER(item.ItemCode) LIKE :search OR LOWER(item.ItemName) LIKE :search", {
      search: term,
    });
  }

  queryBuilder.orderBy("item.ItemName", "ASC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{
    ItemCode: string;
    ItemName: string;
  }>();

  return rows.map((row) => ({
    code: String(row.ItemCode).trim(),
    name: String(row.ItemName || "").trim() || String(row.ItemCode).trim(),
  }));
};

export const getItemGroups = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, ItemSchema);
  const queryBuilder = repo.createQueryBuilder("item");
  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.min(100000, limit)) : 10;

  queryBuilder
    .select("item.ItmsGrpCod", "ItmsGrpCod")
    .distinct(true)
    .where("item.ItmsGrpCod IS NOT NULL AND item.ItmsGrpCod > 0");

  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    queryBuilder.andWhere("CAST(item.ItmsGrpCod AS NVARCHAR) LIKE :search", {
      search: term,
    });
  }

  queryBuilder.orderBy("item.ItmsGrpCod", "ASC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{
    ItmsGrpCod: number;
  }>();

  return rows.map((row) => ({
    code: String(row.ItmsGrpCod),
    name: String(row.ItmsGrpCod),
  }));
};

export const getInvntryUoms = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, ItemSchema);
  const queryBuilder = repo.createQueryBuilder("item");
  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.min(100000, limit)) : 10;

  queryBuilder
    .select("item.InvntryUom", "InvntryUom")
    .distinct(true)
    .where("item.InvntryUom IS NOT NULL AND item.InvntryUom <> ''");

  if (search && search.trim().length > 0) {
    const term = `%${search.trim().toLowerCase()}%`;
    queryBuilder.andWhere("LOWER(item.InvntryUom) LIKE :search", {
      search: term,
    });
  }

  queryBuilder.orderBy("item.InvntryUom", "ASC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{
    InvntryUom: string;
  }>();

  return rows.map((row) => ({
    code: String(row.InvntryUom).trim(),
    name: String(row.InvntryUom).trim(),
  }));
};

export const getBarCodes = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, ItemSchema);
  const queryBuilder = repo.createQueryBuilder("item");
  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.min(100000, limit)) : 10;

  queryBuilder
    .select("item.CodeBars", "CodeBars")
    .distinct(true)
    .where("item.CodeBars IS NOT NULL AND item.CodeBars <> ''");

  if (search && search.trim().length > 0) {
    const term = `%${search.trim().toLowerCase()}%`;
    queryBuilder.andWhere("LOWER(item.CodeBars) LIKE :search", {
      search: term,
    });
  }

  queryBuilder.orderBy("item.CodeBars", "ASC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{
    CodeBars: string;
  }>();

  return rows.map((row) => ({
    code: String(row.CodeBars).trim(),
    name: String(row.CodeBars).trim(),
  }));
};

export const itemMasterService = {
  getItems,
  getItemByItemCode,
  getItemCodes,
  getItemNames,
  getItemGroups,
  getInvntryUoms,
  getBarCodes,
};
