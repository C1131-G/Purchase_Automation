import { sql, desc, eq, and, gte, lte } from "drizzle-orm";
// Inventory dashboard data — Drizzle port of hana's inventory data layer.

import { getCachedData } from "@/core/utils/cache.util";
import { getDb } from "@/db/client";
import { goodsIssueLines } from "@/db/schema/goods-issue-lines";
import { goodsIssues } from "@/db/schema/goods-issues";
import { goodsReceiptLines } from "@/db/schema/goods-receipt-lines";
import { goodsReceipts } from "@/db/schema/goods-receipts";
import { inventoryTransferLines } from "@/db/schema/inventory-transfer-lines";
import { inventoryTransferRequestLines } from "@/db/schema/inventory-transfer-request-lines";
import { inventoryTransferRequests } from "@/db/schema/inventory-transfer-requests";
import { inventoryTransfers } from "@/db/schema/inventory-transfers";
import { itemWarehouseStock } from "@/db/schema/item-warehouse-stock";
import { items } from "@/db/schema/items";
import { warehouses } from "@/db/schema/warehouses";
import { getDisplayCurrency } from "@/services/currency.util";
import type { LooseColumn, LooseTable } from "@/types/db.types";

import { INVENTORY_MODULES } from "./dashboard-constants.util";
import { fetchModuleDocuments } from "./dashboard-data.util";
import { getPeriodWindow } from "./dashboard-period.util";
import type {
  DashboardPeriod,
  DashboardPartnerGroup,
  InventoryDataset,
  InventoryItemStats,
  ModuleDataset,
} from "./dashboard.types";

export type { InventoryDataset, InventoryItemStats } from "./dashboard.types";

// ---------------------------------------------------------------------------
// Item stats
// ---------------------------------------------------------------------------

const fetchItemStats = async (): Promise<InventoryItemStats> => {
  const db = getDb();

  const [itemCount] = await db.select({ total: sql<number>`COUNT(*)`.mapWith(Number) }).from(items);

  const [stockData] = await db
    .select({
      onHandItems: sql<number>`COUNT(DISTINCT ${itemWarehouseStock.itemCode})`.mapWith(Number),
      stockValue:
        sql<number>`COALESCE(SUM(${itemWarehouseStock.onHand} * CAST(COALESCE(NULLIF(${items.avgPrice}, '0'), '0') AS numeric)), 0)`.mapWith(
          Number,
        ),
    })
    .from(itemWarehouseStock)
    .leftJoin(items, sql`${itemWarehouseStock.itemCode} = ${items.code}`);

  return {
    onHandItems: Number(stockData?.onHandItems ?? 0),
    // No on_order column in current schema
    onOrderValue: 0,
    stockValue: Number(Number(stockData?.stockValue ?? 0).toFixed(2)),
    totalItems: Number(itemCount.total ?? 0),
  };
};

// ---------------------------------------------------------------------------
// Warehouse groups (top partners for inventory modules)
// ---------------------------------------------------------------------------

interface LineEntry {
  headerTable: LooseTable;
  lineTable: LooseTable;
  priceField: LooseColumn;
  moduleKey: string;
  title: string;
  href: string;
}

const LINE_ENTRIES: LineEntry[] = [
  {
    headerTable: goodsReceipts,
    href: "/inventory/goods-receipt",
    lineTable: goodsReceiptLines,
    moduleKey: "goodsReceipt",
    priceField: goodsReceiptLines.price,
    title: "Top Warehouses by Goods Receipt",
  },
  {
    headerTable: goodsIssues,
    href: "/inventory/goods-issue",
    lineTable: goodsIssueLines,
    moduleKey: "goodsIssue",
    priceField: goodsIssueLines.price,
    title: "Top Warehouses by Goods Issue",
  },
  {
    headerTable: inventoryTransferRequests,
    href: "/inventory/transfer-request",
    lineTable: inventoryTransferRequestLines,
    moduleKey: "transferRequest",
    priceField: null,
    title: "Top Warehouses by Transfer Request",
  },
  {
    headerTable: inventoryTransfers,
    href: "/inventory/transfer",
    lineTable: inventoryTransferLines,
    moduleKey: "transfer",
    priceField: null,
    title: "Top Warehouses by Inventory Transfer",
  },
];

const fetchWarehouseGroups = async (
  period: DashboardPeriod,
  whsMap: Map<string, string>,
): Promise<DashboardPartnerGroup[]> => {
  const window = getPeriodWindow(period);
  const { start, end } = window.current;

  const entries = LINE_ENTRIES.map(
    async ({ headerTable, lineTable, priceField, moduleKey, title, href }) => {
      const db = getDb();

      const conditions: import("drizzle-orm").SQL[] = [];
      if (start) {
        conditions.push(gte(headerTable.docDate, start));
      }
      if (end) {
        conditions.push(lte(headerTable.docDate, end));
      }

      const valExpr = priceField
        ? sql<number>`COALESCE(SUM(${lineTable.quantity} * ${lineTable.price}), 0)`
        : sql<number>`COALESCE(SUM(${lineTable.quantity}), 0)`;

      const rows = await db
        .select({
          docCount: sql<number>`COUNT(DISTINCT ${lineTable.docEntry})`.mapWith(Number),
          totalVal: valExpr.mapWith(Number),
          whsCode: lineTable.warehouseCode,
        })
        .from(lineTable)
        .innerJoin(headerTable, eq(lineTable.docEntry, headerTable.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(lineTable.warehouseCode)
        .orderBy(desc(valExpr.mapWith(Number)))
        .limit(5);

      const partnerEntries = rows.map((r: Record<string, unknown>) => {
        const code = String(r.whsCode || "").trim() || "Unknown";
        const name = whsMap.get(code) || `Warehouse ${code}`;
        return {
          code,
          documentCount: Number(r.docCount ?? 0),
          name,
          openValue: 0,
          totalValue: Number(Number(r.totalVal ?? 0).toFixed(2)),
        };
      });

      return {
        entries: partnerEntries,
        href,
        key: moduleKey,
        module: moduleKey,
        title,
      };
    },
  );

  return Promise.all(entries);
};

// ---------------------------------------------------------------------------
// Public: cached inventory dataset loader
// ---------------------------------------------------------------------------

export const loadInventoryDataset = async (period: DashboardPeriod): Promise<InventoryDataset> => {
  const cacheKey = `dash:inventory:${period}`;

  return getCachedData(
    cacheKey,
    async () => {
      const window = getPeriodWindow(period);

      // Phase 1: All parallel queries
      const [moduleDatasetsRaw, itemStats, warehouseRows] = await Promise.all([
        Promise.all(
          INVENTORY_MODULES.map(async (module) => {
            const [current, previous] = await Promise.all([
              fetchModuleDocuments(module, window.current),
              window.previous ? fetchModuleDocuments(module, window.previous) : Promise.resolve([]),
            ]);
            return { current, module, previous } as ModuleDataset;
          }),
        ),
        fetchItemStats(),
        getDb().select({ code: warehouses.code, name: warehouses.name }).from(warehouses),
      ]);

      const whsMap = new Map<string, string>(
        warehouseRows.map((w: { code: string | null; name: string | null }) => [
          String(w.code ?? ""),
          String(w.name ?? ""),
        ]),
      );
      const warehouseGroups = await fetchWarehouseGroups(period, whsMap);

      const displayCurrency = await getDisplayCurrency();
      return {
        currency: displayCurrency,
        granularity: window.granularity,
        itemStats,
        modules: moduleDatasetsRaw,
        period,
        warehouseGroups,
      };
    },
    15 * 1000,
  );
};
