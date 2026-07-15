import { create, update, cancel, reopen } from "./ap-invoice.mutations";
import { getByDocNum, getById, getDocNums, getList, previewNextDocNum } from "./ap-invoice.queries";

export { getByDocNum, getById, getDocNums, getList, previewNextDocNum } from "./ap-invoice.queries";

export const apInvoiceService = {
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
