import { create, update, cancel } from "./ap-credit-memo.mutations";
import {
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
} from "./ap-credit-memo.queries";

export {
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
} from "./ap-credit-memo.queries";

export const apCreditMemoService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
