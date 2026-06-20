import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";
import type { ComponentProps } from "react";

import { useLookupToast } from "@/components/lookup/hooks/use-lookup-toast";
import { LookupErrorState } from "@/components/lookup/lookup-error-state";
import type { LookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import { AnimatedModalShell } from "@/features/create-pages/create-shared/components/core/animated-modal-shell";

export type LookupPopupMode =
  | "vendor-name"
  | "vendor-code"
  | "customer-name"
  | "customer-code"
  | "warehouse"
  | "sales-employee";

const MODE_CONFIG: Record<
  LookupPopupMode,
  { title: string; placeholder: string; entity: string; field: string }
> = {
  "customer-code": {
    entity: "Customer",
    field: "Code",
    placeholder: "Search customer code...",
    title: "Select Customer by Code",
  },
  "customer-name": {
    entity: "Customer",
    field: "Name",
    placeholder: "Search customer name...",
    title: "Select Customer by Name",
  },
  "sales-employee": {
    entity: "Buyer",
    field: "Code/Name",
    placeholder: "Search buyer code or name...",
    title: "Select Buyer",
  },
  "vendor-code": {
    entity: "Vendor",
    field: "Code",
    placeholder: "Search vendor code...",
    title: "Select Vendor by Code",
  },
  "vendor-name": {
    entity: "Vendor",
    field: "Name",
    placeholder: "Search vendor name...",
    title: "Select Vendor by Name",
  },
  warehouse: {
    entity: "Warehouse",
    field: "Code/Name",
    placeholder: "Search warehouse code or name...",
    title: "Select Warehouse",
  },
};

interface LookupPopupProps {
  open: ComponentProps<typeof AnimatedModalShell>["open"];
  search: string;
  results: LookupItem[];
  loading: boolean;
  error: string | null;
  mode?: LookupPopupMode | undefined;
  showBothColumns?: boolean;
  showCodeOnly?: boolean;
  showNameOnly?: boolean;
  title?: string | undefined;
  searchPlaceholder?: string | undefined;
  codeLabel?: string;
  nameLabel?: string;
  onSearchChange: (value: string) => void;
  onClose: ComponentProps<typeof AnimatedModalShell>["onClose"];
  onSelect: (item: LookupItem) => void;
  onRetry?: () => void;
}

interface ModalStateRowProps {
  colSpan: number;
  message: string;
}

function ModalEmptyRow({ colSpan, message }: ModalStateRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-4">
        <div className="flex flex-col items-center gap-1 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-5 text-center">
          <p className="text-xs font-medium text-zinc-500">{message}</p>
        </div>
      </td>
    </tr>
  );
}

const LOOKUP_SKELETON_KEYS = ["slot-1", "slot-2", "slot-3", "slot-4", "slot-5", "slot-6"] as const;

/**
 * LookupPopup: High-utility modal for entity selection.
 * UX: Supports code/name search with real-time feedback via `useLookupToast`.
 * DESIGN: Integrated with `AnimatedModalShell` for premium transitions.
 */
export function LookupPopup({
  open,
  search,
  results,
  loading,
  error,
  mode,
  showBothColumns = false,
  showCodeOnly: customShowCodeOnly,
  showNameOnly: customShowNameOnly,
  title: customTitle,
  searchPlaceholder: customPlaceholder,
  codeLabel = "Code",
  nameLabel = "Name",
  onSearchChange,
  onClose,
  onSelect,
  onRetry,
}: LookupPopupProps) {
  const config = mode ? MODE_CONFIG[mode] : null;
  const listRef = useRef<HTMLDivElement>(null);

  const title = customTitle ?? config?.title ?? "Select";
  const placeholder = customPlaceholder ?? config?.placeholder ?? "Search code or name...";
  const showCodeOnly =
    customShowCodeOnly ??
    (!showBothColumns && (mode === "vendor-code" || mode === "customer-code"));
  const showNameOnly =
    customShowNameOnly ??
    (!showBothColumns && (mode === "vendor-name" || mode === "customer-name"));

  const safeResults = useMemo(() => (Array.isArray(results) ? results : []), [results]);

  const filteredResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return safeResults;
    }

    const score = (item: LookupItem) => {
      const code = item.code.toLowerCase();
      const name = item.name.toLowerCase();

      if (mode === "vendor-code" || mode === "customer-code") {
        if (code === term) {
          return 0;
        }
        if (code.startsWith(term)) {
          return 1;
        }
        if (code.includes(term)) {
          return 2;
        }
        if (name.includes(term)) {
          return 3;
        }
        return 4;
      }

      if (mode === "vendor-name" || mode === "customer-name") {
        if (name === term) {
          return 0;
        }
        if (name.startsWith(term)) {
          return 1;
        }
        if (name.includes(term)) {
          return 2;
        }
        if (code.includes(term)) {
          return 3;
        }
        return 4;
      }

      if (code === term || name === term) {
        return 0;
      }
      if (code.startsWith(term) || name.startsWith(term)) {
        return 1;
      }
      if (code.includes(term) || name.includes(term)) {
        return 2;
      }
      return 3;
    };

    return [...safeResults].toSorted((a, b) => {
      const byScore = score(a) - score(b);
      if (byScore !== 0) {
        return byScore;
      }
      return a.code.localeCompare(b.code, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [safeResults, search, mode]);

  const rowVirtualizer = useVirtualizer({
    count: filteredResults.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 36,
    overscan: 5,
  });

  useLookupToast({
    hasData: filteredResults.length > 0,
    loading,
    message: search.trim() ? "Searching…" : "Loading…",
    open,
  });

  const cellWidthClass = showNameOnly || showCodeOnly ? "w-full" : "w-1/2";

  return (
    <AnimatedModalShell open={open} onClose={onClose} panelClassName="max-w-xl">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
        >
          Close
        </button>
      </div>

      <div className="p-4">
        <input
          className="mb-3 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
          placeholder={placeholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          autoComplete="off"
        />

        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <div ref={listRef} className="max-h-64 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-zinc-600 z-10 block">
                <tr className="flex w-full">
                  {showNameOnly ? null : (
                    <th className={`px-3 py-2 text-left font-semibold ${cellWidthClass} block`}>
                      {codeLabel}
                    </th>
                  )}
                  {showCodeOnly ? null : (
                    <th className={`px-3 py-2 text-left font-semibold ${cellWidthClass} block`}>
                      {nameLabel}
                    </th>
                  )}
                </tr>
              </thead>
              {filteredResults.length === 0 ? (
                <tbody>
                  {loading ? (
                    LOOKUP_SKELETON_KEYS.map((slot) => (
                      <tr key={`lookup-skeleton-${slot}`} className="border-t border-zinc-100">
                        <td className="px-3 py-2" colSpan={showCodeOnly || showNameOnly ? 1 : 2}>
                          <div className="h-8 w-full animate-pulse rounded-lg bg-zinc-100" />
                        </td>
                      </tr>
                    ))
                  ) : error ? (
                    <LookupErrorState
                      colSpan={showCodeOnly || showNameOnly ? 1 : 2}
                      message={error || "Unable to load data. Please try again."}
                      {...(onRetry ? { onRetry } : {})}
                    />
                  ) : (
                    <ModalEmptyRow
                      colSpan={showCodeOnly || showNameOnly ? 1 : 2}
                      message={
                        search.trim() ? `No results for "${search.trim()}".` : "No data available."
                      }
                    />
                  )}
                </tbody>
              ) : (
                <tbody
                  className="relative block w-full"
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const item = filteredResults[virtualRow.index];
                    if (!item) return null;
                    return (
                      <tr
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        className="absolute left-0 right-0 flex cursor-pointer border-t border-zinc-100 transition hover:bg-zinc-50 items-center"
                        style={{
                          transform: `translateY(${virtualRow.start}px)`,
                          height: `${virtualRow.size}px`,
                        }}
                        onClick={() => onSelect(item)}
                      >
                        {showNameOnly ? null : (
                          <td
                            className={`px-3 py-2 font-medium text-zinc-800 ${cellWidthClass} truncate block`}
                          >
                            {item.code}
                          </td>
                        )}
                        {showCodeOnly ? null : (
                          <td
                            className={`px-3 py-2 text-zinc-700 ${cellWidthClass} truncate block`}
                          >
                            {item.name}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>
        </div>
      </div>
    </AnimatedModalShell>
  );
}
