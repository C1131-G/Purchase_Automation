import { create, update, cancel, reopen } from "./ar-invoice.mutations";
import { getByDocNum, getById, getDocNums, getList, previewNextDocNum } from "./ar-invoice.queries";

export { getByDocNum, getById, getDocNums, getList, previewNextDocNum } from "./ar-invoice.queries";

export const arInvoiceService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  reopen,
  update,
};
