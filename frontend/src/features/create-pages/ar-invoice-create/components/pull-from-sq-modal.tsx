import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Loader2, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AnimatedModalShell } from "@/features/create-pages/create-shared/components/core/animated-modal-shell";
import { toDisplayDate } from "@/features/create-pages/create-shared/utils/create-order.utils";
import { salesQuotationQueries } from "@/features/table-pages/sales-quotations/api/sales-quotation.queries";
import type { OpenSalesQuotationLine } from "@/features/table-pages/sales-quotations/api/sales-quotation.service";

interface PullFromSQModalProps {
  open: boolean;
  onClose: () => void;
  cardCode: string;
  onConfirm: (selectedLines: OpenSalesQuotationLine[]) => void;
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

export function PullFromSQModal({ open, onClose, cardCode, onConfirm }: PullFromSQModalProps) {
  const [search, setSearch] = useState("");
  const [selectedDocNums, setSelectedDocNums] = useState<Set<number>>(new Set());

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
    if (!term) {
      return groupedOrders;
    }
    return groupedOrders.filter(
      (order) =>
        order.DocNum.toString().includes(term) ||
        order.lines.some(
          (l) =>
            l.ItemCode.toLowerCase().includes(term) ||
            l.ItemDescription.toLowerCase().includes(term),
        ),
    );
  }, [groupedOrders, search]);

  const toggleSelect = (docNum: number) => {
    const next = new Set(selectedDocNums);
    if (next.has(docNum)) {
      next.delete(docNum);
    } else {
      next.add(docNum);
    }
    setSelectedDocNums(next);
  };

  const toggleSelectAll = () => {
    if (selectedDocNums.size === filteredOrders.length) {
      setSelectedDocNums(new Set());
    } else {
      setSelectedDocNums(new Set(filteredOrders.map((o) => o.DocNum)));
    }
  };

  const handleConfirm = () => {
    const selectedLines = lines.filter((l) => selectedDocNums.has(l.DocNum));
    onConfirm(selectedLines);
    setSelectedDocNums(new Set());
    setSearch("");
  };

  const isAllSelected = filteredOrders.length > 0 && selectedDocNums.size === filteredOrders.length;

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
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
        >
          <X className="h-5 w-5" />
        </button>
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

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="max-h-[400px] overflow-auto">
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
                    return (
                      <tr
                        key={order.DocNum}
                        className={`transition hover:bg-zinc-50/80 cursor-pointer ${isSelected ? "bg-blue-50/30" : ""}`}
                        onClick={() => toggleSelect(order.DocNum)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                            checked={isSelected}
                            onChange={() => toggleSelect(order.DocNum)}
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
                        <td className="px-4 py-3 text-zinc-500 font-medium">{order.DocCurr}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
