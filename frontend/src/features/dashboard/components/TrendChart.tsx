import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DashboardTrend } from "../utils/types";
import { formatCurrency } from "../utils/formatters";

interface TrendChartProps {
  trend: DashboardTrend | undefined;
  currency: string;
  color: "blue" | "indigo";
}

const MODULE_LABELS: Record<string, string> = {
  purchaseOrder: "Purchase Order",
  grpo: "GRPO",
  apInvoice: "AP Invoice",
  apCreditNote: "Credit Memo",
  outgoingPayment: "Outgoing Payment",
  salesQuotation: "Sales Quotation",
  salesOrder: "Sales Order",
  delivery: "Delivery",
  arInvoice: "AR Invoice",
  arCreditNote: "Credit Memo",
  incomingPayment: "Incoming Payment",
};

const SERIES_COLORS: Record<string, string> = {
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
};

export function TrendChart({ trend, currency }: TrendChartProps) {
  if (!trend || !trend.points || trend.points.length === 0) return null;

  // Format data for Recharts
  const chartData = trend.points.map((pt) => ({
    name: pt.label,
    ...pt.series,
  }));

  // Get keys to display
  const seriesKeys = Object.keys(trend.points[0]?.series || {});

  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4 h-[400px]">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-zinc-900">{trend.title}</h3>
        <p className="text-xs text-zinc-400 font-medium">
          Aggregated transaction values by {trend.granularity}
        </p>
      </div>

      <div className="flex-1 min-h-0 w-full text-xs font-medium">
        <ResponsiveContainer width="100%" height="100%">
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

            <XAxis
              dataKey="name"
              stroke="#a1a1aa"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />

            <YAxis
              stroke="#a1a1aa"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value, currency, true)}
              dx={-5}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white/95 backdrop-blur-sm border border-zinc-200 rounded-xl p-3 shadow-md flex flex-col gap-2 min-w-[180px]">
                      <p className="font-bold text-zinc-900 border-b border-zinc-100 pb-1.5 mb-0.5">
                        {label}
                      </p>
                      {payload.map((p) => {
                        const strokeColor = p.stroke || SERIES_COLORS[p.name || ""] || "#71717a";
                        return (
                          <div key={p.name} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-semibold">
                              <span
                                className="size-2 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: strokeColor }}
                              />
                              {MODULE_LABELS[p.name || ""] || p.name}
                            </span>
                            <span className="font-bold text-zinc-900">
                              {formatCurrency(Number(p.value), currency, false)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={6}
              formatter={(value) => (
                <span className="text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors">
                  {MODULE_LABELS[value] || value}
                </span>
              )}
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
                  activeDot={{ r: 5, strokeWidth: 1.5, stroke: "#ffffff" }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
