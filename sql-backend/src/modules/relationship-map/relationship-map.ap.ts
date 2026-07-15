import { getDb } from "@/db/client";
import type { DynRow } from "@/types/drizzle.types";

import { relationshipMapRepository } from "./relationship-map.repository";
import { toRelationNode } from "./relationship-map.to-relation";

export const getApRelationshipMap = async (docType: string, docEntry: number) => {
  const db = getDb();
  let purchaseQuotationId: number | null = null;
  let purchaseOrderId: number | null = null;
  let grpoId: number | null = null;
  let apInvoiceId: number | null = null;
  let apCreditMemoId: number | null = null;
  let outgoingPaymentId: number | null = null;

  switch (docType) {
    case "purchase-quotation": {
      purchaseQuotationId = docEntry;
      break;
    }
    case "purchase-order": {
      purchaseOrderId = docEntry;
      break;
    }
    case "grpo": {
      grpoId = docEntry;
      break;
    }
    case "ap-invoice": {
      apInvoiceId = docEntry;
      break;
    }
    case "ap-credit-memo": {
      apCreditMemoId = docEntry;
      break;
    }
    case "outgoing-payment": {
      outgoingPaymentId = docEntry;
      break;
    }
  }

  if (purchaseQuotationId) {
    const purchaseOrderLines = await relationshipMapRepository.findPurchaseOrderLinesByBaseEntry(
      db,
      [purchaseQuotationId],
    );
    const purchaseOrderEntries = [
      ...new Set(purchaseOrderLines.map((line: DynRow) => line.docEntry)),
    ];
    if (purchaseOrderEntries.length > 0) {
      purchaseOrderId ??= purchaseOrderEntries[0] as number;
    }
  }

  if (purchaseOrderId) {
    const grpoLines = await relationshipMapRepository.findGrpoLinesByBaseEntry(db, [
      purchaseOrderId,
    ]);
    const grpoEntries = [...new Set(grpoLines.map((line: DynRow) => line.docEntry))];
    if (grpoEntries.length > 0) {
      grpoId ??= grpoEntries[0] as number;
    }
    const apInvoiceLines = await relationshipMapRepository.findApInvoiceLinesByBaseEntry(db, [
      purchaseOrderId,
    ]);
    const apInvoiceEntries = [...new Set(apInvoiceLines.map((line: DynRow) => line.docEntry))];
    if (apInvoiceEntries.length > 0) {
      apInvoiceId ??= apInvoiceEntries[0] as number;
    }
  }

  if (grpoId && !apInvoiceId) {
    const apInvoiceLines = await relationshipMapRepository.findApInvoiceLinesByBaseEntry(db, [
      grpoId,
    ]);
    const apInvoiceEntries = [...new Set(apInvoiceLines.map((line: DynRow) => line.docEntry))];
    if (apInvoiceEntries.length > 0) {
      apInvoiceId = apInvoiceEntries[0] as number;
    }
  }

  if (apInvoiceId) {
    const creditMemoLines = await relationshipMapRepository.findApCreditMemoLinesByBaseEntry(db, [
      apInvoiceId,
    ]);
    const creditMemoEntries = [...new Set(creditMemoLines.map((line: DynRow) => line.docEntry))];
    if (creditMemoEntries.length > 0) {
      apCreditMemoId ??= creditMemoEntries[0] as number;
    }
  }

  const purchaseQuotation = purchaseQuotationId
    ? await relationshipMapRepository.findPurchaseQuotation(db, purchaseQuotationId)
    : null;
  const purchaseOrder = purchaseOrderId
    ? await relationshipMapRepository.findPurchaseOrder(db, purchaseOrderId)
    : null;
  const grpo = grpoId ? await relationshipMapRepository.findGrpo(db, grpoId) : null;
  const apInvoice = apInvoiceId
    ? await relationshipMapRepository.findApInvoice(db, apInvoiceId)
    : null;
  const apCreditMemo = apCreditMemoId
    ? await relationshipMapRepository.findApCreditMemo(db, apCreditMemoId)
    : null;

  return {
    apCreditMemo: apCreditMemo ? [toRelationNode(apCreditMemo)] : [],
    apInvoice: apInvoice ? [toRelationNode(apInvoice)] : [],
    grpo: grpo ? [toRelationNode(grpo)] : [],
    outgoingPayment: outgoingPaymentId
      ? [
          toRelationNode({
            cardCode: null,
            cardName: null,
            docDate: null,
            docNum: null,
            docStatus: null,
            docTotal: null,
            id: outgoingPaymentId,
          }),
        ]
      : [],
    purchaseOrder: purchaseOrder ? [toRelationNode(purchaseOrder)] : [],
    purchaseQuotation: purchaseQuotation ? [toRelationNode(purchaseQuotation)] : [],
  };
};
