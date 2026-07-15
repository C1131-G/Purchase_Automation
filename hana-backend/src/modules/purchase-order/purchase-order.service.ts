import {
  createPurchaseOrder,
  updatePurchaseOrder,
  cancelPurchaseOrder,
} from "./purchase-order.mutations";
import {
  getPurchaseOrders,
  getPurchaseOrderDocNums,
  getPurchaseOrder,
  getPurchaseOrderByDocNum,
} from "./purchase-order.queries";

export {
  getPurchaseOrders,
  getPurchaseOrderDocNums,
  getPurchaseOrder,
  getPurchaseOrderByDocNum,
  createPurchaseOrder,
  updatePurchaseOrder,
  cancelPurchaseOrder,
};

export const purchaseOrderService = {
  getPurchaseOrders,
  getPurchaseOrderDocNums,
  getPurchaseOrder,
  getPurchaseOrderByDocNum,
  createPurchaseOrder,
  updatePurchaseOrder,
  cancelPurchaseOrder,
};
