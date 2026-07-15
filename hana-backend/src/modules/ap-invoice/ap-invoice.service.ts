import { createInvoice, updateInvoice, cancelInvoice } from "./ap-invoice.mutations";
import {
  getInvoices,
  getInvoiceDocNums,
  getInvoice,
  getInvoiceByDocNum,
  reopenInvoice,
} from "./ap-invoice.queries";

export {
  getInvoices,
  getInvoiceDocNums,
  getInvoice,
  getInvoiceByDocNum,
  reopenInvoice,
  createInvoice,
  updateInvoice,
  cancelInvoice,
};

export const apInvoiceService = {
  getInvoices,
  getInvoiceDocNums,
  getInvoice,
  getInvoiceByDocNum,
  reopenInvoice,
  createInvoice,
  updateInvoice,
  cancelInvoice,
};
