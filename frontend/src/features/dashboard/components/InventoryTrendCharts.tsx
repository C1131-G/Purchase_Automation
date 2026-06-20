import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DashboardTrend } from "../utils/types";
import { formatCurrency } from "../utils/formatters";

interface InventoryTrendChartsProps {
  trend: DashboardTrend | undefined;
  currency: string;
}

const SERIES_COLORS = {
  goodsReceipt: "#10b981", // emerald
  goodsIssue: "#f43f5e", // rose
  transferRequest: "#f59e0b", // amber
  transfer: "#8b5cf6", // violet
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

export function InventoryTrendCharts({ trend, currency }: InventoryTrendChartsProps) {
  if (!trend || !trend.points || trend.points.length === 0) return null;

  // Format data for Recharts
  const chartData = trend.points.map((pt) => ({
    name: pt.label,
    ...pt.series,
  }));

  // Calculate totals
  const totalGoodsReceipt = trend.points.reduce(
    (sum, pt) => sum + (pt.series.goodsReceipt || 0),
    0,
  );
  const totalGoodsIssue = trend.points.reduce((sum, pt) => sum + (pt.series.goodsIssue || 0), 0);
  const totalTransferRequest = trend.points.reduce(
    (sum, pt) => sum + (pt.series.transferRequest || 0),
    0,
  );
  const totalTransfer = trend.points.reduce((sum, pt) => sum + (pt.series.transfer || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-stretch">
      {/* Chart 1: Goods Movement Trend */}
      <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4 min-h-[380px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-zinc-900">Goods Movement Trend</h3>
            <p className="text-xs text-zinc-400 font-medium font-sans">
              Goods Receipt & Goods Issue values by {trend.granularity}
            </p>
          </div>
          <div className="flex flex-col text-right shrink-0">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Total Volume
            </span>
            <span className="text-sm font-bold text-zinc-800">
              {formatFullCurrency(totalGoodsReceipt + totalGoodsIssue, currency)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-xs"
              style={{ backgroundColor: SERIES_COLORS.goodsReceipt }}
            />
            <span>Receipts: {formatFullCurrency(totalGoodsReceipt, currency)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-xs"
              style={{ backgroundColor: SERIES_COLORS.goodsIssue }}
            />
            <span>Issues: {formatFullCurrency(totalGoodsIssue, currency)}</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 w-full text-xs font-medium">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="color-goodsReceipt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SERIES_COLORS.goodsReceipt} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={SERIES_COLORS.goodsReceipt} stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="color-goodsIssue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SERIES_COLORS.goodsIssue} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={SERIES_COLORS.goodsIssue} stopOpacity={0.01} />
                </linearGradient>
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
                formatter={(value) =>
                  typeof value === "number"
                    ? formatFullCurrency(value, currency)
                    : String(value ?? "")
                }
              />

              <Area
                type="monotone"
                dataKey="goodsReceipt"
                stroke={SERIES_COLORS.goodsReceipt}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#color-goodsReceipt)"
                name="GOODS RECEIPT"
                activeDot={{ r: 5, strokeWidth: 1.5, stroke: "#ffffff" }}
              />
              <Area
                type="monotone"
                dataKey="goodsIssue"
                stroke={SERIES_COLORS.goodsIssue}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#color-goodsIssue)"
                name="GOODS ISSUE"
                activeDot={{ r: 5, strokeWidth: 1.5, stroke: "#ffffff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Inventory Transfer Trend */}
      <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4 min-h-[380px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-zinc-900">Inventory Transfer Trend</h3>
            <p className="text-xs text-zinc-400 font-medium font-sans">
              Transfer Request & Actual Transfer values by {trend.granularity}
            </p>
          </div>
          <div className="flex flex-col text-right shrink-0">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Total Volume
            </span>
            <span className="text-sm font-bold text-zinc-800">
              {formatFullCurrency(totalTransferRequest + totalTransfer, currency)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-xs"
              style={{ backgroundColor: SERIES_COLORS.transferRequest }}
            />
            <span>Requests: {formatFullCurrency(totalTransferRequest, currency)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-xs"
              style={{ backgroundColor: SERIES_COLORS.transfer }}
            />
            <span>Transfers: {formatFullCurrency(totalTransfer, currency)}</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 w-full text-xs font-medium">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="color-transferRequest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SERIES_COLORS.transferRequest} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={SERIES_COLORS.transferRequest} stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="color-transfer" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SERIES_COLORS.transfer} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={SERIES_COLORS.transfer} stopOpacity={0.01} />
                </linearGradient>
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
                formatter={(value) =>
                  typeof value === "number"
                    ? formatFullCurrency(value, currency)
                    : String(value ?? "")
                }
              />

              <Area
                type="monotone"
                dataKey="transferRequest"
                stroke={SERIES_COLORS.transferRequest}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#color-transferRequest)"
                name="TRANSFER REQUEST"
                activeDot={{ r: 5, strokeWidth: 1.5, stroke: "#ffffff" }}
              />
              <Area
                type="monotone"
                dataKey="transfer"
                stroke={SERIES_COLORS.transfer}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#color-transfer)"
                name="INVENTORY TRANSFER"
                activeDot={{ r: 5, strokeWidth: 1.5, stroke: "#ffffff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
