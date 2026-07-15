import { getTenantRepository } from "@/db/tenant-query";
import { getCachedData } from "@/core/utils/cache";
import { getDisplayCurrency } from "@/services/currency-format";

// Purchase schemas
import { PurchaseQuotationSchema } from "@/db/schemas/purchase-quotation.schema";
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { GRPOSchema } from "@/db/schemas/grpo.schema";
import { APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";
import { APCreditMemoSchema } from "@/db/schemas/ap-credit-memo.schema";
import { OutgoingPaymentSchema } from "@/db/schemas/outgoing-payment.schema";

// Sales schemas
import { SalesQuotationSchema } from "@/db/schemas/sales-quotation.schema";
import { SalesOrderSchema } from "@/db/schemas/sales-order.schema";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { ARCreditMemoSchema } from "@/db/schemas/ar-credit-memo.schema";
import { IncomingPaymentSchema } from "@/db/schemas/incoming-payment.schema";

// Inventory schemas
import { ItemSchema } from "@/db/schemas/item.schema";
import { GoodsReceiptSchema } from "@/db/schemas/goods-receipt.schema";
import { GoodsIssueSchema } from "@/db/schemas/goods-issue.schema";
import { InventoryTransferRequestSchema } from "@/db/schemas/inventory-transfer-request.schema";
import { InventoryTransferSchema } from "@/db/schemas/inventory-transfer.schema";

import { PURCHASE_MODULES, SALES_MODULES } from "./dashboard.constants";
import { getPeriodWindow } from "./dashboard.period";
import type {
  AreaDataset,
  DashboardArea,
  DashboardPeriod,
  DateRange,
  DocumentModule,
  ModuleDataset,
  RawDashboardDocument,
} from "./dashboard.types";

const SCHEMA_MAP: Record<DocumentModule, any> = {
  purchaseQuotation: PurchaseQuotationSchema,
  purchaseOrder: PurchaseOrderSchema,
  grpo: GRPOSchema,
  apInvoice: APInvoiceSchema,
  apCreditNote: APCreditMemoSchema,
  outgoingPayment: OutgoingPaymentSchema,
  salesQuotation: SalesQuotationSchema,
  salesOrder: SalesOrderSchema,
  arInvoice: ARInvoiceSchema,
  arCreditNote: ARCreditMemoSchema,
  incomingPayment: IncomingPaymentSchema,
  // Inventory — itemMaster is handled separately; these four are flow documents
  itemMaster: ItemSchema,
  goodsReceipt: GoodsReceiptSchema,
  goodsIssue: GoodsIssueSchema,
  transferRequest: InventoryTransferRequestSchema,
  transfer: InventoryTransferSchema,
};

export const fetchModuleDocuments = async (
  module: DocumentModule,
  range: DateRange,
  dbName: string,
  displayCurrency: string,
): Promise<RawDashboardDocument[]> => {
  const schema = SCHEMA_MAP[module];
  if (!schema) {
    throw new Error(`Unknown dashboard module: ${module}`);
  }

  const repo = await getTenantRepository(dbName, schema);
  const queryBuilder = repo.createQueryBuilder("doc");

  // Optimize: query only mapped fields needed for dashboard metrics to speed up query execution
  const possibleColumns = [
    "docEntry",
    "docNum",
    "docDate",
    "cardCode",
    "cardName",
    "docTotal",
    "docCurr",
    "docStatus",
    "paidToDate",
  ];
  const selectColumns = possibleColumns
    .filter((prop) => repo.metadata.findColumnWithPropertyName(prop))
    .map((prop) => `doc.${prop}`);
  queryBuilder.select(selectColumns);

  if (range.start) {
    queryBuilder.andWhere("doc.docDate >= :start", { start: range.start });
  }
  if (range.end) {
    queryBuilder.andWhere("doc.docDate <= :end", { end: range.end });
  }

  queryBuilder.orderBy("doc.docDate", "ASC");

  const rows = await queryBuilder.getMany();

  return rows.map((doc: any) => {
    // Determine paidToDate
    let paidToDate = 0;
    if ("paidToDate" in doc) {
      paidToDate = Number(doc.paidToDate || 0);
    }

    // Determine docStatus
    let docStatus = "C"; // default for payments
    if ("docStatus" in doc) {
      docStatus = doc.docStatus;
    }

    // Determine docCurr
    const docCurr = doc.docCurr || doc.docCur || doc.docCurrency || displayCurrency;

    // Format dates to YYYY-MM-DD strings
    const docDateStr =
      doc.docDate instanceof Date
        ? doc.docDate.toISOString().slice(0, 10)
        : String(doc.docDate || "").slice(0, 10);

    const docDueDateStr =
      "docDueDate" in doc && doc.docDueDate instanceof Date
        ? doc.docDueDate.toISOString().slice(0, 10)
        : "docDueDate" in doc && doc.docDueDate
          ? String(doc.docDueDate).slice(0, 10)
          : docDateStr;

    return {
      module,
      docEntry: Number(doc.docEntry || 0),
      docNum: Number(doc.docNum || 0),
      docDate: docDateStr,
      docDueDate: docDueDateStr,
      cardCode: String(doc.cardCode || ""),
      cardName: String(doc.cardName || ""),
      docTotal: Number(doc.docTotal || 0),
      docCurrency: docCurr,
      docStatus: docStatus,
      paidToDate: paidToDate,
    };
  });
};

export const loadAreaDataset = async (
  area: DashboardArea,
  period: DashboardPeriod,
  dbName: string,
): Promise<AreaDataset> => {
  const cacheKey = `dash:${area}:${dbName}:${period}`;

  return getCachedData(
    cacheKey,
    async () => {
      const window = getPeriodWindow(period);
      const modules = area === "purchase" ? PURCHASE_MODULES : SALES_MODULES;

      const displayCurrency = await getDisplayCurrency(dbName);

      const datasets = await Promise.all(
        modules.map(async (module) => {
          const [current, previous] = await Promise.all([
            fetchModuleDocuments(module, window.current, dbName, displayCurrency),
            window.previous
              ? fetchModuleDocuments(module, window.previous, dbName, displayCurrency)
              : Promise.resolve([]),
          ]);

          return { module, current, previous };
        }),
      );

      return {
        currency: displayCurrency,
        modules: datasets,
        period,
        granularity: window.granularity,
      };
    },
    15 * 1000,
  );
};

export const getModuleDataset = (dataset: AreaDataset, module: DocumentModule): ModuleDataset => {
  const match = dataset.modules.find((entry) => entry.module === module);
  return match ?? { module, current: [], previous: [] };
};
