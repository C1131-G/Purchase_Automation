import { createPayment, updatePayment, cancelPayment } from "./outgoing-payment.mutations";
import {
  getPayments,
  getPaymentDocNums,
  getPayment,
  getPaymentByDocNum,
  backfillPaymentModes,
  getAccounts,
} from "./outgoing-payment.queries";

export {
  getPayments,
  getPaymentDocNums,
  getPayment,
  getPaymentByDocNum,
  backfillPaymentModes,
  getAccounts,
  createPayment,
  updatePayment,
  cancelPayment,
};

export const outgoingPaymentService = {
  getPayments,
  getPaymentDocNums,
  getPayment,
  getPaymentByDocNum,
  backfillPaymentModes,
  getAccounts,
  createPayment,
  updatePayment,
  cancelPayment,
};
