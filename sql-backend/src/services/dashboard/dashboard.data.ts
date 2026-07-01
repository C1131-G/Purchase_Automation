// Dashboard data: Raw data queries for all KPIs.

import { and, count, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { grpo } from "@/db/schema/grpo";
import { apInvoices } from "@/db/schema/ap-invoices";
import { salesOrders } from "@/db/schema/sales-orders";
import { items } from "@/db/schema/items";
import { itemWarehouseStock } from "@/db/schema/item-warehouse-stock";
import { getDateRange } from "./dashboard.period";

const sumField = (field: any) => sql`COALESCE(SUM(${field}), 0)`;

export const getPurchaseSummary = async (period: "week" | "month" | "year" | "all") => {
  const db = getDb();
  const range = period === "all" ? null : getDateRange(period);
  const where = range
    ? and(gte(purchaseOrders.docDate, range.startDate), lte(purchaseOrders.docDate, range.endDate))
    : undefined;

  const [po] = await db
    .select({ total: count(), value: sumField(purchaseOrders.docTotal) })
    .from(purchaseOrders)
    .where(where);
  const [gr] = await db
    .select({ total: count(), value: sumField(grpo.docTotal) })
    .from(grpo)
    .where(where);
  const [ap] = await db
    .select({ total: count(), value: sumField(apInvoices.docTotal) })
    .from(apInvoices)
    .where(where);

  return {
    totalPOs: Number(po.total),
    totalPOValue: Number(po.value),
    totalGRPOs: Number(gr.total),
    totalGRPOValue: Number(gr.value),
    totalAPInvoices: Number(ap.total),
    totalAPValue: Number(ap.value),
  };
};

export const getSalesSummary = async (period: "week" | "month" | "year" | "all") => {
  const db = getDb();
  const range = period === "all" ? null : getDateRange(period);
  const where = range
    ? and(gte(salesOrders.docDate, range.startDate), lte(salesOrders.docDate, range.endDate))
    : undefined;

  const [so] = await db
    .select({ total: count(), value: sumField(salesOrders.docTotal) })
    .from(salesOrders)
    .where(where);

  return { totalSalesOrders: Number(so.total), totalSalesValue: Number(so.value) };
};

export const getInventorySummary = async () => {
  const db = getDb();
  const [itemCount] = await db.select({ total: count() }).from(items);
  const [stock] = await db
    .select({ total: sql`COALESCE(SUM(${itemWarehouseStock.onHand}), 0)` })
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
