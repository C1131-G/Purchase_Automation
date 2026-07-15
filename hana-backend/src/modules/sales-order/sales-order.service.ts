import { createSalesOrder, updateSalesOrder, cancelSalesOrder } from "./sales-order.mutations";
import {
  getSalesOrders,
  getSalesOrderDocNums,
  getSalesOrder,
  getSalesOrderByDocNum,
  getSalesEmployees,
  getOpenSalesOrderLines,
} from "./sales-order.queries";

export {
  getSalesOrders,
  getSalesOrderDocNums,
  getSalesOrder,
  getSalesOrderByDocNum,
  getSalesEmployees,
  getOpenSalesOrderLines,
  createSalesOrder,
  updateSalesOrder,
  cancelSalesOrder,
};

export const salesOrderService = {
  getSalesOrders,
  getSalesOrderDocNums,
  getSalesOrder,
  getSalesOrderByDocNum,
  getSalesEmployees,
  getOpenSalesOrderLines,
  createSalesOrder,
  updateSalesOrder,
  cancelSalesOrder,
};
