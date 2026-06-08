import { useQuery } from "@tanstack/react-query";
import { ClipboardList, FileText, Loader2, Search, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { AnimatedModalShell } from "@/features/create-pages/create-shared/components/core/animated-modal-shell";
import { CopyFromDateFilter } from "@/features/create-pages/create-shared/components/modals/copy-from-date-filter";
import { toDisplayDate } from "@/features/create-pages/create-shared/utils/create-order.utils";
import { formatDateDisplay } from "@/features/table-pages/table-shared/components/filters/search/table-search.utils";
import { isDateRangeFilter } from "@/features/table-pages/table-shared/utils/table-filter-values";
import type { DateRangeFilter } from "@/features/table-pages/table-shared/utils/table-filter-values";
import { salesQuotationQueries } from "@/features/table-pages/sales-quotations/api/sales-quotation.queries";
import type { OpenSalesQuotationLine } from "@/features/table-pages/sales-quotations/api/sales-quotation.service";

interface PullFromSQModalProps {
  open: boolean;
  onClose: () => void;
  cardCode: string;
  onConfirm: (selectedLines: OpenSalesQuotationLine[]) => void;
  /** Doc numbers already pulled into the invoice. Shown pre-checked + locked to prevent re-pull. */
  committedDocNums?: number[];
}

interface GroupedOrder {
  DocEntry: number;
  DocNum: number;
  DocDate: string;
  DocCurr: string;
  ItemCount: number;
  TotalQty: number;
  lines: OpenSalesQuotationLine[];
}

export function PullFromSQModal({
  open,
  onClose,
  cardCode,
  onConfirm,
  committedDocNums,
}: PullFromSQModalProps) {
  const [search, setSearch] = useState("");
  const committedSet = useMemo(() => new Set(committedDocNums ?? []), [committedDocNums]);
  const [dateRange, setDateRange] = useState<DateRangeFilter>({});
  const [selectedDocNums, setSelectedDocNums] = useState<Set<number>>(new Set());

  const [hoveredOrder, setHoveredOrder] = useState<GroupedOrder | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRowMouseEnter = useCallback((order: GroupedOrder) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoveredOrder(order);
    }, 200);
  }, []);

  const handleRowMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const dateFilterLabel = useMemo(() => {
    const applied = isDateRangeFilter(dateRange) ? dateRange : {};
    let lbl = "Filter by date";
    if (applied.from && applied.to) {
      lbl = `${formatDateDisplay(applied.from)} - ${formatDateDisplay(applied.to)}`;
    } else if (applied.from) {
      lbl = `From ${formatDateDisplay(applied.from)}`;
    } else if (applied.to) {
      lbl = `Until ${formatDateDisplay(applied.to)}`;
    }
    return lbl;
  }, [dateRange]);

  const selectedRange = useMemo((): { from?: Date; to?: Date } => {
    const r: { from?: Date; to?: Date } = {};
    if (dateRange.from) r.from = new Date(`${dateRange.from}T00:00:00`);
    if (dateRange.to) r.to = new Date(`${dateRange.to}T00:00:00`);
    return r;
  }, [dateRange]);

  const { data, isLoading, isError, error } = useQuery({
    ...salesQuotationQueries.openLines(cardCode),
    enabled: open && !!cardCode,
  });

  const lines = useMemo(() => data?.data ?? [], [data]);

  const groupedOrders = useMemo(() => {
    const map = new Map<number, GroupedOrder>();

    lines.forEach((line) => {
      if (!map.has(line.DocNum)) {
        map.set(line.DocNum, {
          DocCurr: line.DocCurr,
          DocDate: line.DocDate,
          DocEntry: line.DocEntry,
          DocNum: line.DocNum,
          ItemCount: 0,
          TotalQty: 0,
          lines: [],
        });
      }
      const order = map.get(line.DocNum)!;
      order.ItemCount++;
      order.TotalQty += line.OpenQty;
      order.lines.push(line);
    });

    return [...map.values()].toSorted(
      (a, b) => b.DocDate.localeCompare(a.DocDate) || b.DocNum - a.DocNum,
    );
  }, [lines]);

  const filteredOrders = useMemo(() => {
    const term = search.toLowerCase().trim();
    let result = groupedOrders;

    if (dateRange.from || dateRange.to) {
      result = result.filter((order) => {
        const d = new Date(order.DocDate);
        d.setHours(0, 0, 0, 0);
        if (dateRange.from) {
          const from = new Date(dateRange.from);
          from.setHours(0, 0, 0, 0);
          if (d < from) return false;
        }
        if (dateRange.to) {
          const to = new Date(dateRange.to);
          to.setHours(0, 0, 0, 0);
          if (d > to) return false;
        }
        return true;
      });
    }

    if (!term) {
      return result;
    }
    return result.filter(
      (order) =>
        order.DocNum.toString().includes(term) ||
        order.lines.some(
          (l) =>
            l.ItemCode.toLowerCase().includes(term) ||
            l.ItemDescription.toLowerCase().includes(term),
        ),
    );
  }, [groupedOrders, search, dateRange]);

  const toggleSelect = (docNum: number) => {
    if (committedSet.has(docNum)) {
      return;
    }
    const next = new Set(selectedDocNums);
    if (next.has(docNum)) {
      next.delete(docNum);
    } else {
      next.add(docNum);
    }
    setSelectedDocNums(next);
  };

  const toggleSelectAll = () => {
    const selectableOrders = filteredOrders.filter((o) => !committedSet.has(o.DocNum));
    const allSelectableSelected = selectableOrders.every((o) => selectedDocNums.has(o.DocNum));
    if (allSelectableSelected) {
      const next = new Set(selectedDocNums);
      for (const o of selectableOrders) {
        next.delete(o.DocNum);
      }
      setSelectedDocNums(next);
    } else {
      const next = new Set(selectedDocNums);
      for (const o of selectableOrders) {
        next.add(o.DocNum);
      }
      setSelectedDocNums(next);
    }
  };

  const handleConfirm = () => {
    const selectedLines = lines.filter(
      (l) => selectedDocNums.has(l.DocNum) && !committedSet.has(l.DocNum),
    );
    onConfirm(selectedLines);
    setSelectedDocNums(new Set());
    setSearch("");
  };

  const selectableOrders = filteredOrders.filter((o) => !committedSet.has(o.DocNum));
  const isAllSelected =
    selectableOrders.length > 0 && selectableOrders.every((o) => selectedDocNums.has(o.DocNum));

  return (
    <AnimatedModalShell open={open} onClose={onClose} panelClassName="max-w-4xl">
      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Pull from Sales Quotations</h3>
            <p className="text-xs text-zinc-500">
              Select quotations to pull all their products into your invoice
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <CopyFromDateFilter
            dateFilterLabel={dateFilterLabel}
            hasDateRange={isDateRangeFilter(dateRange)}
            selectedRange={selectedRange}
            onDateSelect={(range) => setDateRange(range ?? {})}
          />
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by SQ # or Product..."
            className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-white min-h-[400px]">
          <div className="flex-1 max-h-[400px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-50 text-zinc-600">
                <tr className="border-b border-zinc-200">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      autoComplete="off"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">SQ #</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">Order Date</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">Total Items</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700 text-right">
                    Total Open Qty
                  </th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">Currency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <span className="text-zinc-500">Fetching open orders...</span>
                      </div>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-red-500">
                        <p className="font-medium">Failed to load open orders</p>
                        <p className="text-xs">
                          {(error as Error)?.message || "Something went wrong"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <p className="font-medium text-zinc-500">No open sales quotations found</p>
                        <p className="text-xs text-zinc-400">Try a different search or customer</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isSelected = selectedDocNums.has(order.DocNum);
                    const isCommitted = committedSet.has(order.DocNum);
                    return (
                      <tr
                        key={order.DocNum}
                        className={`transition ${
                          isCommitted
                            ? "opacity-60 bg-zinc-50"
                            : isSelected
                              ? "bg-blue-50/30 cursor-pointer hover:bg-zinc-50/80"
                              : "cursor-pointer hover:bg-zinc-50/80"
                        }`}
                        onClick={() => toggleSelect(order.DocNum)}
                        onMouseEnter={() => handleRowMouseEnter(order)}
                        onMouseLeave={handleRowMouseLeave}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                            checked={isSelected || isCommitted}
                            disabled={isCommitted}
                            onChange={() => toggleSelect(order.DocNum)}
                            autoComplete="off"
                          />
                        </td>
                        <td className="px-4 py-3 font-bold text-zinc-900">{order.DocNum}</td>
                        <td className="px-4 py-3 text-zinc-600">
                          {order.DocDate ? toDisplayDate(order.DocDate) : "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800">
                            {order.ItemCount} Products
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-600">
                          {order.TotalQty.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 font-medium">
                          {isCommitted ? (
                            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                              Added
                            </span>
                          ) : (
                            order.DocCurr
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Preview rail */}
          <div className="w-80 shrink-0 border-l border-zinc-100 overflow-auto bg-white">
            {hoveredOrder ? (
              <div className="flex flex-col">
                <div className="flex flex-col gap-0.5 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    <span>Sales Quotation #{hoveredOrder.DocNum}</span>
                  </div>
                  {hoveredOrder.DocDate && (
                    <div className="flex items-center gap-1.5 font-normal normal-case">
                      <span>
                        {new Date(hoveredOrder.DocDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>
                {hoveredOrder.lines.slice(0, 6).map((line, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 border-t border-zinc-100 px-4 py-2"
                  >
                    <span className="flex-1 text-[13px] font-medium leading-snug text-zinc-900">
                      {line.ItemDescription}
                    </span>
                    <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums text-blue-700">
                      {line.OpenQty}
                    </span>
                  </div>
                ))}
                {hoveredOrder.lines.length > 6 && (
                  <div className="border-t border-zinc-100 px-4 py-1.5 text-[11px] text-zinc-400">
                    +
                    <span className="font-semibold text-blue-600">
                      {hoveredOrder.lines.length - 6}
                    </span>{" "}
                    more
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center px-4 py-8 text-center">
                <p className="text-xs text-zinc-400">Hover an order to see details</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-zinc-100 pt-6">
          <div className="text-sm text-zinc-500">
            {selectedDocNums.size > 0 ? (
              <span className="font-medium text-blue-600">
                {selectedDocNums.size} Sales Quotations selected
              </span>
            ) : (
              "Select quotations to proceed"
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-6 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedDocNums.size === 0}
              className="h-10 rounded-xl bg-blue-600 px-8 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              Add Selected Orders
            </button>
          </div>
        </div>
      </div>
    </AnimatedModalShell>
  );
}
