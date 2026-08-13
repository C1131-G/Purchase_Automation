/**
 * Edit-route intent prefetch for document list tables.
 *
 * Hover/double-click used to fire unbounded detail + product (limit 100) + N stock
 * queries. This helper:
 * - debounces hover so quick row skims do not start work
 * - tracks a generation so stale detail completions skip product/stock warm-up
 * - preloads the edit route immediately, in parallel with detail data
 * - warms exact document products + batched stock fetch
 * - reuses runSmartPrefetch for master-data / product / stock queries
 * - skips heavy product/stock work on slow networks or when Save-Data is on
 */
import type { QueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { runSmartPrefetch } from "@/features/table-pages/table-shared/hooks/prefetch-orchestrator";

/** Cap stock warm-up so multi-line docs do not fan out dozens of requests. */
export const EDIT_STOCK_PREFETCH_MAX_ITEMS = 8;

/** Ignore hover intents shorter than this (ms). Immediate navigate still works via flush. */
const HOVER_DEBOUNCE_MS = 140;

export type EditRoutePartnerKind = "vendors" | "customers" | "none";
export type EditRouteProductKind = "purchase" | "sales";

export interface DocumentLineLike {
  ItemCode?: string | null;
  WarehouseCode?: string | null;
}

export interface EditRouteDetailLike {
  CardCode?: string | null;
  DocumentLines?: DocumentLineLike[] | null;
}

export interface UseEditRoutePrefetchOptions {
  queryClient: QueryClient;
  /**
   * Detail queryOptions factory. Per-table TanStack queryOptions generics differ;
   * callers pass the options object through and we cast at fetch time.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- queryOptions return types are table-specific
  getDetailQueryOptions: (docNum: string) => any;
  /** Preload the TanStack Router edit chunk for this doc. */
  preloadEditRoute: (docNum: string) => void;
  partner?: EditRoutePartnerKind;
  includeWarehouses?: boolean;
  includeSalesEmployees?: boolean;
  /**
   * When set, warms warehouse-scoped product list after detail resolves.
   * Sales may allow empty warehouse (global list).
   */
  products?: {
    kind: EditRouteProductKind;
    allowWithoutWarehouse?: boolean;
  };
  maxStockItems?: number;
}

const isPrefetchEnvironmentOk = (): boolean => {
  if (typeof navigator === "undefined") {
    return true;
  }
  if (navigator.onLine === false) {
    return false;
  }
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return false;
  }
  const connection = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    }
  ).connection;
  if (connection?.saveData) {
    return false;
  }
  if (connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g") {
    return false;
  }
  return true;
};

const extractDetail = <TDetail extends EditRouteDetailLike>(
  response: { data?: TDetail } | TDetail | undefined,
): TDetail | undefined => {
  if (!response || typeof response !== "object") {
    return undefined;
  }
  if ("data" in response && response.data && typeof response.data === "object") {
    return response.data;
  }
  if ("DocumentLines" in response) {
    return response as TDetail;
  }
  return undefined;
};

const collectLineMeta = (detail: EditRouteDetailLike | undefined) => {
  const lines = detail?.DocumentLines ?? [];
  const cardCode = String(detail?.CardCode ?? "").trim();
  const warehouseCode = String(lines[0]?.WarehouseCode ?? "").trim();
  const itemCodes = [
    ...new Set(lines.map((line) => String(line.ItemCode ?? "").trim()).filter(Boolean)),
  ];
  return { cardCode, itemCodes, warehouseCode };
};

const warmMasterData = (
  queryClient: QueryClient,
  options: {
    partner: EditRoutePartnerKind;
    includeWarehouses: boolean;
    includeSalesEmployees: boolean;
  },
) => {
  if (!isPrefetchEnvironmentOk()) {
    return;
  }
  if (options.partner === "vendors") {
    void runSmartPrefetch(queryClient, createSharedQueries.vendors());
  } else if (options.partner === "customers") {
    void runSmartPrefetch(queryClient, createSharedQueries.customers());
  }
  if (options.includeWarehouses) {
    void runSmartPrefetch(queryClient, createSharedQueries.warehouses());
  }
  if (options.includeSalesEmployees) {
    void runSmartPrefetch(queryClient, createSharedQueries.salesEmployees());
  }
};

const warmDetailSideEffects = (
  queryClient: QueryClient,
  detail: EditRouteDetailLike | undefined,
  options: {
    products?: UseEditRoutePrefetchOptions["products"];
    maxStockItems: number;
    isCurrent: () => boolean;
  },
) => {
  if (!options.isCurrent() || !isPrefetchEnvironmentOk()) {
    return;
  }

  const { cardCode, itemCodes, warehouseCode } = collectLineMeta(detail);
  const products = options.products;

  if (products && cardCode && itemCodes.length > 0) {
    void runSmartPrefetch(
      queryClient,
      createSharedQueries.productsByCodes(itemCodes, products.kind, undefined, undefined, cardCode),
    );
  }

  if (itemCodes.length === 0) {
    return;
  }

  const cappedCodes = itemCodes.slice(0, options.maxStockItems);
  void runSmartPrefetch(
    queryClient,
    createSharedQueries.productWarehouseStocksBatch(cappedCodes, warehouseCode || undefined),
  );
};

/**
 * Shared list-row edit prefetch: debounced hover, generation-gated side effects,
 * coalesced product catalog, batched stocks.
 */
export function useEditRoutePrefetch({
  queryClient,
  getDetailQueryOptions,
  preloadEditRoute,
  partner = "vendors",
  includeWarehouses = true,
  includeSalesEmployees = true,
  products,
  maxStockItems = EDIT_STOCK_PREFETCH_MAX_ITEMS,
}: UseEditRoutePrefetchOptions) {
  const startedDocNumsRef = useRef<Set<string>>(new Set());
  const generationRef = useRef(0);
  const latestDocNumRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDocNumRef = useRef<string | null>(null);

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingDocNumRef.current = null;
  }, []);

  useEffect(() => () => clearDebounce(), [clearDebounce]);

  const runPrefetch = useCallback(
    (docNum: string) => {
      const normalizedDocNum = docNum.trim();
      if (!normalizedDocNum) {
        return;
      }
      if (startedDocNumsRef.current.has(normalizedDocNum)) {
        // Still mark as latest so any in-flight earlier doc does not warm products for a skim.
        latestDocNumRef.current = normalizedDocNum;
        return;
      }

      startedDocNumsRef.current.add(normalizedDocNum);
      generationRef.current += 1;
      const generation = generationRef.current;
      latestDocNumRef.current = normalizedDocNum;
      preloadEditRoute(normalizedDocNum);

      const isCurrent = () =>
        generationRef.current === generation && latestDocNumRef.current === normalizedDocNum;

      warmMasterData(queryClient, {
        includeSalesEmployees,
        includeWarehouses,
        partner,
      });

      void queryClient
        .fetchQuery(getDetailQueryOptions(normalizedDocNum) as never)
        .then((response) => {
          if (!isCurrent()) {
            return;
          }

          const detail = extractDetail(
            response as { data?: EditRouteDetailLike } | EditRouteDetailLike | undefined,
          );
          warmDetailSideEffects(queryClient, detail, {
            isCurrent,
            maxStockItems,
            products,
          });
        })
        .catch(() => {
          startedDocNumsRef.current.delete(normalizedDocNum);
          if (latestDocNumRef.current === normalizedDocNum) {
            latestDocNumRef.current = null;
          }
        });
    },
    [
      getDetailQueryOptions,
      includeSalesEmployees,
      includeWarehouses,
      maxStockItems,
      partner,
      preloadEditRoute,
      products,
      queryClient,
    ],
  );

  /**
   * Hover intent: debounced so skimming rows does not hammer the network.
   * Double-click / navigate should call `prefetchEditRouteDataImmediate`.
   */
  const prefetchEditRouteData = useCallback(
    (docNum: string) => {
      const normalizedDocNum = docNum.trim();
      if (!normalizedDocNum) {
        return;
      }

      pendingDocNumRef.current = normalizedDocNum;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        const pending = pendingDocNumRef.current;
        pendingDocNumRef.current = null;
        if (pending) {
          runPrefetch(pending);
        }
      }, HOVER_DEBOUNCE_MS);
    },
    [runPrefetch],
  );

  /** Immediate path for click/navigate — flushes any pending hover for the same doc. */
  const prefetchEditRouteDataImmediate = useCallback(
    (docNum: string) => {
      const normalizedDocNum = docNum.trim();
      if (!normalizedDocNum) {
        return;
      }
      clearDebounce();
      runPrefetch(normalizedDocNum);
    },
    [clearDebounce, runPrefetch],
  );

  return {
    prefetchEditRouteData,
    prefetchEditRouteDataImmediate,
  };
}
