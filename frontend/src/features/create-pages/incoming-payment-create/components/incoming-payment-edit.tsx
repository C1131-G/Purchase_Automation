import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { goeyToast } from "goey-toast";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import {
  incomingPaymentKeys,
  incomingPaymentQueries,
} from "@/features/table-pages/incoming-payment/api/incoming-payment.queries";
import { incomingPaymentAPI } from "@/features/table-pages/incoming-payment/api/incoming-payment.service";

export function IncomingPaymentEdit({ docNum }: { docNum: string }) {
  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery(incomingPaymentQueries.detail(docNum));

  const paymentDetail = response?.data;
  const queryClient = useQueryClient();

  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (paymentDetail?.Remarks) {
      setRemarks(paymentDetail.Remarks);
    }
  }, [paymentDetail?.Remarks]);

  const updateMutation = useMutation({
    mutationFn: () => incomingPaymentAPI.updatePayment(paymentDetail!.id, { Remarks: remarks }),
    onSuccess: () => {
      goeyToast.success("Payment updated successfully");
      queryClient.invalidateQueries({ queryKey: incomingPaymentKeys.detail(docNum) });
      queryClient.invalidateQueries({ queryKey: incomingPaymentKeys.all });
    },
    onError: (err) => {
      goeyToast.error(err instanceof Error ? err.message : "Failed to update payment");
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-500">Loading payment details...</div>;
  }

  if (isError || !paymentDetail) {
    return (
      <div className="p-8 text-center text-red-500">
        {error instanceof Error ? error.message : "Failed to load payment details."}
      </div>
    );
  }

  // Determine if it's payment on account (no invoices selected)
  const isPaymentOnAccount = paymentDetail.PaymentInvoices?.length === 0;

  return (
    <div className="contents">
      <CreatePageWrapper
        rootLabel="Sales"
        breadcrumbParent={{
          label: "Incoming Payments",
          to: "/sales/incoming-payment",
        }}
        pageTitle={`Incoming Payment #${docNum}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">Incoming Payment #{docNum}</h1>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {/* Read-only Customer Info */}
          <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-zinc-900">Customer Info</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="cardName" className="mb-1.5 block text-xs font-bold text-zinc-600">
                  Customer Name
                </label>
                <input
                  id="cardName"
                  type="text"
                  readOnly
                  value={paymentDetail.CardName || ""}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900"
                />
              </div>
              <div>
                <label htmlFor="cardCode" className="mb-1.5 block text-xs font-bold text-zinc-600">
                  Customer Code
                </label>
                <input
                  id="cardCode"
                  type="text"
                  readOnly
                  value={paymentDetail.CardCode || ""}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900"
                />
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-zinc-900">Payment Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="docDate" className="mb-1.5 block text-xs font-bold text-zinc-600">
                    Posting Date
                  </label>
                  <input
                    id="docDate"
                    type="text"
                    readOnly
                    value={
                      paymentDetail.DocDate
                        ? new Date(paymentDetail.DocDate).toLocaleDateString("en-GB")
                        : ""
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="paymentMode"
                    className="mb-1.5 block text-xs font-bold text-zinc-600"
                  >
                    Payment Mode
                  </label>
                  <input
                    id="paymentMode"
                    type="text"
                    readOnly
                    value={paymentDetail.PaymentMode || "N/A"}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="remarks" className="mb-1.5 block text-xs font-bold text-zinc-600">
                  Remarks
                </label>
                <textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-4 items-start">
          <div className="flex-1 rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
            <div className="bg-zinc-50 px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-bold text-zinc-900">Paid Documents</h2>
            </div>

            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-5 py-3 font-bold text-zinc-600 w-12"></th>
                    <th className="px-5 py-3 font-bold text-zinc-600">Type</th>
                    <th className="px-5 py-3 font-bold text-zinc-600">Doc No.</th>
                    <th className="px-5 py-3 font-bold text-zinc-600 text-right">Sum Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {isPaymentOnAccount ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-zinc-500">
                        This payment was made on account (no specific documents applied).
                      </td>
                    </tr>
                  ) : (
                    paymentDetail.PaymentInvoices?.map(
                      (
                        inv: {
                          InvoiceType: string;
                          DocNum?: number;
                          DocEntry: number;
                          SumApplied: number;
                        },
                        idx: number,
                      ) => (
                        <tr key={idx} className="hover:bg-zinc-50">
                          <td className="px-5 py-3">
                            <div className="flex h-5 w-5 items-center justify-center rounded border border-blue-600 bg-blue-600 text-white">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          </td>
                          <td className="px-5 py-3 font-medium text-zinc-900">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                inv.InvoiceType === "it_Invoice"
                                  ? "bg-blue-50 text-blue-700 ring-blue-700/10"
                                  : "bg-orange-50 text-orange-700 ring-orange-700/10"
                              }`}
                            >
                              {inv.InvoiceType === "it_Invoice" ? "A/R Invoice" : "A/R Credit Memo"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-zinc-600">{inv.DocNum || inv.DocEntry}</td>
                          <td className="px-5 py-3 text-right font-medium text-zinc-900">
                            ${Number(inv.SumApplied).toFixed(2)}
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="w-80 rounded-2xl border border-zinc-100 bg-white shadow-sm p-5 sticky top-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900">Payment Summary</h2>
            </div>

            {isPaymentOnAccount && (
              <div className="mb-4 rounded-lg bg-blue-50/50 p-3 border border-blue-100/50">
                <span className="text-sm font-bold text-blue-900">Payment on Account</span>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Cash Sum</span>
                <span className="font-medium text-zinc-900">
                  $
                  {(
                    Number(paymentDetail.CashSum || 0) +
                    (paymentDetail.PaymentChecks?.filter(
                      (c: { BankCode: string }) => c.BankCode === "CASH",
                    ).reduce(
                      (acc: number, c: { CheckSum: number }) => acc + Number(c.CheckSum || 0),
                      0,
                    ) || 0)
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Check Sum</span>
                <span className="font-medium text-zinc-900">
                  $
                  {(
                    Number(paymentDetail.CheckSum || 0) ||
                    paymentDetail.PaymentChecks?.filter(
                      (c: { BankCode: string }) => c.BankCode !== "CASH",
                    ).reduce(
                      (acc: number, c: { CheckSum: number }) => acc + Number(c.CheckSum || 0),
                      0,
                    ) ||
                    0
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Transfer Sum</span>
                <span className="font-medium text-zinc-900">
                  ${Number(paymentDetail.TrsfrSum || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Card Sum</span>
                <span className="font-medium text-zinc-900">
                  $
                  {(
                    paymentDetail.PaymentCreditCards?.reduce(
                      (acc: number, card: { CreditSum: number }) =>
                        acc + Number(card.CreditSum || 0),
                      0,
                    ) || 0
                  ).toFixed(2)}
                </span>
              </div>
              {Number(paymentDetail.BankChargeAmount || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Bank Charge</span>
                  <span className="font-medium text-zinc-900">
                    ${Number(paymentDetail.BankChargeAmount).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t border-zinc-100 pt-3 flex justify-between">
                <span className="font-bold text-zinc-900">Doc Total</span>
                <span className="text-lg font-black text-blue-600">
                  $
                  {(
                    (Number(paymentDetail.DocTotal || 0) ||
                      Number(paymentDetail.CashSum || 0) +
                        (paymentDetail.PaymentChecks?.reduce(
                          (acc: number, c: { CheckSum: number }) => acc + Number(c.CheckSum || 0),
                          0,
                        ) || 0) +
                        Number(paymentDetail.TrsfrSum || 0) +
                        (paymentDetail.PaymentCreditCards?.reduce(
                          (acc: number, card: { CreditSum: number }) =>
                            acc + Number(card.CreditSum || 0),
                          0,
                        ) || 0)) + Number(paymentDetail.BankChargeAmount || 0)
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-6 border-t border-zinc-100 pt-4">
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || (paymentDetail?.Remarks || "") === remarks}
                className="w-full rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-zinc-800 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Updating..." : "Update Payment"}
              </button>
            </div>

            {/* Payment Methods Breakdown */}
            {(paymentDetail.PaymentChecks?.length > 0 ||
              paymentDetail.PaymentCreditCards?.length > 0) && (
              <>
                <div className="mb-4 mt-8 flex items-center justify-between border-t border-zinc-100 pt-6">
                  <h2 className="text-sm font-bold text-zinc-900">Method Details</h2>
                </div>
                <div className="space-y-3">
                  {paymentDetail.PaymentChecks?.map(
                    (
                      chk: {
                        BankCode: string;
                        CheckSum: number;
                        CheckNumber: number;
                      },
                      idx: number,
                    ) => (
                      <div
                        key={`chk-${idx}`}
                        className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs"
                      >
                        <div className="font-bold text-zinc-800 mb-1 flex justify-between">
                          <span>Check Payment</span>
                          <span>${Number(chk.CheckSum || 0).toFixed(2)}</span>
                        </div>
                        <div className="text-zinc-600 flex justify-between">
                          <span>Bank: {chk.BankCode || "N/A"}</span>
                          <span>No: {chk.CheckNumber || "N/A"}</span>
                        </div>
                      </div>
                    ),
                  )}
                  {paymentDetail.PaymentCreditCards?.map(
                    (
                      card: {
                        CardName?: string;
                        CreditCard?: number;
                        CreditSum: number;
                        VoucherNum?: string;
                      },
                      idx: number,
                    ) => (
                      <div
                        key={`card-${idx}`}
                        className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs"
                      >
                        <div className="font-bold text-zinc-800 mb-1 flex justify-between">
                          <span>{paymentDetail.PaymentMode || "Credit Card"}</span>
                          <span>${Number(card.CreditSum || 0).toFixed(2)}</span>
                        </div>
                        <div className="text-zinc-600 flex justify-between">
                          <span>Card: {card.CardName || card.CreditCard || "N/A"}</span>
                          <span>Voucher: {card.VoucherNum || "N/A"}</span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CreatePageWrapper>
    </div>
  );
}
