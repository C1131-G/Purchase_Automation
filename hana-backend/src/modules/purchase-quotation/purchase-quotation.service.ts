import {
  createPurchaseQuotation,
  updatePurchaseQuotation,
  cancelPurchaseQuotation,
} from "./purchase-quotation.mutations";
import {
  getPurchaseQuotations,
  getPurchaseQuotationDocNums,
  getPurchaseQuotation,
  getPurchaseQuotationByDocNum,
  getOpenPurchaseQuotationLines,
} from "./purchase-quotation.queries";

export {
  getPurchaseQuotations,
  getPurchaseQuotationDocNums,
  getPurchaseQuotation,
  getPurchaseQuotationByDocNum,
  getOpenPurchaseQuotationLines,
  createPurchaseQuotation,
  updatePurchaseQuotation,
  cancelPurchaseQuotation,
};

export const purchaseQuotationService = {
  getPurchaseQuotations,
  getPurchaseQuotationDocNums,
  getPurchaseQuotation,
  getPurchaseQuotationByDocNum,
  getOpenPurchaseQuotationLines,
  createPurchaseQuotation,
  updatePurchaseQuotation,
  cancelPurchaseQuotation,
};
