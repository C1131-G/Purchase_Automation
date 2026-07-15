import { getTenantRepository } from "@/db/tenant-query";
import { ItemSchema } from "@/db/schemas/item.schema";
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
