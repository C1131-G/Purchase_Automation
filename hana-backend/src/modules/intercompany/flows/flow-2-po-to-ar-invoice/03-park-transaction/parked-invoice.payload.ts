import { SAP_OBJ_SALES_QUOTATION } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import type { IcSalesQuotationSnapshot } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

import type { PosParkedInvoiceData, PosParkedSalesItem } from "./parked-transaction.types";

const finite = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
      parkReason: `IC PO ${poLabel} awaiting cashier processing`,
    },
    salesHeader: {
      ...(input.snapshot.branchId ? { BPL_IDAssignedToInvoice: input.snapshot.branchId } : {}),
      Comments: String(
        input.snapshot.comments ??
          `IC seller SQ ${input.snapshot.docNum ?? input.snapshot.docEntry}`,
      ),
      ...(input.snapshot.numAtCard ? { NumAtCard: input.snapshot.numAtCard } : {}),
      ...(headerSalesPerson >= 0 ? { SalesPersonCode: headerSalesPerson } : {}),
      ...(input.snapshot.docDate ? { postingDate: input.snapshot.docDate } : {}),
    },
    salesItems,
    timYardTransaction: {},
    transactionID: input.transactionId,
  };
};
