// Dashboard data layer — Drizzle port of hana's TypeORM data layer.

import { and, asc, gte, lte } from "drizzle-orm";

import { getCachedData } from "@/core/utils/cache.util";
import { getDb } from "@/db/client";
import { apCreditMemos } from "@/db/schema/ap-credit-memos";
import { apInvoices } from "@/db/schema/ap-invoices";
import { arCreditMemos } from "@/db/schema/ar-credit-memos";
import { arInvoices } from "@/db/schema/ar-invoices";
import { goodsIssues } from "@/db/schema/goods-issues";
import { goodsReceipts } from "@/db/schema/goods-receipts";
import { grpo } from "@/db/schema/grpo";
import { incomingPayments } from "@/db/schema/incoming-payments";
import { inventoryTransferRequests } from "@/db/schema/inventory-transfer-requests";
import { inventoryTransfers } from "@/db/schema/inventory-transfers";
import { outgoingPayments } from "@/db/schema/outgoing-payments";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { purchaseQuotations } from "@/db/schema/purchase-quotations";
import { salesOrders } from "@/db/schema/sales-orders";
import { salesQuotations } from "@/db/schema/sales-quotations";
import { getDisplayCurrency } from "@/services/currency.util";
import type { LooseTable } from "@/types/db.types";

import { getAreaModules } from "./dashboard-constants.util";
import { getPeriodWindow } from "./dashboard-period.util";
import type {
  AreaDataset,
  DashboardArea,
  DashboardPeriod,
  DateRange,
  DocumentModule,
  ModuleDataset,
  RawDashboardDocument,
} from "./dashboard.types";

const SCHEMA_MAP: Record<DocumentModule, LooseTable> = {
  apCreditNote: apCreditMemos,
  apInvoice: apInvoices,
  arCreditNote: arCreditMemos,
  arInvoice: arInvoices,
  goodsIssue: goodsIssues,
  goodsReceipt: goodsReceipts,
  grpo,
  incomingPayment: incomingPayments,
  itemMaster: null,
  outgoingPayment: outgoingPayments,
  purchaseOrder: purchaseOrders,
  purchaseQuotation: purchaseQuotations,
  salesOrder: salesOrders,
  salesQuotation: salesQuotations,
  transfer: inventoryTransfers,
  transferRequest: inventoryTransferRequests,
};

const toDateString = (value: unknown, fallback = ""): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (value) {
    return String(value).slice(0, 10);
  }
  return fallback;
};

const getRowDates = (doc: Record<string, unknown>) => {
  const docDate = toDateString(doc.docDate);
  const docDueDate = toDateString(doc.docDueDate, docDate);
  return { docDate, docDueDate };
};

const mapRow = (
  module: DocumentModule,
  doc: Record<string, unknown>,
  defaultCurrency: string,
): RawDashboardDocument => {
  const { docDate, docDueDate } = getRowDates(doc);

  return {
    cardCode: String(doc.cardCode || ""),
    cardName: String(doc.cardName || ""),
    docCurrency: String(doc.docCurrency || defaultCurrency),
    docDate,
    docDueDate,
    docEntry: Number(doc.id || 0),
    docNum: Number(doc.docNum || 0),
    docStatus: String(doc.docStatus || "C"),
    docTotal: Number(doc.docTotal || 0),
    module,
    paidToDate: Number(doc.paidToDate || 0),
  };
};

export const fetchModuleDocuments = async (
  module: DocumentModule,
  range: DateRange,
): Promise<RawDashboardDocument[]> => {
  const schema = SCHEMA_MAP[module];
  if (!schema) {
    return [];
  }
  const db = getDb();
  const conditions: import("drizzle-orm").SQL[] = [];
  if (range.start) {
    conditions.push(gte(schema.docDate, range.start));
  }
  if (range.end) {
    conditions.push(lte(schema.docDate, range.end));
  }
  const defaultCurrency = await getDisplayCurrency();
  const rows = await db
    .select()
    .from(schema)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(schema.docDate));
  return rows.map((doc: Record<string, unknown>) => mapRow(module, doc, defaultCurrency));
};

export const loadAreaDataset = async (
  area: DashboardArea,
  period: DashboardPeriod,
): Promise<AreaDataset> => {
  const cacheKey = `dash:${area}:${period}`;
  return getCachedData(
    cacheKey,
    async () => {
      const window = getPeriodWindow(period);
      const modules = getAreaModules(area);
      const datasets = await Promise.all(
        modules.map(async (module) => {
          const [current, previous] = await Promise.all([
            fetchModuleDocuments(module, window.current),
            window.previous ? fetchModuleDocuments(module, window.previous) : Promise.resolve([]),
          ]);
          return { current, module, previous };
        }),
      );
      const defaultCurrency = await getDisplayCurrency();
      return {
        currency: defaultCurrency,
        granularity: window.granularity,
        modules: datasets,
        period,
      };
    },
    15 * 1000,
  );
};

export const getModuleDataset = (dataset: AreaDataset, module: DocumentModule): ModuleDataset => {
  const match = dataset.modules.find((entry) => entry.module === module);
  return match ?? { current: [], module, previous: [] };
};
