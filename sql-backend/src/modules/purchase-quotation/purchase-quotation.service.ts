import { create, update, cancel } from "./purchase-quotation.mutations";
import {
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
} from "./purchase-quotation.queries";

export {
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
} from "./purchase-quotation.queries";

export const purchaseQuotationService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
