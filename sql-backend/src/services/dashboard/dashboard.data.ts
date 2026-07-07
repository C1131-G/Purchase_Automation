// Dashboard data layer — Drizzle port of hana's TypeORM data layer.
// Both the new hana-compatible architecture AND legacy getPurchaseSummary/getSalesSummary/getInventorySummary.

import { and, gte, lte, asc, count, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { getCachedData } from "@/core/utils/cache";
import { getDisplayCurrency } from "@/services/currency.util";

import { purchaseQuotations } from "@/db/schema/purchase-quotations";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { grpo } from "@/db/schema/grpo";
import { apInvoices } from "@/db/schema/ap-invoices";
import { apCreditMemos } from "@/db/schema/ap-credit-memos";
import { outgoingPayments } from "@/db/schema/outgoing-payments";
import { salesQuotations } from "@/db/schema/sales-quotations";
import { salesOrders } from "@/db/schema/sales-orders";
import { arInvoices } from "@/db/schema/ar-invoices";
import { arCreditMemos } from "@/db/schema/ar-credit-memos";
import { incomingPayments } from "@/db/schema/incoming-payments";
import { goodsReceipts } from "@/db/schema/goods-receipts";
import { goodsIssues } from "@/db/schema/goods-issues";
import { inventoryTransferRequests } from "@/db/schema/inventory-transfer-requests";
import { inventoryTransfers } from "@/db/schema/inventory-transfers";
import { items } from "@/db/schema/items";
import { itemWarehouseStock } from "@/db/schema/item-warehouse-stock";

import { PURCHASE_MODULES, SALES_MODULES, INVENTORY_MODULES } from "./dashboard.constants";
import { getPeriodWindow } from "./dashboard.period";
import type {
  AreaDataset,
  DashboardArea,
  DashboardPeriod,
  DateRange,
  DocumentModule,
  ModuleDataset,
  RawDashboardDocument,
} from "./dashboard.types";

const SCHEMA_MAP: Record<DocumentModule, any> = {
  purchaseQuotation: purchaseQuotations,
  purchaseOrder: purchaseOrders,
  grpo: grpo,
  apInvoice: apInvoices,
  apCreditNote: apCreditMemos,
  outgoingPayment: outgoingPayments,
  salesQuotation: salesQuotations,
  salesOrder: salesOrders,
  arInvoice: arInvoices,
  arCreditNote: arCreditMemos,
  incomingPayment: incomingPayments,
  itemMaster: null,
  goodsReceipt: goodsReceipts,
  goodsIssue: goodsIssues,
  transferRequest: inventoryTransferRequests,
  transfer: inventoryTransfers,
};

const getRowDates = (doc: any) => {
  const docDate =
    doc.docDate instanceof Date
      ? doc.docDate.toISOString().slice(0, 10)
      : String(doc.docDate || "").slice(0, 10);
  const docDueDate =
    doc.docDueDate instanceof Date
      ? doc.docDueDate.toISOString().slice(0, 10)
      : doc.docDueDate
        ? String(doc.docDueDate).slice(0, 10)
        : docDate;
  return { docDate, docDueDate };
};

const mapRow = (
  module: DocumentModule,
  doc: any,
  defaultCurrency: string,
): RawDashboardDocument => {
  const { docDate, docDueDate } = getRowDates(doc);

  return {
    module,
    docEntry: Number(doc.id || 0),
    docNum: Number(doc.docNum || 0),
    docDate,
    docDueDate,
    cardCode: String(doc.cardCode || ""),
    cardName: String(doc.cardName || ""),
    docTotal: Number(doc.docTotal || 0),
    docCurrency: doc.docCurrency || defaultCurrency,
    docStatus: String(doc.docStatus || "C"),
    paidToDate: Number(doc.paidToDate || 0),
  };
};

export const fetchModuleDocuments = async (
  module: DocumentModule,
  range: DateRange,
): Promise<RawDashboardDocument[]> => {
  const schema = SCHEMA_MAP[module];
  if (!schema) return [];
  const db = getDb();
  const conditions: any[] = [];
  if (range.start) conditions.push(gte(schema.docDate, range.start));
  if (range.end) conditions.push(lte(schema.docDate, range.end));
  const defaultCurrency = await getDisplayCurrency();
  const rows = await db
    .select()
    .from(schema)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(schema.docDate));
  return rows.map((doc: any) => mapRow(module, doc, defaultCurrency));
};

export const loadAreaDataset = async (
  area: DashboardArea,
  period: DashboardPeriod,
): Promise<AreaDataset> => {
  const cacheKey = `dash:${area}:${period}`;
  return getCachedData(
    cacheKey,
    async () => {
      const window = getPeriodWindow(period);
      const modules =
        area === "purchase"
          ? PURCHASE_MODULES
          : area === "inventory"
            ? INVENTORY_MODULES
            : SALES_MODULES;
      const datasets = await Promise.all(
        modules.map(async (module) => {
          const [current, previous] = await Promise.all([
            fetchModuleDocuments(module, window.current),
            window.previous ? fetchModuleDocuments(module, window.previous) : Promise.resolve([]),
          ]);
          return { module, current, previous };
        }),
      );
      const defaultCurrency = await getDisplayCurrency();
      return {
        currency: defaultCurrency,
        modules: datasets,
        period,
        granularity: window.granularity,
      };
    },
    15 * 1000,
  );
};

export const getModuleDataset = (dataset: AreaDataset, module: DocumentModule): ModuleDataset => {
  const match = dataset.modules.find((entry) => entry.module === module);
  return match ?? { module, current: [], previous: [] };
};

// Legacy compat for dashboard.view.ts
export const getPurchaseSummary = async (_period: "week" | "month" | "year" | "all") => {
  const db = getDb();
  const [po] = await db
    .select({
      total: count(),
      value: sql`COALESCE(SUM(${purchaseOrders.docTotal}), 0)`.mapWith(Number),
    })
    .from(purchaseOrders);
  const [gr] = await db
    .select({ total: count(), value: sql`COALESCE(SUM(${grpo.docTotal}), 0)`.mapWith(Number) })
    .from(grpo);
  const [ap] = await db
    .select({
      total: count(),
      value: sql`COALESCE(SUM(${apInvoices.docTotal}), 0)`.mapWith(Number),
    })
    .from(apInvoices);
  return {
    totalPOs: Number(po.total),
    totalPOValue: Number(po.value),
    totalGRPOs: Number(gr.total),
    totalGRPOValue: Number(gr.value),
    totalAPInvoices: Number(ap.total),
    totalAPValue: Number(ap.value),
  };
};
export const getSalesSummary = async (_period: "week" | "month" | "year" | "all") => {
  const db = getDb();
  const [so] = await db
    .select({
      total: count(),
      value: sql`COALESCE(SUM(${salesOrders.docTotal}), 0)`.mapWith(Number),
    })
    .from(salesOrders);
  return { totalSalesOrders: Number(so.total), totalSalesValue: Number(so.value) };
};
export const getInventorySummary = async () => {
  const db = getDb();
  const [itemCount] = await db.select({ total: count() }).from(items);
  const [stock] = await db
    .select({ total: sql`COALESCE(SUM(${itemWarehouseStock.onHand}), 0)`.mapWith(Number) })
    .from(itemWarehouseStock);
  const [lowStock] = await db
    .select({ total: count() })
    .from(itemWarehouseStock)
    .where(sql`${itemWarehouseStock.onHand} <= 10`);
  return {
    totalItems: Number(itemCount.total),
    totalStock: Number(stock.total),
    lowStockItems: Number(lowStock.total),
  };
};
