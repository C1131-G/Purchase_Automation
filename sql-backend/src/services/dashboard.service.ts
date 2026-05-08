import { getTenantDataSource } from "@/db/config/data-source";
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { SalesOrderSchema } from "@/db/schemas/sales-order.schema";

export const getPurchaseSummary = async (dbName: string) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(PurchaseOrderSchema);

  const result = await repo
    .createQueryBuilder("po")
    .select("SUM(po.docTotal)", "total")
    .addSelect("COUNT(po.docEntry)", "count")
    .where("po.docStatus = :status", { status: "O" })
    .getRawOne();

  return {
    openCount: Number.parseInt(result?.count || "0"),
    openTotal: Number.parseFloat(result?.total || "0"),
  };
};

export const getSalesSummary = async (dbName: string) => {
  const ds = await getTenantDataSource(dbName);
  const repo = ds.getRepository(SalesOrderSchema);

  const result = await repo
    .createQueryBuilder("so")
    .select("SUM(so.docTotal)", "total")
    .addSelect("COUNT(so.docEntry)", "count")
    .where("so.docStatus = :status", { status: "O" })
    .getRawOne();

  return {
    openCount: Number.parseInt(result?.count || "0"),
    openTotal: Number.parseFloat(result?.total || "0"),
  };
};

export const getStats = async (dbName: string) => {
  const [purchase, sales] = await Promise.all([
    getPurchaseSummary(dbName),
    getSalesSummary(dbName),
  ]);

  return {
    purchase,
    sales,
  };
};

export const dashboardService = {
  getPurchaseSummary,
  getSalesSummary,
  getStats,
};
