import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { DashboardExceptionGroup } from "../utils/types";
import { formatCurrency } from "../utils/formatters";
import { AlertCircle, Calendar, ArrowRight } from "lucide-react";
import dayjs from "dayjs";

interface ExceptionsTableProps {
  groups: DashboardExceptionGroup[] | undefined;
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
  transfer: "Inventory Transfer",
};

const SHORT_TAB_LABELS: Record<string, string> = {
  "open-purchase-quotations": "Open Quotations",
  "open-sales-quotations": "Open Quotations",
  "open-purchase-orders": "Open Orders",
  "open-sales-orders": "Open Orders",
  "grpo-awaiting-ap-invoice": "Pending Invoices",
  "delivery-awaiting-ar-invoice": "Pending Invoices",
  "ap-invoice-awaiting-payment": "Pending Payments",
  "ar-invoice-awaiting-payment": "Pending Payments",
  "ar-invoice-awaiting-collection": "Pending Payments",
  "largest-open-value": "Largest Value",
  "recent-credit-notes": "Recent Memos",
  "open-transfer-requests": "Open Requests",
  "recent-goods-receipts": "Recent Receipts",
  "recent-goods-issues": "Recent Issues",
  "recent-transfers": "Recent Transfers",
};

export function ExceptionsTable({ groups, currency, color }: ExceptionsTableProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (!groups || groups.length === 0) return null;

  // Filter out "largest-open-value" and "largest-open-sales" to include "recent-credit-notes" (Recent Memos) while capping to exactly 5 tabs
  const displayGroups = groups
    .filter((group) => group.key !== "largest-open-value" && group.key !== "largest-open-sales")
    .slice(0, 5);

  const activeGroup = displayGroups[activeTab] ?? displayGroups[0];
  if (!activeGroup) return null;

  const badgeColor = {
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    indigo: "text-indigo-700 bg-indigo-50 border-indigo-100",
  };

  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
      {/* Header and Title inline with Tabs - Matched to PartnerTable style */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-zinc-100 pb-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <AlertCircle className="size-5 text-zinc-400 shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <h3 className="text-base font-bold text-zinc-950 leading-tight whitespace-nowrap">
              Actionable Exceptions & Aging
            </h3>
            <p className="text-xs text-zinc-400 font-medium whitespace-nowrap">
              Identified bottlenecks and anomalies requiring attention or approval
            </p>
          </div>
        </div>

        {/* Compact Tab Switcher - Capsule Pills matched to PartnerTable style */}
        <div className="flex bg-zinc-100/60 p-1 rounded-2xl border border-zinc-200/40 gap-1 shrink-0 max-w-full overflow-hidden">
          {displayGroups.map((group, idx) => {
            const isActive = idx === activeTab;
            return (
              <button
                key={group.key}
                onClick={() => setActiveTab(idx)}
                className={`text-center rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-tight border border-transparent transition-colors duration-150 cursor-pointer whitespace-nowrap select-none ${
                  isActive
                    ? "bg-white text-zinc-950 shadow-[0_1.5px_4px_rgba(0,0,0,0.06)] border border-zinc-200/50"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {SHORT_TAB_LABELS[group.key] || group.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Exception list - fixed to 5-value height, no shrink or overflow scroll */}
      <div className="min-h-[400px] flex flex-col justify-start">
        {activeGroup.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 min-h-[400px]">
            <AlertCircle className="size-8 text-zinc-300 mb-2" />
            <p className="text-xs font-medium">Clear! No active exceptions in this group.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {activeGroup.items.map((item) => (
              <div
                key={`${item.module}-${item.docNum}`}
                className={`bg-zinc-50/35 border-t border-r border-b border-zinc-200/50 border-l-[3px] rounded-r-xl transition-all relative flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-4 group focus-within:ring-4 ${
                  color === "blue"
                    ? "border-l-blue-500/80 hover:border-l-blue-600 focus-within:ring-blue-100"
                    : "border-l-indigo-500/80 hover:border-l-indigo-600 focus-within:ring-indigo-100"
                } hover:bg-zinc-50/80`}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeColor[color]}`}
                    >
                      {MODULE_LABELS[item.module] || item.module} {item.docNum}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1">
                      <Calendar className="size-3" />
                      {dayjs(item.docDate).format("MMM D, YYYY")}
                    </span>
                  </div>

                  {item.cardName && (
                    <span
                      className="text-xs font-bold text-zinc-950 truncate"
                      title={item.cardName}
                    >
                      {item.cardName}
                      <span className="text-[10px] font-semibold text-zinc-400 ml-1.5">
                        ({item.cardCode})
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs font-extrabold text-zinc-950">
                      {formatCurrency(item.openValue, currency, false)} Open
                    </span>
                    <span className="text-[10px] text-zinc-400 font-semibold">
                      Total {formatCurrency(item.docTotal, currency, true)}
                    </span>
                  </div>

                  <div className="p-1.5 bg-zinc-100 rounded-lg text-zinc-400 group-hover:bg-zinc-950 group-hover:text-white transition-colors duration-250 border border-zinc-200/60 group-hover:border-transparent">
                    <ArrowRight className="size-3.5 stroke-[2.5]" />
                  </div>
                </div>

                {/* Clickable Overlay */}
                <Link
                  to={item.href}
                  viewTransition
                  className="absolute inset-0 rounded-xl focus:outline-none"
                  aria-label={`Inspect document ${item.docNum}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
