import { createGRPO, updateGRPO, cancelGRPO } from "./grpo.mutations";
import {
  getGRPOs,
  getGRPODocNums,
  getAvailablePOs,
  getPODetail,
  getGRPO,
  getGRPOByDocNum,
} from "./grpo.queries";

export {
  getGRPOs,
  getGRPODocNums,
  getAvailablePOs,
  getPODetail,
  getGRPO,
  getGRPOByDocNum,
  createGRPO,
  updateGRPO,
  cancelGRPO,
};

export const grpoService = {
  getGRPOs,
  getGRPODocNums,
  getAvailablePOs,
  getPODetail,
  getGRPO,
  getGRPOByDocNum,
  createGRPO,
  updateGRPO,
  cancelGRPO,
};
