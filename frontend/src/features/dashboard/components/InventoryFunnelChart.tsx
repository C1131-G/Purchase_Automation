import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import type { DashboardFunnelStep } from "../utils/types";
import { formatCurrency, formatNumber } from "../utils/formatters";
import { dashboardVariants, springTransitions } from "../utils/motion";
import { ArrowRight, Box, ArrowRightLeft } from "lucide-react";

interface InventoryFunnelChartProps {
  steps: DashboardFunnelStep[] | undefined;
  currency: string;
  period?: string;
}

export function InventoryFunnelChart({ steps, currency, period }: InventoryFunnelChartProps) {
  if (!steps || steps.length < 5) return null;

  const itemMaster = (steps.find((s) => s.key === "itemMaster") || steps[0]) as DashboardFunnelStep;
  const goodsReceipt = (steps.find((s) => s.key === "goodsReceipt") ||
    steps[1]) as DashboardFunnelStep;
  const goodsIssue = (steps.find((s) => s.key === "goodsIssue") || steps[2]) as DashboardFunnelStep;
  const transferRequest = (steps.find((s) => s.key === "transferRequest") ||
    steps[3]) as DashboardFunnelStep;
  const transfer = (steps.find((s) => s.key === "transfer") || steps[4]) as DashboardFunnelStep;

  const periodLabel =
    period === "week"
      ? "This Week"
      : period === "month"
        ? "This Month"
        : period === "year"
          ? "This Year"
          : "All Time";

  // Calculate goods ratio: conversion of Receipt to Issue, or simply receipt vs issue
  const goodsRatio =
    goodsReceipt.totalValue > 0
      ? Math.round((goodsIssue.totalValue / goodsReceipt.totalValue) * 100)
      : 0;

  // Calculate transfer ratio: conversion of Request to actual Transfer
  const transferRatio =
    transferRequest.totalValue > 0
      ? Math.round((transfer.totalValue / transferRequest.totalValue) * 100)
      : 0;

  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-5 shadow-sm flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-bold text-zinc-900">Inventory Flow Lanes</h3>
        <p className="text-xs font-medium text-zinc-400">
          Grouped business flows —{" "}
          <span className="font-semibold text-blue-500">{periodLabel}</span>
        </p>
      </div>

      <motion.div
        variants={dashboardVariants.staggerChildren as Variants}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-4 flex-1 justify-between"
      >
        {/* Lane 1: Foundation (Item Master) */}
        <motion.div
          variants={dashboardVariants.fadeInScale as Variants}
          transition={springTransitions.gentle}
          className="bg-zinc-50/50 border border-zinc-100 rounded-xl p-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg shrink-0">
              <Box className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Foundation
              </span>
              <Link
                to={itemMaster.href}
                search={{ limit: 10, page: 1 }}
                viewTransition
                className="text-xs font-bold text-zinc-800 hover:text-blue-600 transition-colors"
              >
                Item Master Catalog
              </Link>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-xs font-bold text-zinc-800">
              {formatNumber(itemMaster.documentCount)} Items
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              Val: {formatCurrency(itemMaster.totalValue, currency, true)}
            </span>
          </div>
        </motion.div>

        {/* Lane 2: Goods Flow (Receipt + Issue) */}
        <motion.div
          variants={dashboardVariants.fadeInScale as Variants}
          transition={springTransitions.gentle}
          className="border border-zinc-150 rounded-xl p-3 flex flex-col gap-2.5 bg-white relative overflow-hidden"
        >
          {/* Top banner */}
          <div className="flex items-center justify-between border-b border-zinc-50 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Goods Flow
            </span>
            <div className="text-[10px] font-semibold bg-zinc-50 text-zinc-600 border border-zinc-100 px-2 py-0.5 rounded-full">
              Issue/Receipt: {goodsRatio}%
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            {/* Goods Receipt */}
            <Link
              to={goodsReceipt.href}
              search={{ limit: 10, page: 1 }}
              viewTransition
              className="group flex flex-col gap-0.5"
            >
              <span className="text-xs font-semibold text-zinc-500 group-hover:text-zinc-800 transition-colors">
                Goods Receipt
              </span>
              <span className="text-xs font-bold text-zinc-800 block">
                {formatCurrency(goodsReceipt.totalValue, currency, true)}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                {formatNumber(goodsReceipt.documentCount)} docs
              </span>
            </Link>

            {/* Goods Issue */}
            <Link
              to={goodsIssue.href}
              search={{ limit: 10, page: 1 }}
              viewTransition
              className="group flex flex-col gap-0.5 text-right"
            >
              <span className="text-xs font-semibold text-zinc-500 group-hover:text-zinc-800 transition-colors">
                Goods Issue
              </span>
              <span className="text-xs font-bold text-zinc-800 block">
                {formatCurrency(goodsIssue.totalValue, currency, true)}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                {formatNumber(goodsIssue.documentCount)} docs
              </span>
            </Link>
          </div>
        </motion.div>

        {/* Lane 3: Transfer Flow (Request + Transfer) */}
        <motion.div
          variants={dashboardVariants.fadeInScale as Variants}
          transition={springTransitions.gentle}
          className="border border-zinc-150 rounded-xl p-3 flex flex-col gap-2 bg-white relative overflow-hidden"
        >
          {/* Top banner */}
          <div className="flex items-center justify-between border-b border-zinc-50 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Transfer Flow
            </span>
            <div className="text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ArrowRight className="size-2.5 text-blue-500" />
              Transfer Rate: {transferRatio}%
            </div>
          </div>

          <div className="flex items-center justify-between mt-0.5">
            {/* Transfer Request */}
            <Link
              to={transferRequest.href}
              search={{ limit: 10, page: 1 }}
              viewTransition
              className="group flex flex-col gap-0.5 max-w-[45%]"
            >
              <span className="text-xs font-semibold text-zinc-500 group-hover:text-zinc-800 transition-colors truncate">
                Request
              </span>
              <span className="text-xs font-bold text-zinc-800 block truncate">
                {formatCurrency(transferRequest.totalValue, currency, true)}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                {formatNumber(transferRequest.documentCount)} docs
              </span>
            </Link>

            {/* Connector */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <ArrowRightLeft className="size-3.5 text-zinc-300 animate-pulse" />
            </div>

            {/* Inventory Transfer */}
            <Link
              to={transfer.href}
              search={{ limit: 10, page: 1 }}
              viewTransition
              className="group flex flex-col gap-0.5 text-right max-w-[45%]"
            >
              <span className="text-xs font-semibold text-zinc-500 group-hover:text-zinc-800 transition-colors truncate">
                Transfer
              </span>
              <span className="text-xs font-bold text-zinc-800 block truncate">
                {formatCurrency(transfer.totalValue, currency, true)}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                {formatNumber(transfer.documentCount)} docs
              </span>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
