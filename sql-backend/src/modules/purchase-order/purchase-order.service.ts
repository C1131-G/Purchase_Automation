import { create, update, cancel } from "./purchase-order.mutations";
import {
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
} from "./purchase-order.queries";

export {
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
} from "./purchase-order.queries";

export const purchaseOrderService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
