import { count, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { apInvoices } from "@/db/schema/ap-invoices";
import { grpo } from "@/db/schema/grpo";
import { itemWarehouseStock } from "@/db/schema/item-warehouse-stock";
import { items } from "@/db/schema/items";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { salesOrders } from "@/db/schema/sales-orders";

// Legacy compat for dashboard.view.ts
export const getPurchaseSummary = async (_period: "week" | "month" | "year" | "all") => {
  const db = getDb();
  const [purchaseOrder] = await db
    .select({
      total: count(),
      value: sql`COALESCE(SUM(${purchaseOrders.docTotal}), 0)`.mapWith(Number),
    })
    .from(purchaseOrders);
  const [goodsReceipt] = await db
    .select({
      total: count(),
      value: sql`COALESCE(SUM(${grpo.docTotal}), 0)`.mapWith(Number),
    })
    .from(grpo);
  const [apInvoice] = await db
    .select({
      total: count(),
      value: sql`COALESCE(SUM(${apInvoices.docTotal}), 0)`.mapWith(Number),
    })
    .from(apInvoices);
  return {
    totalAPInvoices: Number(apInvoice.total),
    totalAPValue: Number(apInvoice.value),
    totalGRPOValue: Number(goodsReceipt.value),
    totalGRPOs: Number(goodsReceipt.total),
    totalPOValue: Number(purchaseOrder.value),
    totalPOs: Number(purchaseOrder.total),
  };
};

export const getSalesSummary = async (_period: "week" | "month" | "year" | "all") => {
  const db = getDb();
  const [salesOrder] = await db
    .select({
      total: count(),
      value: sql`COALESCE(SUM(${salesOrders.docTotal}), 0)`.mapWith(Number),
    })
    .from(salesOrders);
  return {
    totalSalesOrders: Number(salesOrder.total),
    totalSalesValue: Number(salesOrder.value),
  };
};

export const getInventorySummary = async () => {
  const db = getDb();
  const [itemCount] = await db.select({ total: count() }).from(items);
  const [stock] = await db
    .select({
      total: sql`COALESCE(SUM(${itemWarehouseStock.onHand}), 0)`.mapWith(Number),
    })
    .from(itemWarehouseStock);
  const [lowStock] = await db
    .select({ total: count() })
    .from(itemWarehouseStock)
    .where(sql`${itemWarehouseStock.onHand} <= 10`);
  return {
    lowStockItems: Number(lowStock.total),
    totalItems: Number(itemCount.total),
    totalStock: Number(stock.total),
  };
};
