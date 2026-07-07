// Inventory dashboard data — Drizzle port of hana's inventory data layer.

import { sql, desc, eq, and, gte, lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { getCachedData } from "@/core/utils/cache";
import { getDisplayCurrency } from "@/services/currency.util";

import { items } from "@/db/schema/items";
import { itemWarehouseStock } from "@/db/schema/item-warehouse-stock";
import { warehouses } from "@/db/schema/warehouses";
import { goodsReceiptLines } from "@/db/schema/goods-receipt-lines";
import { goodsReceipts } from "@/db/schema/goods-receipts";
import { goodsIssueLines } from "@/db/schema/goods-issue-lines";
import { goodsIssues } from "@/db/schema/goods-issues";
import { inventoryTransferRequestLines } from "@/db/schema/inventory-transfer-request-lines";
import { inventoryTransferRequests } from "@/db/schema/inventory-transfer-requests";
import { inventoryTransferLines } from "@/db/schema/inventory-transfer-lines";
import { inventoryTransfers } from "@/db/schema/inventory-transfers";

import { INVENTORY_MODULES } from "./dashboard.constants";
import { fetchModuleDocuments } from "./dashboard.data";
import { getPeriodWindow } from "./dashboard.period";
import type { DashboardPeriod, DashboardPartnerGroup, ModuleDataset } from "./dashboard.types";
import type { InventoryDataset, InventoryItemStats } from "./dashboard.types";

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
    totalItems: Number(itemCount.total ?? 0),
    onHandItems: Number(stockData?.onHandItems ?? 0),
    stockValue: Number(Number(stockData?.stockValue ?? 0).toFixed(2)),
    onOrderValue: 0, // No on_order column in current schema
  };
};

// ---------------------------------------------------------------------------
// Warehouse groups (top partners for inventory modules)
// ---------------------------------------------------------------------------

type LineEntry = {
  headerTable: any;
  lineTable: any;
  priceField: any;
  moduleKey: string;
  title: string;
  href: string;
};

const LINE_ENTRIES: LineEntry[] = [
  {
    headerTable: goodsReceipts,
    lineTable: goodsReceiptLines,
    priceField: goodsReceiptLines.price,
    moduleKey: "goodsReceipt",
    title: "Top Warehouses by Goods Receipt",
    href: "/inventory/goods-receipt",
  },
  {
    headerTable: goodsIssues,
    lineTable: goodsIssueLines,
    priceField: goodsIssueLines.price,
    moduleKey: "goodsIssue",
    title: "Top Warehouses by Goods Issue",
    href: "/inventory/goods-issue",
  },
  {
    headerTable: inventoryTransferRequests,
    lineTable: inventoryTransferRequestLines,
    priceField: null,
    moduleKey: "transferRequest",
    title: "Top Warehouses by Transfer Request",
    href: "/inventory/transfer-request",
  },
  {
    headerTable: inventoryTransfers,
    lineTable: inventoryTransferLines,
    priceField: null,
    moduleKey: "transfer",
    title: "Top Warehouses by Inventory Transfer",
    href: "/inventory/transfer",
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

      const conditions: any[] = [];
      if (start) conditions.push(gte(headerTable.docDate, start));
      if (end) conditions.push(lte(headerTable.docDate, end));

      const valExpr = priceField
        ? sql<number>`COALESCE(SUM(${lineTable.quantity} * ${lineTable.price}), 0)`
        : sql<number>`COALESCE(SUM(${lineTable.quantity}), 0)`;

      const rows = await db
        .select({
          whsCode: lineTable.warehouseCode,
          docCount: sql<number>`COUNT(DISTINCT ${lineTable.docEntry})`.mapWith(Number),
          totalVal: valExpr.mapWith(Number),
        })
        .from(lineTable)
        .innerJoin(headerTable, eq(lineTable.docEntry, headerTable.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(lineTable.warehouseCode)
        .orderBy(desc(valExpr.mapWith(Number)))
        .limit(5);

      const partnerEntries = rows.map((r: any) => {
        const code = String(r.whsCode || "").trim() || "Unknown";
        const name = whsMap.get(code) || `Warehouse ${code}`;
        return {
          code,
          name,
          totalValue: Number(Number(r.totalVal ?? 0).toFixed(2)),
          documentCount: Number(r.docCount ?? 0),
          openValue: 0,
        };
      });

      return { key: moduleKey, title, module: moduleKey, href, entries: partnerEntries };
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
            return { module, current, previous } as ModuleDataset;
          }),
        ),
        fetchItemStats(),
        getDb().select({ code: warehouses.code, name: warehouses.name }).from(warehouses),
      ]);

      const whsMap = new Map(warehouseRows.map((w: any) => [w.code, w.name]));
      const warehouseGroups = await fetchWarehouseGroups(period, whsMap);

      const displayCurrency = await getDisplayCurrency();
      return {
        currency: displayCurrency,
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
