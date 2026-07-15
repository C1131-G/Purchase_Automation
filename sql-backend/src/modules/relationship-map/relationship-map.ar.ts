import { getDb } from "@/db/client";
import type { DynRow } from "@/types/drizzle.types";

import { relationshipMapRepository } from "./relationship-map.repository";
import { toRelationNode } from "./relationship-map.to-relation";

export const getArRelationshipMap = async (docType: string, docEntry: number) => {
  const db = getDb();
  let salesQuotationId: number | null = null;
  let salesOrderId: number | null = null;
  let arInvoiceId: number | null = null;
  let arCreditMemoId: number | null = null;
  let incomingPaymentId: number | null = null;

  switch (docType) {
    case "sales-quotation": {
      salesQuotationId = docEntry;
      break;
    }
    case "sales-order": {
      salesOrderId = docEntry;
      break;
    }
    case "ar-invoice": {
      arInvoiceId = docEntry;
      break;
    }
    case "ar-credit-memo": {
      arCreditMemoId = docEntry;
      break;
    }
    case "incoming-payment": {
      incomingPaymentId = docEntry;
      break;
    }
  }

  if (salesOrderId || salesQuotationId) {
    const baseId = salesQuotationId ?? salesOrderId;
    if (salesQuotationId) {
      await relationshipMapRepository.findSalesQuotationLines(db, baseId!);
    } else {
      await relationshipMapRepository.findSalesOrderLines(db, baseId!);
    }
    const salesOrderLines = await relationshipMapRepository.findSalesOrderLinesByBaseEntry(db, [
      baseId!,
    ]);
    const salesOrderEntries = [...new Set(salesOrderLines.map((line: DynRow) => line.docEntry))];
    if (salesOrderEntries.length > 0) {
      salesOrderId ??= salesOrderEntries[0] as number;
    }
  }

  if (salesOrderId) {
    const invoiceLines = await relationshipMapRepository.findArInvoiceLinesByBaseEntry(db, [
      salesOrderId,
    ]);
    const invoiceEntries = [...new Set(invoiceLines.map((line: DynRow) => line.docEntry))];
    if (invoiceEntries.length > 0 && !arInvoiceId) {
      arInvoiceId = invoiceEntries[0] as number;
    }
  }

  if (arInvoiceId) {
    const creditMemoLines = await relationshipMapRepository.findArCreditMemoLinesByBaseEntry(db, [
      arInvoiceId,
    ]);
    const creditMemoEntries = [...new Set(creditMemoLines.map((line: DynRow) => line.docEntry))];
    if (creditMemoEntries.length > 0 && !arCreditMemoId) {
      arCreditMemoId = creditMemoEntries[0] as number;
    }
  }

  const salesQuotation = salesQuotationId
    ? await relationshipMapRepository.findSalesQuotation(db, salesQuotationId)
    : null;
  const salesOrder = salesOrderId
    ? await relationshipMapRepository.findSalesOrder(db, salesOrderId)
    : null;
  const arInvoice = arInvoiceId
    ? await relationshipMapRepository.findArInvoice(db, arInvoiceId)
    : null;
  const arCreditMemo = arCreditMemoId
    ? await relationshipMapRepository.findArCreditMemo(db, arCreditMemoId)
    : null;

  return {
    arCreditMemo: arCreditMemo ? [toRelationNode(arCreditMemo)] : [],
    arInvoice: arInvoice ? [toRelationNode(arInvoice)] : [],
    incomingPayment: incomingPaymentId
      ? [
          toRelationNode({
            cardCode: null,
            cardName: null,
            docDate: null,
            docNum: null,
            docStatus: null,
            docTotal: null,
            id: incomingPaymentId,
          }),
        ]
      : [],
    salesOrder: salesOrder ? [toRelationNode(salesOrder)] : [],
    salesQuotation: salesQuotation ? [toRelationNode(salesQuotation)] : [],
  };
};
