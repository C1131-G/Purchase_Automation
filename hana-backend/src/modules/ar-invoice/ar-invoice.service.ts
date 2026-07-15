import { createInvoice, updateInvoice, cancelInvoice } from "./ar-invoice.mutations";
import {
  getInvoices,
  getInvoiceDocNums,
  getInvoice,
  getInvoiceByDocNum,
  resolveBinAllocations,
  reopenInvoice,
} from "./ar-invoice.queries";

export {
  getInvoices,
  getInvoiceDocNums,
  getInvoice,
  getInvoiceByDocNum,
  resolveBinAllocations,
  reopenInvoice,
  createInvoice,
  updateInvoice,
  cancelInvoice,
};

export const arInvoiceService = {
  getInvoices,
  getInvoiceDocNums,
  getInvoice,
  getInvoiceByDocNum,
  resolveBinAllocations,
  reopenInvoice,
  createInvoice,
  updateInvoice,
  cancelInvoice,
};
