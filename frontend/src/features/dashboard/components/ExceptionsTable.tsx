import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
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
};

export function ExceptionsTable({ groups, currency, color }: ExceptionsTableProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (!groups || groups.length === 0) return null;

  const activeGroup = groups[activeTab] ?? groups[0];
  if (!activeGroup) return null;

  const highlightBorder = {
    blue: "hover:border-blue-400 focus-within:ring-blue-100",
    indigo: "hover:border-indigo-400 focus-within:ring-indigo-100",
  };

  const badgeColor = {
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    indigo: "text-indigo-700 bg-indigo-50 border-indigo-100",
  };

  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
          <AlertCircle className="size-4.5 text-zinc-400" />
          Actionable Exceptions & Aging
        </h3>
        <p className="text-xs text-zinc-400 font-medium">
          Identified bottlenecks and anomalies requiring attention or approval
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-zinc-100/75 p-1 rounded-xl border border-zinc-200/40 shrink-0">
        {groups.map((group, idx) => {
          const isActive = idx === activeTab;
          return (
            <button
              key={group.key}
              onClick={() => setActiveTab(idx)}
              className={`flex-1 min-w-[140px] text-center rounded-lg px-3 py-1.5 text-xs font-semibold tracking-tight transition-all cursor-pointer select-none ${
                isActive
                  ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/40"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {group.title}
            </button>
          );
        })}
      </div>

      {/* Exception list */}
      <div className="flex flex-col gap-3 min-h-[300px]">
        <AnimatePresence mode="wait">
          {activeGroup.items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-zinc-400 py-12"
            >
              <AlertCircle className="size-8 text-zinc-300 mb-2" />
              <p className="text-xs font-medium">Clear! No active exceptions in this group.</p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {activeGroup.items.map((item) => (
                <motion.div
                  key={`${item.module}-${item.docNum}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className={`bg-zinc-50/40 border border-zinc-200/60 rounded-xl p-4 hover:bg-white transition-all relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group focus-within:ring-4 ${highlightBorder[color]}`}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeColor[color]}`}
                      >
                        {MODULE_LABELS[item.module] || item.module} #{item.docNum}
                      </span>
                      <span className="text-xs text-zinc-400 font-semibold flex items-center gap-1">
                        <Calendar className="size-3" />
                        {dayjs(item.docDate).format("MMM D, YYYY")}
                      </span>
                    </div>

                    {item.cardName && (
                      <span className="text-xs font-bold text-zinc-900 leading-snug">
                        {item.cardName}
                        <span className="text-[10px] font-semibold text-zinc-400 ml-1.5">
                          ({item.cardCode})
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs font-bold text-zinc-950">
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
                    className="absolute inset-0 rounded-xl focus:outline-none"
                    aria-label={`Inspect document #${item.docNum}`}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
