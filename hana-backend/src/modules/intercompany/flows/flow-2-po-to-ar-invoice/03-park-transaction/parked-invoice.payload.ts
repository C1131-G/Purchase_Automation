import {
  clampSapDocumentComments,
  IC_REMARK_PROFILE,
  icLinkPo,
  icLinkSq,
  normalizeIcRemarks,
  SAP_DOCUMENT_COMMENTS_MAX_LEN,
} from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import { SAP_OBJ_SALES_QUOTATION } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import type { IcSalesQuotationSnapshot } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

import type { PosParkedInvoiceData, PosParkedSalesItem } from "./parked-transaction.types";

/** First Comments line — tells the cashier this invoice was created by Intercompany automation. */
export const IC_PARK_COMMENTS_TAG = "[IC AUTO] Intercompany invoice";

/**
 * Comments budget = 75% of SAP's 254. POS appends `. <StoreLocation> - Created via POS_VT`
 * on posting without truncating, so the remaining 25% is reserved for that suffix.
 */
export const IC_PARK_COMMENTS_MAX_LEN = Math.floor(SAP_DOCUMENT_COMMENTS_MAX_LEN * 0.75);

const finite = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Tag line + seller SQ remarks (user text, vendor ref) + PQ → RFQ → PO → SQ chain, within budget. */
export const buildIcParkComments = (input: {
  poDocEntry: number;
  poDocNum?: number | null;
  snapshot: Pick<IcSalesQuotationSnapshot, "comments" | "docEntry" | "docNum">;
}): string => {
  const body = normalizeIcRemarks(input.snapshot.comments, IC_REMARK_PROFILE.SELLER, [
    icLinkPo(input.poDocNum, input.poDocEntry),
    icLinkSq(input.snapshot.docNum, input.snapshot.docEntry),
  ]);
  // Clamp the body alone so the tag line is never cut; clamp trims user text before chain lines.
  const bodyBudget = IC_PARK_COMMENTS_MAX_LEN - IC_PARK_COMMENTS_TAG.length - 1;
  const clamped = clampSapDocumentComments(body, bodyBudget);
  return clamped ? `${IC_PARK_COMMENTS_TAG}\n${clamped}` : IC_PARK_COMMENTS_TAG;
};

export const buildPosParkedInvoiceData = (input: {
  buyerCompanyName: string;
  customerCode: string;
  poDocEntry: number;
  poDocNum?: number | null;
  portalCreatedBy?: string;
  salesPersonCode?: number | string | null;
  snapshot: IcSalesQuotationSnapshot;
  transactionId: string;
}): PosParkedInvoiceData => {
  const salesItems: PosParkedSalesItem[] = input.snapshot.documentLines
    .filter((line) => {
      const status = String(line.LineStatus ?? "")
        .trim()
        .toLowerCase();
      return status !== "bost_close" && status !== "closed" && status !== "c";
    })
    .map((line) => {
      const quantity = finite(line.RemainingOpenQuantity ?? line.Quantity);
      const price = finite(line.GrossPrice ?? line.PriceAfterVAT ?? line.UnitPrice);
      const discount = finite(line.DiscountPercent);
      const taxPercent = finite(line.TaxPercentagePerRow);
      const totalPrice = finite(line.LineTotal, quantity * price * (1 - discount / 100));
      const totalWithTax = finite(
        line.GrossTotal,
        totalPrice + finite(line.TaxTotal, (totalPrice * taxPercent) / 100),
      );
      const itemCode = String(line.ItemCode ?? "").trim();
      const warehouseCode = String(line.WarehouseCode ?? "").trim();
      if (!itemCode || !warehouseCode || quantity <= 0) {
        throw new Error(
          `IC park seller SQ line ${line.LineNum} is missing item, warehouse, or quantity`,
        );
      }
      return {
        BaseEntry: input.snapshot.docEntry,
        BaseLine: line.LineNum,
        BaseType: SAP_OBJ_SALES_QUOTATION,
        Discount: discount,
        FreeText: String(line.FreeText ?? ""),
        ItemCode: itemCode,
        ItemName: String(line.ItemDescription ?? itemCode),
        LineNum: line.LineNum,
        Price: price,
        Quantity: quantity,
        TaxPercent: taxPercent,
        TotalPrice: totalPrice,
        TotalPriceWithTax: totalWithTax,
        UomCode: String(line.UoMCode ?? ""),
        VatGroup: String(line.VatGroup ?? ""),
        WhsCode: warehouseCode,
        ...(line.TreeType ? { TreeType: line.TreeType } : {}),
        ...(line.ManBtchNum ? { ManBtchNum: line.ManBtchNum } : {}),
        ...(line.ManSerNum ? { ManSerNum: line.ManSerNum } : {}),
      };
    });
  if (salesItems.length === 0)
    throw new Error("IC park seller SQ has no open POS-compatible lines");

  const headerSalesPerson = finite(input.snapshot.salesPersonCode, -1);
  const totalAmount = salesItems.reduce((sum, line) => sum + line.TotalPriceWithTax, 0);
  const poLabel = input.poDocNum ?? input.poDocEntry;
  const sqLabel = input.snapshot.docNum ?? input.snapshot.docEntry;
  return {
    customer: {
      CardCode: String(input.snapshot.cardCode ?? input.customerCode),
      CardName: String(input.snapshot.cardName ?? input.buyerCompanyName),
    },
    customerAddress: input.snapshot.customerAddress ?? {},
    isCODCustomer: false,
    isOneTimeCustomer: false,
    oneTimeCustomerDetails: {},
    parkedTransaction: {
      TotalAmount: totalAmount,
      parkReason: `[IC AUTO] PO No. ${poLabel} / SQ No. ${sqLabel} - awaiting cashier`,
    },
    salesHeader: {
      ...(input.snapshot.branchId ? { BPL_IDAssignedToInvoice: input.snapshot.branchId } : {}),
      Comments: buildIcParkComments(input),
      ...(input.snapshot.numAtCard ? { NumAtCard: input.snapshot.numAtCard } : {}),
      ...(headerSalesPerson >= 0 ? { SalesPersonCode: headerSalesPerson } : {}),
      ...(input.snapshot.docDate ? { postingDate: input.snapshot.docDate } : {}),
    },
    salesItems,
    timYardTransaction: {},
    transactionID: input.transactionId,
  };
};
