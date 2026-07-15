import { createGoodsReceipt, updateGoodsReceipt } from "./goods-receipt.mutations";
import {
  getGoodsReceipts,
  getGoodsReceiptByDocNum,
  getGoodsReceiptDocNums,
} from "./goods-receipt.queries";

export {
  getGoodsReceipts,
  getGoodsReceiptByDocNum,
  getGoodsReceiptDocNums,
  createGoodsReceipt,
  updateGoodsReceipt,
};

export const goodsReceiptService = {
  getGoodsReceipts,
  getGoodsReceiptByDocNum,
  getGoodsReceiptDocNums,
  createGoodsReceipt,
  updateGoodsReceipt,
};
