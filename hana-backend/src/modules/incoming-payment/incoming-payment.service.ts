import { createPayment, updatePayment, cancelPayment } from "./incoming-payment.mutations";
import {
  getPayments,
  getPaymentDocNums,
  getPayment,
  getPaymentByDocNum,
  getAccounts,
} from "./incoming-payment.queries";

export {
  getPayments,
  getPaymentDocNums,
  getPayment,
  getPaymentByDocNum,
  getAccounts,
  createPayment,
  updatePayment,
  cancelPayment,
};

export const incomingPaymentService = {
  getPayments,
  getPaymentDocNums,
  getPayment,
  getPaymentByDocNum,
  getAccounts,
  createPayment,
  updatePayment,
  cancelPayment,
};
