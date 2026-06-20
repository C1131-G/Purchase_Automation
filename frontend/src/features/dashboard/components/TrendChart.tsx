import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DashboardTrend } from "../utils/types";
import { formatCurrency } from "../utils/formatters";

interface TrendChartProps {
  trend: DashboardTrend | undefined;
  currency: string;
  color: "blue" | "indigo";
}

const MODULE_LABELS: Record<string, string> = {
  purchaseQuotation: "Purchase Quotation",
  purchaseOrder: "Purchase Order",
  grpo: "GRPO",
  apInvoice: "AP Invoice",
  apCreditNote: "AP Credit Memo",
  outgoingPayment: "Outgoing Payment",
  salesQuotation: "Sales Quotation",
  salesOrder: "Sales Order",
  delivery: "Delivery",
  arInvoice: "AR Invoice",
  arCreditNote: "AR Credit Memo",
  incomingPayment: "Incoming Payment",
  goodsReceipt: "Goods Receipt",
  goodsIssue: "Goods Issue",
  transferRequest: "Transfer Request",
  transfer: "Transfer",
  itemMaster: "Item Master",
  goodsMovement: "Goods Movement",
};

const SERIES_COLORS: Record<string, string> = {
  purchaseQuotation: "#f59e0b", // amber
  purchaseOrder: "#2563eb", // blue
  grpo: "#0ea5e9", // sky
  apInvoice: "#6366f1", // indigo
  apCreditNote: "#f43f5e", // rose
  outgoingPayment: "#10b981", // emerald
  salesQuotation: "#f59e0b", // amber
  salesOrder: "#4f46e5", // indigo
  delivery: "#8b5cf6", // violet
  arInvoice: "#2563eb", // blue
  arCreditNote: "#f43f5e", // rose
  incomingPayment: "#10b981", // emerald
  goodsReceipt: "#10b981", // emerald
  goodsIssue: "#f43f5e", // rose
  transferRequest: "#f59e0b", // amber
  transfer: "#8b5cf6", // violet
  itemMaster: "#3b82f6", // blue
  goodsMovement: "#10b981", // emerald
};

const formatLabel = (key: string): string => {
  const known = MODULE_LABELS[key];
  if (known) return known.toUpperCase();
  return key
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toUpperCase();
};

const formatFullCurrency = (value: number, currency: string): string => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.trim() || "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    const formatted = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(value);
    return currency.trim().length > 0 ? `${formatted} ${currency}` : formatted;
  }
};

export function TrendChart({ trend, currency, color }: TrendChartProps) {
  if (!trend || !trend.points || trend.points.length === 0) return null;

  // Format data for Recharts
  const chartData = trend.points.map((pt) => ({
    name: pt.label,
    ...pt.series,
  }));

  // Get keys to display, ordered by flow sequence
  const PURCHASE_ORDERED_KEYS = [
    "purchaseQuotation",
    "purchaseOrder",
    "grpo",
    "apInvoice",
    "apCreditNote",
    "outgoingPayment",
  ];

  const SALES_ORDERED_KEYS = [
    "salesQuotation",
    "salesOrder",
    "arInvoice",
    "arCreditNote",
    "incomingPayment",
  ];

  const allKeys = new Set<string>();
  trend.points.forEach((pt) => {
    Object.keys(pt.series).forEach((k) => allKeys.add(k));
  });

  const INVENTORY_ORDERED_KEYS = [
    "itemMaster",
    "goodsMovement",
    "transfer",
    "goodsReceipt",
    "goodsIssue",
    "transferRequest",
  ];

  const isInventory =
    allKeys.has("itemMaster") ||
    allKeys.has("goodsMovement") ||
    allKeys.has("goodsReceipt") ||
    allKeys.has("goodsIssue") ||
    allKeys.has("transferRequest") ||
    allKeys.has("transfer");

  const orderedKeys = isInventory
    ? INVENTORY_ORDERED_KEYS
    : color === "blue"
      ? PURCHASE_ORDERED_KEYS
      : SALES_ORDERED_KEYS;
  const seriesKeys = orderedKeys.filter((k) => allKeys.has(k));

  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4 h-full min-h-[380px]">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-zinc-900">{trend.title}</h3>
        <p className="text-xs text-zinc-400 font-medium">
          Aggregated transaction values by {trend.granularity}
        </p>
      </div>

      <div className="flex-1 min-h-0 w-full text-xs font-medium">
        <ResponsiveContainer width="100%" height="100%">
          {isInventory ? (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={false} />
              <YAxis
                stroke="#a1a1aa"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value, currency, true)}
                dx={-5}
              />

              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e4e4e7",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                }}
                itemStyle={{ fontSize: "13px", fontWeight: 500 }}
                labelStyle={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#18181b",
                  marginBottom: "6px",
                }}
                labelFormatter={(label) => label}
                itemSorter={(item) => {
                  const val = typeof item.value === "number" ? item.value : 0;
                  return -val;
                }}
                formatter={(value) =>
                  typeof value === "number"
                    ? formatFullCurrency(value, currency)
                    : String(value ?? "")
                }
              />

              {seriesKeys.map((key) => {
                const strokeColor = SERIES_COLORS[key] || "#71717a";
                const isItemMaster = key === "itemMaster";
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={strokeColor}
                    strokeWidth={isItemMaster ? 2 : 2.5}
                    strokeDasharray={isItemMaster ? "4 4" : ""}
                    dot={isItemMaster ? false : { r: 3, strokeWidth: 1 }}
                    name={formatLabel(key)}
                    activeDot={{ r: isItemMaster ? 4 : 6, strokeWidth: 1.5, stroke: "#ffffff" }}
                  />
                );
              })}
            </LineChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {seriesKeys.map((key) => {
                  const strokeColor = SERIES_COLORS[key] || "#71717a";
                  return (
                    <linearGradient key={key} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={strokeColor} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={strokeColor} stopOpacity={0.01} />
                    </linearGradient>
                  );
                })}
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={false} />
              <YAxis
                stroke="#a1a1aa"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value, currency, true)}
                dx={-5}
              />

              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e4e4e7",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                }}
                itemStyle={{ fontSize: "13px", fontWeight: 500 }}
                labelStyle={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#18181b",
                  marginBottom: "6px",
                }}
                labelFormatter={(label) => label}
                itemSorter={(item) => {
                  const val = typeof item.value === "number" ? item.value : 0;
                  return -val;
                }}
                formatter={(value) =>
                  typeof value === "number"
                    ? formatFullCurrency(value, currency)
                    : String(value ?? "")
                }
              />

              {seriesKeys.map((key) => {
                const strokeColor = SERIES_COLORS[key] || "#71717a";
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={strokeColor}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#color-${key})`}
                    name={formatLabel(key)}
                    activeDot={{ r: 5, strokeWidth: 1.5, stroke: "#ffffff" }}
                  />
                );
              })}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
