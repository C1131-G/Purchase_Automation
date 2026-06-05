import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { goeyToast } from "goey-toast";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/button";
import { OutgoingPaymentEditSkeleton } from "@/components/skeleton/outgoing-payment-edit-skeleton";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import {
  outgoingPaymentKeys,
  outgoingPaymentQueries,
} from "@/features/table-pages/outgoing-payment/api/outgoing-payment.queries";
import { outgoingPaymentAPI } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.service";

export function OutgoingPaymentEdit({ docNum }: { docNum: string }) {
  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery(outgoingPaymentQueries.detail(docNum));

  const paymentDetail = response?.data;
  const queryClient = useQueryClient();

  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (paymentDetail?.Remarks) {
      setRemarks(paymentDetail.Remarks);
    }
  }, [paymentDetail?.Remarks]);

  const updateMutation = useMutation({
    mutationFn: () => outgoingPaymentAPI.updatePayment(paymentDetail!.id, { Remarks: remarks }),
    onSuccess: () => {
      goeyToast.success("Payment updated successfully");
      queryClient.invalidateQueries({ queryKey: outgoingPaymentKeys.detailByDocNum(docNum) });
      queryClient.invalidateQueries({ queryKey: outgoingPaymentKeys.all });
    },
    onError: (err) => {
      goeyToast.error(err instanceof Error ? err.message : "Failed to update payment");
    },
  });

  if (isLoading) {
    return <OutgoingPaymentEditSkeleton />;
  }

  if (isError || !paymentDetail) {
    return (
      <div className="p-8 text-center text-red-500">
        {error instanceof Error ? error.message : "Failed to load payment details."}
      </div>
    );
  }

  const isPaymentOnAccount = paymentDetail.PaymentInvoices?.length === 0;

  return (
    <div className="contents">
      <CreatePageWrapper
        rootLabel="Purchase"
        breadcrumbParent={{
          label: "Outgoing Payments",
          to: "/purchase/outgoing-payment",
        }}
        pageTitle={`Outgoing Payment ${docNum}`}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-zinc-900">Vendor Info</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="cardName" className="mb-1.5 block text-xs font-bold text-zinc-600">
                  Vendor Name
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
                  Vendor Code
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
                                inv.InvoiceType === "it_PurchaseInvoice"
                                  ? "bg-blue-50 text-blue-700 ring-blue-700/10"
                                  : "bg-orange-50 text-orange-700 ring-orange-700/10"
                              }`}
                            >
                              {inv.InvoiceType === "it_PurchaseInvoice"
                                ? "A/P Invoice"
                                : "A/P Credit Memo"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-zinc-600">{inv.DocNum || inv.DocEntry}</td>
                          <td className="px-5 py-3 text-right font-medium text-zinc-900">
                            FJD {Number(inv.SumApplied).toFixed(2)}
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
                  FJD{" "}
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
                  FJD{" "}
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
                  FJD {Number(paymentDetail.TrsfrSum || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t border-zinc-100 pt-3 flex justify-between">
                <span className="font-bold text-zinc-900">Doc Total</span>
                <span className="text-lg font-black text-blue-600">
                  FJD{" "}
                  {(
                    Number(paymentDetail.DocTotal || 0) ||
                    Number(paymentDetail.CashSum || 0) +
                      (paymentDetail.PaymentChecks?.reduce(
                        (acc: number, c: { CheckSum: number }) => acc + Number(c.CheckSum || 0),
                        0,
                      ) || 0) +
                      Number(paymentDetail.TrsfrSum || 0)
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-6 border-t border-zinc-100 pt-4">
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || (paymentDetail?.Remarks || "") === remarks}
                className="w-full"
                size="md"
                variant="primary"
              >
                {updateMutation.isPending ? "Updating..." : "Update Payment"}
              </Button>
            </div>

            {(Number(paymentDetail.CashSum || 0) > 0 ||
              Number(paymentDetail.TrsfrSum || 0) > 0 ||
              paymentDetail.PaymentChecks?.length > 0) && (
              <>
                <div className="mb-4 mt-8 flex items-center justify-between border-t border-zinc-100 pt-6">
                  <h2 className="text-sm font-bold text-zinc-900">Method Details</h2>
                </div>
                <div className="space-y-3">
                  {/* Cash Card */}
                  {Number(paymentDetail.CashSum || 0) > 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
                      <div className="font-bold text-zinc-800 mb-2 flex justify-between">
                        <span>Cash Payment</span>
                        <span>FJD {Number(paymentDetail.CashSum || 0).toFixed(2)}</span>
                      </div>
                      {paymentDetail.CashAccount && (
                        <div className="space-y-1.5 text-zinc-600">
                          <div className="flex justify-between">
                            <span>Cash Account</span>
                            <span className="font-medium text-zinc-900">
                              {paymentDetail.CashAccount}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transfer Card */}
                  {(Number(paymentDetail.TrsfrSum || 0) > 0 ||
                    paymentDetail.TransferDate ||
                    paymentDetail.TransferAccount ||
                    paymentDetail.TransferReference) && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
                      <div className="font-bold text-zinc-800 mb-2 flex justify-between">
                        <span>Bank Transfer</span>
                        <span>FJD {Number(paymentDetail.TrsfrSum || 0).toFixed(2)}</span>
                      </div>
                      <div className="space-y-1.5 text-zinc-600">
                        {paymentDetail.TransferDate && (
                          <div className="flex justify-between">
                            <span>Transfer Date</span>
                            <span className="font-medium text-zinc-900">
                              {new Date(paymentDetail.TransferDate).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                        )}
                        {paymentDetail.TransferAccount && (
                          <div className="flex justify-between">
                            <span>Transfer Account</span>
                            <span className="font-medium text-zinc-900">
                              {paymentDetail.TransferAccount}
                            </span>
                          </div>
                        )}
                        {paymentDetail.TransferReference && (
                          <div className="flex justify-between">
                            <span>Transfer Reference</span>
                            <span className="font-medium text-zinc-900">
                              {paymentDetail.TransferReference}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cheque Cards */}
                  {paymentDetail.PaymentChecks?.length > 0 &&
                    paymentDetail.PaymentChecks.map(
                      (
                        chk: {
                          BankCode: string;
                          CheckSum: number;
                          CheckNumber: number;
                          DueDate?: string;
                          CountryCode?: string;
                          CountryCod?: string;
                        },
                        idx: number,
                      ) => {
                        const countryCode = chk.CountryCode ?? chk.CountryCod;
                        return (
                          <div
                            key={`chk-${idx}`}
                            className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs"
                          >
                            <div className="font-bold text-zinc-800 mb-2 flex justify-between">
                              <span>Check Payment</span>
                              <span>FJD {Number(chk.CheckSum || 0).toFixed(2)}</span>
                            </div>
                            <div className="space-y-1.5 text-zinc-600">
                              <div className="flex justify-between">
                                <span>Bank Code</span>
                                <span className="font-medium text-zinc-900">
                                  {chk.BankCode || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Check Number</span>
                                <span className="font-medium text-zinc-900">
                                  {chk.CheckNumber || "N/A"}
                                </span>
                              </div>
                              {chk.DueDate && (
                                <div className="flex justify-between">
                                  <span>Due Date</span>
                                  <span className="font-medium text-zinc-900">
                                    {new Date(chk.DueDate).toLocaleDateString("en-GB")}
                                  </span>
                                </div>
                              )}
                              {countryCode && (
                                <div className="flex justify-between">
                                  <span>Country Code</span>
                                  <span className="font-medium text-zinc-900">{countryCode}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      },
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
