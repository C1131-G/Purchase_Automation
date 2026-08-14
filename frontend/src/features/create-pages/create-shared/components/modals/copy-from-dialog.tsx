import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, ClipboardList, FileText, Loader2, StickyNote } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apInvoiceAPI } from "@/features/table-pages/ap-invoices/api/ap-invoice.service";
import type { APInvoiceDetail } from "@/features/table-pages/ap-invoices/api/ap-invoice.service";
import type { GRPODetail } from "@/features/table-pages/grpo/api/grpo.service";
import { grpoAPI } from "@/features/table-pages/grpo/api/grpo.service";
import type { PurchaseOrderDetail } from "@/features/table-pages/purchase-orders/api/purchase-order.service";
import { purchaseOrderAPI } from "@/features/table-pages/purchase-orders/api/purchase-order.service";
import {
  purchaseQuotationAPI,
  type PurchaseQuotationDetail,
} from "@/features/table-pages/purchase-quotations/api/purchase-quotation.service";
import {
  salesQuotationAPI,
  type SalesQuotationDetail,
} from "@/features/table-pages/sales-quotations/api/sales-quotation.service";
import { formatDateDisplay } from "@/features/table-pages/table-shared/components/filters/search/table-search.utils";
import { isDateRangeFilter } from "@/features/table-pages/table-shared/utils/table-filter-values";
import type { DateRangeFilter } from "@/features/table-pages/table-shared/utils/table-filter-values";
import { CopyFromDateFilter } from "./copy-from-date-filter";

export type SourceDocType =
  | "PurchaseOrder"
  | "GoodsReceiptPO"
  | "APInvoice"
  | "PurchaseQuotation"
  | "SalesQuotation";

const VISIBLE_LINES = 6;

const BROWSE_INCREMENT = 10;
const BROWSE_CAP = 100;
const SEARCH_LIMIT = 100;
/** Copy-from list row: py-2.5 + single-line content. */
const DOC_ROW_ESTIMATE_PX = 44;
const DOC_ROW_OVERSCAN = 6;

interface CopyFromDialogProps {
  open: boolean;
  onClose: () => void;
  vendorCode: string;
  vendorName: string;
  sourceDocType: SourceDocType;
  onSelectDocuments: (selected: { docNum: string; docType: SourceDocType }[]) => void;
  includeClosed?: boolean;
  /** Doc numbers already committed from a previous copy session. These are shown pre-checked
   * and cannot be deselected ΓÇö prevents duplicates across re-opens of the dialog. */
  committedDocNums?: string[];
}

interface DocumentOption {
  code: string;
  name: string;
  docType: SourceDocType;
  docEntry?: number;
  docDate?: string;
  docTotal?: number;
}

interface CopyFromDocumentSummary {
  DocNum: string | number;
  DocDate?: string | null;
  DocEntry?: number;
  DocStatus?: string;
  id?: number;
}

interface DocDetailCache {
  lines: { itemName: string; openQty: number }[];
  totalOpenQty: number;
  docDate: string | undefined;
  docTotal: number | undefined;
  docCurrency: string | undefined;
}

const SKELETON_ROW_KEYS = ["slot-1", "slot-2", "slot-3", "slot-4", "slot-5", "slot-6"] as const;

const DOC_TYPE_LABELS: Record<SourceDocType, string> = {
  APInvoice: "AP Invoice",
  GoodsReceiptPO: "GRPO",
  PurchaseOrder: "PO",
  PurchaseQuotation: "Quotation",
  SalesQuotation: "Quotation",
};

const DOC_TYPE_ICONS: Record<SourceDocType, React.ReactNode> = {
  APInvoice: <FileText className="h-4 w-4" />,
  GoodsReceiptPO: <StickyNote className="h-4 w-4" />,
  PurchaseOrder: <FileText className="h-4 w-4" />,
  PurchaseQuotation: <FileText className="h-4 w-4" />,
  SalesQuotation: <ClipboardList className="h-4 w-4" />,
};

function detailCacheKey(docType: SourceDocType, docCode: string): string {
  return `${docType}:${docCode}`;
}

function computeDetail(
  _docType: SourceDocType,
  data:
    | PurchaseOrderDetail
    | GRPODetail
    | APInvoiceDetail
    | PurchaseQuotationDetail
    | SalesQuotationDetail,
): DocDetailCache {
  const lines = data.DocumentLines ?? [];
  const result: DocDetailCache = {
    docCurrency: data.DocCurr,
    docDate: data.DocDate,
    docTotal:
      typeof (data as any).DocTotal === "number"
        ? (data as any).DocTotal
        : Number((data as any).DocTotal) || 0,
    lines: [],
    totalOpenQty: 0,
  };
  for (const line of lines) {
    const openQty =
      (line as { OpenQty?: number }).OpenQty ??
      (line as { RemainingOpenQuantity?: number }).RemainingOpenQuantity ??
      (line as { Quantity?: number }).Quantity ??
      0;
    result.totalOpenQty += openQty;
    result.lines.push({
      itemName:
        (line as { ItemDescription?: string }).ItemDescription ??
        (line as { ItemCode?: string }).ItemCode ??
        "Unknown",
      openQty,
    });
  }
  return result;
}

export function CopyFromDialog({
  open,
  onClose,
  vendorCode,
  vendorName,
  sourceDocType,
  onSelectDocuments,
  includeClosed,
  committedDocNums,
}: CopyFromDialogProps) {
  const committedSet = useMemo(
    () => new Set(committedDocNums ?? []),
    // Stable key: only rebuild when the committed list actually changes content
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(committedDocNums)],
  );
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeFilter>({});
  const [documents, setDocuments] = useState<DocumentOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);

  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  // Hover preview state
  const [hoveredDoc, setHoveredDoc] = useState<DocumentOption | null>(null);
  const [hoverDetail, setHoverDetail] = useState<DocDetailCache | null>(null);
  const [hoverDetailLoading, setHoverDetailLoading] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detailCacheRef = useRef<Map<string, DocDetailCache>>(new Map());
  const detailLoadingRef = useRef<Set<string>>(new Set());

  const label = DOC_TYPE_LABELS[sourceDocType] ?? "Document";
  const isSearching = search.trim().length > 0;

  // Reset state when dialog opens ΓÇö seed with already-committed docs so they appear pre-checked.
  useEffect(() => {
    if (open) {
      setSearch("");
      setDateRange({});
      setSelectedDocs(new Set(committedDocNums ?? []));
      setDocuments([]);
      setLoadedCount(0);
      setHasMore(false);
      setError(null);
      detailCacheRef.current.clear();
      detailLoadingRef.current.clear();
      pageRef.current = 1;
      setHoveredDoc(null);
      setHoverDetail(null);
      setHoverDetailLoading(false);
    }
    // committedDocNums intentionally excluded ΓÇö we only seed on open, not on every prop change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sourceDocType]);

  // Date filter label
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

  // Selected range for calendar
  const selectedRange = useMemo((): { from?: Date; to?: Date } => {
    const r: { from?: Date; to?: Date } = {};
    if (dateRange.from) {
      r.from = new Date(`${dateRange.from}T00:00:00`);
    }
    if (dateRange.to) {
      r.to = new Date(`${dateRange.to}T00:00:00`);
    }
    return r;
  }, [dateRange]);

  // Debounced search
  const searchQuery = useDebouncedValue(search, 300);

  // Reset pagination when search changes
  useEffect(() => {
    if (!open) {
      return;
    }
    pageRef.current = 1;
  }, [searchQuery, open]);

  const fetchDocuments = useCallback(
    async (isLoadMore = false) => {
      if (!vendorCode) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const query = searchQuery.trim();

        if (!query && !isLoadMore) {
          pageRef.current = 1;
        }

        const page = isLoadMore && !query ? pageRef.current : 1;
        const limit = query ? SEARCH_LIMIT : BROWSE_INCREMENT;

        let result;
        if (sourceDocType === "PurchaseOrder") {
          const params: Record<string, unknown> = {
            CardCode: vendorCode,
            limit,
          };
          if (query) {
            params.DocNum = query;
          }
          if (!query && isLoadMore) {
            params.page = page;
          }
          if (dateRange.from) {
            params.DocDateStart = dateRange.from;
          }
          if (dateRange.to) {
            params.DocDateEnd = dateRange.to;
          }
          result = await purchaseOrderAPI.getPurchaseOrders(params);
        } else if (sourceDocType === "GoodsReceiptPO") {
          const params: Record<string, unknown> = {
            CardCode: vendorCode,
            limit,
          };
          if (query) {
            params.DocNum = query;
          }
          if (!query && isLoadMore) {
            params.page = page;
          }
          if (dateRange.from) {
            params.DocDateStart = dateRange.from;
          }
          if (dateRange.to) {
            params.DocDateEnd = dateRange.to;
          }
          result = await grpoAPI.getGRPOs(params);
        } else if (sourceDocType === "PurchaseQuotation") {
          const params: Record<string, unknown> = {
            CardCode: vendorCode,
            limit,
            rfqSubmittedOnly: true,
          };
          if (query) {
            params.DocNum = query;
          }
          if (!query && isLoadMore) {
            params.page = page;
          }
          if (dateRange.from) {
            params.DocDateStart = dateRange.from;
          }
          if (dateRange.to) {
            params.DocDateEnd = dateRange.to;
          }
          result = await purchaseQuotationAPI.getPurchaseQuotations(params);
        } else if (sourceDocType === "SalesQuotation") {
          const params: Record<string, unknown> = {
            CardCode: vendorCode,
            limit,
          };
          if (query) {
            params.DocNum = query;
          }
          if (!query && isLoadMore) {
            params.page = page;
          }
          if (dateRange.from) {
            params.DocDateStart = dateRange.from;
          }
          if (dateRange.to) {
            params.DocDateEnd = dateRange.to;
          }
          result = await salesQuotationAPI.getSalesQuotations(params);
        } else {
          const params: Record<string, unknown> = {
            CardCode: vendorCode,
            limit,
          };
          if (query) {
            params.DocNum = query;
          }
          if (!query && isLoadMore) {
            params.page = page;
          }
          if (dateRange.from) {
            params.DocDateStart = dateRange.from;
          }
          if (dateRange.to) {
            params.DocDateEnd = dateRange.to;
          }
          result = await apInvoiceAPI.getAPInvoices(params);
        }

        const isAllowedStatus = includeClosed
          ? () => true
          : (doc: CopyFromDocumentSummary) => {
              const status = String(doc.DocStatus ?? "").trim();
              return (
                status === "Open" ||
                status === "O" ||
                status === "Partial" ||
                status === "bost_Open"
              );
            };

        const sourceDocs = (result.data ?? []) as CopyFromDocumentSummary[];
        const newDocs = sourceDocs.filter(isAllowedStatus).map(
          (doc) =>
            ({
              code: String(doc.DocNum),
              docDate: doc.DocDate ? new Date(doc.DocDate).toLocaleDateString("en-GB") : "",
              docEntry: doc.DocEntry ?? doc.id,
              docType: sourceDocType,
              name: `${label} - ${doc.DocNum}`,
            }) as DocumentOption,
        );

        if (query) {
          // Search mode: replace list, no pagination cap
          setDocuments(newDocs);
          setHasMore(false);
          setLoadedCount(newDocs.length);
        } else if (isLoadMore) {
          setDocuments((prev) => [...prev, ...newDocs]);
          pageRef.current = page + 1;
          setLoadedCount((prev) => {
            const newCount = prev + newDocs.length;
            setHasMore(newDocs.length === limit && newCount < BROWSE_CAP);
            return newCount;
          });
        } else {
          setDocuments(newDocs);
          setLoadedCount(newDocs.length);
          setHasMore(newDocs.length === limit && newDocs.length < BROWSE_CAP);
        }
      } catch {
        setError("Failed to load documents. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [sourceDocType, vendorCode, label, searchQuery, dateRange, includeClosed],
  );

  // Reset + fetch when source type, vendor, or search changes
  useEffect(() => {
    if (!open) {
      return;
    }
    setDocuments([]);
    setLoadedCount(0);
    setHasMore(false);
    setError(null);
    if (vendorCode) {
      void fetchDocuments(false);
    }
  }, [open, sourceDocType, vendorCode, fetchDocuments, searchQuery]);

  // Infinite scroll for browse mode
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const threshold = 32;
      const reachedEnd =
        container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
      if (reachedEnd && hasMore && !isLoading && !isSearching) {
        void fetchDocuments(true);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoading, isSearching, fetchDocuments]);

  const handleToggleDocument = (docCode: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docCode)) {
        next.delete(docCode);
      } else {
        next.add(docCode);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = Array.from(selectedDocs).map((docNum) => ({
      docNum,
      docType: sourceDocType,
    }));
    onSelectDocuments(selected);
    handleCancel();
  };

  const handleCancel = () => {
    onClose();
  };

  const fetchDetailForDoc = useCallback(async (doc: DocumentOption) => {
    const key = detailCacheKey(doc.docType, doc.code);

    if (detailCacheRef.current.has(key)) {
      setHoverDetail(detailCacheRef.current.get(key)!);
      setHoverDetailLoading(false);
      return;
    }

    if (detailLoadingRef.current.has(key)) {
      return;
    }
    detailLoadingRef.current.add(key);
    setHoverDetailLoading(true);

    try {
      let data:
        | PurchaseOrderDetail
        | GRPODetail
        | APInvoiceDetail
        | PurchaseQuotationDetail
        | SalesQuotationDetail
        | null = null;
      if (doc.docType === "PurchaseOrder") {
        const res = await purchaseOrderAPI.getPurchaseOrderByDocNum(doc.code);
        ({ data } = res);
      } else if (doc.docType === "GoodsReceiptPO") {
        if (doc.docEntry) {
          const res = await grpoAPI.getGRPOById(doc.docEntry);
          ({ data } = res);
        }
      } else if (doc.docType === "PurchaseQuotation") {
        const res = await purchaseQuotationAPI.getPurchaseQuotationByDocNum(doc.code);
        ({ data } = res);
      } else if (doc.docType === "SalesQuotation") {
        const res = await salesQuotationAPI.getSalesQuotationByDocNum(doc.code);
        ({ data } = res);
      } else {
        const res = await apInvoiceAPI.getAPInvoice(doc.code);
        ({ data } = res);
      }

      if (data) {
        const detail = computeDetail(doc.docType, data);
        detailCacheRef.current.set(key, detail);
        setHoverDetail(detail);
      }
    } catch {
      // Silently fail
    } finally {
      detailLoadingRef.current.delete(key);
      setHoverDetailLoading(false);
    }
  }, []);

  const handleRowMouseEnter = useCallback(
    (doc: DocumentOption) => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      hoverTimerRef.current = setTimeout(() => {
        setHoveredDoc(doc);
        setHoverDetail(null);
        setHoverDetailLoading(false);
        void fetchDetailForDoc(doc);
      }, 200);
    },
    [fetchDetailForDoc],
  );

  const handleRowMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    // Keep hover state visible until next hover
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: documents.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => DOC_ROW_ESTIMATE_PX,
    overscan: DOC_ROW_OVERSCAN,
    getItemKey: (index) => documents[index]?.code ?? index,
  });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-ink-900/50 p-4 pt-20">
      <div className="flex h-full max-h-[calc(100svh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-linen-200 bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-linen-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">{DOC_TYPE_ICONS[sourceDocType]}</span>
            <div>
              <h3 className="text-sm font-semibold text-ink-900">Select {label}</h3>
              <p className="text-xs text-neutral-500">Open documents from {vendorName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedDocs.size > 0 && (
              <button
                onClick={handleConfirm}
                className="flex h-8 items-center rounded-full border border-teal-600 bg-teal-600 px-4 text-xs font-medium text-surface transition hover:bg-teal-700"
              >
                Confirm ({selectedDocs.size})
              </button>
            )}
            <CopyFromDateFilter
              dateFilterLabel={dateFilterLabel}
              hasDateRange={isDateRangeFilter(dateRange)}
              selectedRange={selectedRange}
              onDateSelect={(range) => setDateRange(range ?? {})}
            />
            <button
              type="button"
              onClick={handleCancel}
              className="flex h-8 items-center rounded-full border border-linen-200 bg-surface px-4 text-xs font-medium text-ink-900 transition hover:bg-linen-50"
            >
              Close
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="shrink-0 border-b border-linen-100 px-4 py-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by document number or name"
              autoComplete="off"
              className="h-10 w-full rounded-xl border border-linen-200 bg-field-silver px-3 text-sm outline-none transition focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
            />
          </div>
        </div>

        {/* Content: split list + preview rail */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Document list */}
            <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
              {isLoading && documents.length === 0 ? (
                <div className="flex flex-col p-2">
                  {SKELETON_ROW_KEYS.map((slot) => (
                    <div
                      key={`doc-skeleton-${slot}`}
                      className="flex items-center gap-3 border-t border-linen-100 px-4 py-3"
                    >
                      <div className="h-5 w-5 animate-pulse rounded-md bg-linen-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-linen-100" />
                        <div className="h-3 w-1/4 animate-pulse rounded bg-linen-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error && documents.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-linen-100 bg-linen-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-neutral-500">{error}</p>
                  <button
                    onClick={() => void fetchDocuments(false)}
                    className="flex h-8 items-center rounded-full border border-linen-200 bg-surface px-4 text-xs font-medium text-ink-900 transition hover:bg-linen-50"
                  >
                    Retry
                  </button>
                </div>
              ) : documents.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center gap-1 rounded-xl border border-linen-100 bg-linen-50 px-4 py-8 text-center">
                  <p className="text-xs font-medium text-neutral-500">
                    {isSearching
                      ? `No documents match "${search.trim()}".`
                      : includeClosed
                        ? "No documents found for this vendor."
                        : "No Open documents found for this vendor."}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      position: "relative",
                      width: "100%",
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const doc = documents[virtualRow.index];
                      if (!doc) {
                        return null;
                      }
                      const isSelected = selectedDocs.has(doc.code);
                      const isCommitted = committedSet.has(doc.code);

                      return (
                        <button
                          key={doc.code}
                          type="button"
                          onClick={() => handleToggleDocument(doc.code)}
                          onMouseEnter={() => handleRowMouseEnter(doc)}
                          onMouseLeave={handleRowMouseLeave}
                          style={{
                            height: `${virtualRow.size}px`,
                            left: 0,
                            position: "absolute",
                            top: 0,
                            transform: `translateY(${virtualRow.start}px)`,
                            width: "100%",
                          }}
                          className={`relative flex w-full items-center border-t border-linen-100 px-4 text-left transition cursor-pointer ${
                            isSelected ? "bg-teal-50" : "bg-surface hover:bg-linen-50"
                          }`}
                        >
                          <span className="w-[160px] shrink-0 flex items-center gap-2">
                            <div
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                                isSelected
                                  ? "border-teal-500 bg-teal-500 text-surface"
                                  : "border-linen-200 bg-surface"
                              }`}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            </div>
                            <span className="text-sm font-medium text-ink-900 truncate">
                              {doc.code}
                            </span>
                          </span>
                          <span className="w-28 shrink-0 pl-3 text-sm text-neutral-500 tabular-nums">
                            {doc.docDate || "—"}
                          </span>
                          {isCommitted && isSelected && (
                            <span className="ml-auto shrink-0 rounded-full bg-linen-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                              Added
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isLoading && documents.length > 0 && (
                    <div className="flex items-center justify-center gap-2 border-t border-linen-100 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                      <p className="text-xs text-neutral-500">Loading more...</p>
                    </div>
                  )}
                  {!hasMore && documents.length > 0 && !isSearching && (
                    <div className="border-t border-linen-100 px-4 py-2 text-center text-xs text-neutral-500">
                      {loadedCount} document{loadedCount !== 1 ? "s" : ""} loaded
                      {loadedCount >= BROWSE_CAP && " (browse cap reached)"}
                    </div>
                  )}
                  {isSearching && documents.length > 0 && (
                    <div className="border-t border-linen-100 px-4 py-2 text-center text-xs text-neutral-500">
                      {documents.length} result
                      {documents.length !== 1 ? "s" : ""} found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Preview rail */}
            <div className="w-80 shrink-0 border-l border-linen-100 overflow-auto">
              {hoverDetailLoading ? (
                <div className="flex flex-col gap-1.5 p-4 pt-3">
                  <div className="h-3.5 w-2/5 animate-pulse rounded bg-linen-100" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-3 flex-1 animate-pulse rounded bg-linen-100" />
                      <div className="h-3 w-10 animate-pulse rounded bg-linen-100" />
                    </div>
                  ))}
                </div>
              ) : hoverDetail ? (
                <div className="flex flex-col">
                  <div className="flex flex-col gap-0.5 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      {DOC_TYPE_ICONS[hoveredDoc?.docType ?? sourceDocType]}
                      <span>
                        {hoveredDoc ? DOC_TYPE_LABELS[hoveredDoc.docType] : label} #
                        {hoveredDoc?.code ?? ""}
                      </span>
                    </div>
                    {hoverDetail.docDate && (
                      <div className="flex items-center gap-1.5 font-normal normal-case">
                        <span>
                          {new Date(hoverDetail.docDate).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          })}
                        </span>
                        <span>┬╖</span>
                        <span className="font-semibold text-teal-700">
                          {hoverDetail.docTotal?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          {hoverDetail.docCurrency}
                        </span>
                      </div>
                    )}
                  </div>
                  {hoverDetail.lines.slice(0, VISIBLE_LINES).map((line, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-3 border-t border-linen-100 px-4 py-2"
                    >
                      <span className="flex-1 text-[13px] font-medium leading-snug text-ink-900">
                        {line.itemName}
                      </span>
                      <span className="shrink-0 rounded bg-teal-50 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums text-teal-700">
                        {line.openQty}
                      </span>
                    </div>
                  ))}
                  {hoverDetail.lines.length > VISIBLE_LINES && (
                    <div className="border-t border-linen-100 px-4 py-1.5 text-[11px] text-neutral-400">
                      +
                      <span className="font-semibold text-teal-600">
                        {hoverDetail.lines.length - VISIBLE_LINES}
                      </span>{" "}
                      more
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center px-4 py-8 text-center">
                  <p className="text-xs text-neutral-400">Hover a document to see details</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between border-t border-linen-100 bg-linen-50 px-4 py-2">
          <span className="text-xs text-neutral-500">
            {selectedDocs.size - committedSet.size > 0
              ? `${selectedDocs.size - committedSet.size} new`
              : "0"}{" "}
            of {documents.length} document
            {documents.length !== 1 ? "s" : ""} selected
            {committedSet.size > 0 && (
              <span className="ml-1.5 text-neutral-400">┬╖ {committedSet.size} already added</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
