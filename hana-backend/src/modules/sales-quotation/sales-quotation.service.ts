import {
  createSalesQuotation,
  updateSalesQuotation,
  cancelSalesQuotation,
} from "./sales-quotation.mutations";
import {
  getSalesQuotations,
  getSalesQuotationDocNums,
  getSalesQuotation,
  getSalesQuotationByDocNum,
  getOpenSalesQuotationLines,
} from "./sales-quotation.queries";

export {
  getSalesQuotations,
  getSalesQuotationDocNums,
  getSalesQuotation,
  getSalesQuotationByDocNum,
  getOpenSalesQuotationLines,
  createSalesQuotation,
  updateSalesQuotation,
  cancelSalesQuotation,
};

export const salesQuotationService = {
  getSalesQuotations,
  getSalesQuotationDocNums,
  getSalesQuotation,
  getSalesQuotationByDocNum,
  getOpenSalesQuotationLines,
  createSalesQuotation,
  updateSalesQuotation,
  cancelSalesQuotation,
};
