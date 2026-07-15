import { create, update, cancel } from "./grpo.mutations";
import { getByDocNum, getById, getDocNums, getList, previewNextDocNum } from "./grpo.queries";

export { getByDocNum, getById, getDocNums, getList, previewNextDocNum } from "./grpo.queries";

export const grpoService = {
  cancel,
  create,
  getByDocNum,
  getById,
  getDocNums,
  getList,
  previewNextDocNum,
  update,
};
