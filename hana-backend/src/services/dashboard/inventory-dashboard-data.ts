// Inventory Dashboard Data: Loads and caches the full inventory dataset in a single pass,
// mirroring the loadAreaDataset() pattern used by Purchase/Sales.

import { getCachedData } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { getDisplayCurrency } from "@/services/currency.util";
import { ItemSchema } from "@/db/schemas/item.schema";
import { GoodsReceiptSchema } from "@/db/schemas/goods-receipt.schema";
import { GoodsReceiptLineSchema } from "@/db/schemas/goods-receipt-line.schema";
import { GoodsIssueSchema } from "@/db/schemas/goods-issue.schema";
import { GoodsIssueLineSchema } from "@/db/schemas/goods-issue-line.schema";
import { InventoryTransferRequestSchema } from "@/db/schemas/inventory-transfer-request.schema";
import { InventoryTransferRequestLineSchema } from "@/db/schemas/inventory-transfer-request-line.schema";
import { InventoryTransferSchema } from "@/db/schemas/inventory-transfer.schema";
import { InventoryTransferLineSchema } from "@/db/schemas/inventory-transfer-line.schema";
import { WarehouseSchema } from "@/db/schemas/warehouse.schema";

import { INVENTORY_MODULES } from "./dashboard.constants";
import { fetchModuleDocuments } from "./dashboard.data";
import { getPeriodWindow } from "./dashboard.period";
import type {
  AreaDataset,
  DashboardPartnerGroup,
  DashboardPeriod,
  ModuleDataset,
} from "./dashboard.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InventoryItemStats = {
  totalItems: number;
  onHandItems: number;
  stockValue: number;
  onOrderValue: number;
};

// InventoryDataset extends AreaDataset so shared helpers (buildTrendBuckets,
// getModuleDataset, buildModuleCard, etc.) accept it without casts.
export type InventoryDataset = AreaDataset & {
  itemStats: InventoryItemStats;
  warehouseGroups: DashboardPartnerGroup[];
};

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

const fetchItemStats = async (dbName: string): Promise<InventoryItemStats> => {
  const repo = await getTenantRepository(dbName, ItemSchema);
  const raw = await repo
    .createQueryBuilder("item")
    .select("COUNT(item.ItemCode)", "totalItems")
    .addSelect("SUM(CASE WHEN item.OnHand > 0 THEN 1 ELSE 0 END)", "onHandItems")
    .addSelect("SUM(item.AvgPrice * item.OnHand)", "stockValue")
    .addSelect("SUM(item.AvgPrice * item.OnOrder)", "onOrderValue")
    .getRawOne();

  return {
    totalItems: parseInt(raw?.totalItems || "0", 10),
    onHandItems: parseInt(raw?.onHandItems || "0", 10),
    stockValue: parseFloat(raw?.stockValue || "0"),
    onOrderValue: parseFloat(raw?.onOrderValue || "0"),
  };
};

// Describes each inventory module's header + line schema pair for warehouse aggregation.
type LineSchemaEntry = {
  headerSchema: any;
  lineSchema: any;
  moduleKey: string;
  title: string;
  href: string;
  // goodsReceipt and goodsIssue have a unit price on the line; transfers use item avg price.
  useLinePrice: boolean;
};

const LINE_SCHEMA_ENTRIES: LineSchemaEntry[] = [
  {
    headerSchema: GoodsReceiptSchema,
    lineSchema: GoodsReceiptLineSchema,
    moduleKey: "goodsReceipt",
    title: "Top Warehouses by Goods Receipt",
    href: "/inventory/goods-receipt",
    useLinePrice: true,
  },
  {
    headerSchema: GoodsIssueSchema,
    lineSchema: GoodsIssueLineSchema,
    moduleKey: "goodsIssue",
    title: "Top Warehouses by Goods Issue",
    href: "/inventory/goods-issue",
    useLinePrice: true,
  },
  {
    headerSchema: InventoryTransferRequestSchema,
    lineSchema: InventoryTransferRequestLineSchema,
    moduleKey: "transferRequest",
    title: "Top Warehouses by Transfer Request",
    href: "/inventory/transfer-request",
    useLinePrice: false,
  },
  {
    headerSchema: InventoryTransferSchema,
    lineSchema: InventoryTransferLineSchema,
    moduleKey: "transfer",
    title: "Top Warehouses by Inventory Transfer",
    href: "/inventory/transfer",
    useLinePrice: false,
  },
];

const fetchWarehouseGroups = async (
  dbName: string,
  period: DashboardPeriod,
  whsMap: Map<string, string>,
): Promise<DashboardPartnerGroup[]> => {
  const window = getPeriodWindow(period);
  const { start, end } = window.current;

  const groups = await Promise.all(
    LINE_SCHEMA_ENTRIES.map(
      async ({ headerSchema, lineSchema, moduleKey, title, href, useLinePrice }) => {
        const lineRepo = await getTenantRepository(dbName, lineSchema);
        const qb = lineRepo
          .createQueryBuilder("line")
          .innerJoin(headerSchema, "header", "line.docEntry = header.docEntry");

        if (start) qb.andWhere("header.docDate >= :start", { start });
        if (end) qb.andWhere("header.docDate <= :end", { end });

        const valExpr = useLinePrice
          ? "SUM(line.quantity * line.price)"
          : "SUM(line.quantity * COALESCE(item.AvgPrice, 0))";

        // TypeORM join overloads accept Function|string but not EntitySchema; cast for compile-time.
        qb.leftJoin(ItemSchema as unknown as Function, "item", "line.itemCode = item.ItemCode")
          .select("line.whsCode", "whsCode")
          .addSelect("COUNT(DISTINCT line.docEntry)", "docCount")
          .addSelect(valExpr, "val")
          .groupBy("line.whsCode")
          .orderBy(valExpr, "DESC")
          .limit(5);

        const results = await qb.getRawMany();

        const entries = results.map((r: any) => {
          const code = String(r.whsCode || "").trim() || "Unknown";
          const name = whsMap.get(code) || `Warehouse ${code}`;
          return {
            code,
            name,
            totalValue: Number(parseFloat(r.val || "0").toFixed(2)),
            documentCount: parseInt(r.docCount || "0", 10),
            openValue: 0,
          };
        });

        return { key: moduleKey, title, module: moduleKey, href, entries };
      },
    ),
  );

  return groups;
};

// ---------------------------------------------------------------------------
// Public: cached inventory dataset loader
// ---------------------------------------------------------------------------

export const loadInventoryDataset = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<InventoryDataset> => {
  const cacheKey = `dash:inventory:${dbName}:${period}`;

  return getCachedData(
    cacheKey,
    async () => {
      const window = getPeriodWindow(period);

      const currency = await getDisplayCurrency(dbName);

      // Phase 1: All document + metadata queries run in parallel.
      // - 4 inventory flow modules × (current + previous) = up to 8 parallel doc fetches
      // - 1 item master aggregate query
      // - 1 warehouse list query (for name resolution)
      const [moduleDatasetsRaw, itemStats, warehousesRaw] = await Promise.all([
        Promise.all(
          INVENTORY_MODULES.map(async (module) => {
            const [current, previous] = await Promise.all([
              fetchModuleDocuments(module, window.current, dbName, currency),
              window.previous
                ? fetchModuleDocuments(module, window.previous, dbName, currency)
                : Promise.resolve([]),
            ]);
            return { module, current, previous } as ModuleDataset;
          }),
        ),
        fetchItemStats(dbName),
        getTenantRepository(dbName, WarehouseSchema).then((repo) => repo.find()),
      ]);

      const whsMap = new Map(warehousesRaw.map((w) => [w.WhsCode, w.WhsName]));

      // Phase 2: Warehouse group queries (4 line-table JOINs in parallel).
      // Runs after phase 1 only because it needs the whsMap for name resolution.
      const warehouseGroups = await fetchWarehouseGroups(dbName, period, whsMap);

      return {
        currency,
        period,
        granularity: window.granularity,
        modules: moduleDatasetsRaw,
        itemStats,
        warehouseGroups,
      };
    },
    15 * 1000,
  );
};
