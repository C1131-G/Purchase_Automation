import { create, update, cancel } from "./ar-credit-memo.mutations";
import {
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
} from "./ar-credit-memo.queries";

export {
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
} from "./ar-credit-memo.queries";

export const arCreditMemoService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
