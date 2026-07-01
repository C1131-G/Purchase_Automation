// Dashboard trend: Period-over-period trend calculation.

import { and, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { salesOrders } from "@/db/schema/sales-orders";
import { getDateRange } from "./dashboard.period";
import { calculateChange } from "./dashboard.calculations";
import type { DashboardTrend } from "./dashboard.types";

interface TrendConfig {
  table: any;
  dateField: any;
  valueField: any;
}

const getTrend = async (
  config: TrendConfig,
  period: "week" | "month" | "year",
): Promise<DashboardTrend[]> => {
  const db = getDb();
  const range = getDateRange(period);

  // Calculate previous period end
  const prevEnd = new Date(range.startDate);
  const duration = new Date(range.endDate).getTime() - new Date(range.startDate).getTime();
  const prevStart = new Date(prevEnd.getTime() - duration);

  const [current] = await db
    .select({ value: sql`COALESCE(SUM(${config.valueField}), 0)` })
    .from(config.table)
    .where(and(gte(config.dateField, range.startDate), lt(config.dateField, range.endDate)));

  const [previous] = await db
    .select({ value: sql`COALESCE(SUM(${config.valueField}), 0)` })
    .from(config.table)
    .where(
      and(
        gte(config.dateField, prevStart.toISOString().split("T")[0]),
        lt(config.dateField, range.startDate),
      ),
    );

  return [
    {
      period: range.label,
      value: Number(current.value),
      previousValue: Number(previous.value),
      change: calculateChange(Number(current.value), Number(previous.value)),
    },
  ];
};

export const getPurchaseTrend = (period: "week" | "month" | "year") =>
  getTrend(
    {
      table: purchaseOrders,
      dateField: purchaseOrders.docDate,
      valueField: purchaseOrders.docTotal,
    },
    period,
  );

export const getSalesTrend = (period: "week" | "month" | "year") =>
  getTrend(
    { table: salesOrders, dateField: salesOrders.docDate, valueField: salesOrders.docTotal },
    period,
  );
