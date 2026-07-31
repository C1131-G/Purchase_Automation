/**
 * Intent prefetch for IC notification → document create/update routes.
 *
 * Notification rows never sat on a document table, so create loaders used to cold-start
 * vendors/warehouses/sales employees (and draft/detail) only after click. Warm on hover,
 * row intent, and list idle so navigation hits cache like PQ/RFQ tables.
 */
import type { QueryClient } from "@tanstack/react-query";

import { prefetchCreateMasterData } from "@/features/create-pages/create-shared/utils/ensure-create-master-data";
import { icRfqQueries } from "@/features/intercompany/api/intercompany.queries";
import type { IcNotificationDocLink } from "@/features/intercompany/utils/ic-notification-navigation";
import { purchaseQuotationQueries } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";
import { salesQuotationQueries } from "@/features/table-pages/sales-quotations/api/sales-quotation.queries";
import { runSmartPrefetch } from "@/features/table-pages/table-shared/hooks/prefetch-orchestrator";

type PreloadRouter = {
  preloadRoute: (opts: never) => Promise<unknown>;
};

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

const preloadLinkRoute = (router: PreloadRouter, link: IcNotificationDocLink): void => {
  void router.preloadRoute({
    params: link.params,
    search: link.search ?? {},
    to: link.to,
  } as never);
};

/**
 * Warm route chunk + master data + document detail for a notification doc link.
 * Safe to call repeatedly; smart prefetch + React Query dedupe skip fresh work.
 */
export const prefetchIcNotificationDocLink = (
  queryClient: QueryClient,
  router: PreloadRouter,
  link: IcNotificationDocLink,
): void => {
  if (!isPrefetchEnvironmentOk()) {
    return;
  }

  preloadLinkRoute(router, link);

  if (link.to === "/purchase/create-quotation") {
    prefetchCreateMasterData(queryClient, "vendors");
    const draftDocNum = String(link.search?.draftDocNum ?? "").trim();
    if (draftDocNum) {
      void runSmartPrefetch(
        queryClient,
        purchaseQuotationQueries.detailByDocNum(draftDocNum),
      ).catch(() => {
        /* intent warm — ignore failures */
      });
    }
    return;
  }

  if (link.to === "/purchase/quotations/$docNum/update") {
    prefetchCreateMasterData(queryClient, "vendors");
    const docNum = String(link.params?.docNum ?? "").trim();
    if (docNum) {
      void runSmartPrefetch(queryClient, purchaseQuotationQueries.detailByDocNum(docNum)).catch(
        () => {
          /* intent warm — ignore failures */
        },
      );
    }
    return;
  }

  if (link.to === "/sales/quotations/$docNum/update") {
    prefetchCreateMasterData(queryClient, "customers");
    const docNum = String(link.params?.docNum ?? "").trim();
    if (docNum) {
      void runSmartPrefetch(queryClient, salesQuotationQueries.detailByDocNum(docNum)).catch(() => {
        /* intent warm — ignore failures */
      });
    }
    return;
  }

  if (link.to === "/sales/request-for-quotations/$rfqId") {
    const rfqId = Number(link.params?.rfqId);
    if (Number.isFinite(rfqId) && rfqId > 0) {
      void runSmartPrefetch(queryClient, icRfqQueries.detail(rfqId)).catch(() => {
        /* intent warm — ignore failures */
      });
    }
  }
};

/** Warm master data + create-quotation chunk while the notifications list is open. */
export const warmIcNotificationCreateTargets = (
  queryClient: QueryClient,
  router: PreloadRouter,
): void => {
  if (!isPrefetchEnvironmentOk()) {
    return;
  }
  prefetchCreateMasterData(queryClient, "vendors");
  prefetchCreateMasterData(queryClient, "customers");
  void router.preloadRoute({ to: "/purchase/create-quotation" } as never);
  void router.preloadRoute({ to: "/sales/create-quotation" } as never);
};
