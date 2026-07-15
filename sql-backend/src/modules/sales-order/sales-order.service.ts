import { create, update, cancel } from "./sales-order.mutations";
import {
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
} from "./sales-order.queries";

export {
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
} from "./sales-order.queries";

export const salesOrderService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
