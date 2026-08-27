import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/features/dashboard/utils/formatters";

import { Button } from "@/components/button";
import { OutgoingPaymentEditSkeleton } from "@/components/skeleton/outgoing-payment-edit-skeleton";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { useDocumentSeriesField } from "@/features/create-pages/create-shared/hooks/use-document-series-field";
import {
  SAP_SERIES_OBJECT,
  toPositiveSeries,
} from "@/features/create-pages/create-shared/utils/document-series";
import {
  notifyActionError,
  notifyActionSuccess,
} from "@/features/create-pages/create-shared/utils/create-feedback-toast";
import {
  clipSapText,
  SAP_FIELD_MAX,
  sapRemarksField,
} from "@/features/create-pages/create-shared/utils/sap-document-fields";
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
  const currencyCode = paymentDetail?.DocCurr || undefined;
  const queryClient = useQueryClient();

  const [remarks, setRemarks] = useState("");
  const [series, setSeries] = useState<number | null>(null);
  const seriesField = useDocumentSeriesField({
    objectCode: SAP_SERIES_OBJECT.outgoingPayment,
    series,
    setSeries,
    disabled: true,
    lockSuggestion: true,
    documentNumber: docNum,
  });

  useEffect(() => {
    const fromDetail = toPositiveSeries(paymentDetail?.Series);
    if (fromDetail != null) {
      setSeries(fromDetail);
    }
  }, [paymentDetail?.Series]);

  useEffect(() => {
    if (paymentDetail?.Remarks) {
      setRemarks(paymentDetail.Remarks);
    }
  }, [paymentDetail?.Remarks]);

  const updateMutation = useMutation({
    mutationFn: () =>
      outgoingPaymentAPI.updatePayment(paymentDetail!.id, {
        ...sapRemarksField(remarks),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outgoingPaymentKeys.detailByDocNum(docNum) });
      queryClient.invalidateQueries({ queryKey: outgoingPaymentKeys.all });
      notifyActionSuccess(`Outgoing payment #${docNum} updated`, "outgoing-payment-update");
    },
    onError: (error: unknown) => {
      notifyActionError(error, "Failed to update outgoing payment.", "outgoing-payment-update");
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
        dashboardName="Purchase Dashboard"
        dashboardUrl="/dashboard"
        breadcrumbParent={{
          label: "Outgoing Payments Data Table",
          to: "/purchase/outgoing-payment",
        }}
        pageTitle={`Update Outgoing Payment ${docNum}`}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-linen-100 bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-ink-900">Vendor Info</h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="cardName"
                  className="mb-1.5 block text-xs font-bold text-neutral-500"
                >
                  Vendor Name
                </label>
                <input
                  id="cardName"
                  type="text"
                  readOnly
                  value={paymentDetail.CardName || ""}
                  className="w-full rounded-xl border border-linen-200 bg-field-silver px-4 py-2.5 text-sm font-medium text-ink-900"
                />
              </div>
              <div>
                <label
                  htmlFor="cardCode"
                  className="mb-1.5 block text-xs font-bold text-neutral-500"
                >
                  Vendor Code
                </label>
                <input
                  id="cardCode"
                  type="text"
                  readOnly
                  value={paymentDetail.CardCode || ""}
                  className="w-full rounded-xl border border-linen-200 bg-field-silver px-4 py-2.5 text-sm font-medium text-ink-900"
                />
              </div>
              <div>
                <label htmlFor="series" className="mb-1.5 block text-xs font-bold text-neutral-500">
                  Series
                </label>
                <input
                  id="series"
                  type="text"
                  readOnly
                  value={seriesField.seriesInput || String(paymentDetail.Series ?? "")}
                  className="w-full rounded-xl border border-linen-200 bg-field-silver px-4 py-2.5 text-sm font-medium text-ink-900"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-linen-100 bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-ink-900">Payment Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="docDate"
                    className="mb-1.5 block text-xs font-bold text-neutral-500"
                  >
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
                    className="w-full rounded-xl border border-linen-200 bg-field-silver px-4 py-2.5 text-sm font-medium text-ink-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="paymentMode"
                    className="mb-1.5 block text-xs font-bold text-neutral-500"
                  >
                    Payment Mode
                  </label>
                  <input
                    id="paymentMode"
                    type="text"
                    readOnly
                    value={paymentDetail.PaymentMode || "N/A"}
                    className="w-full rounded-xl border border-linen-200 bg-field-silver px-4 py-2.5 text-sm font-medium text-ink-900"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="remarks"
                  className="mb-1.5 block text-xs font-bold text-neutral-500"
                >
                  Remarks
                </label>
                <textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(clipSapText(e.target.value, SAP_FIELD_MAX.comments))}
                  maxLength={SAP_FIELD_MAX.comments}
                  rows={2}
                  className="w-full rounded-xl border border-linen-200 bg-field-silver px-4 py-2.5 text-sm font-medium text-ink-900 focus:border-teal-500 focus:bg-surface focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-4 items-start">
          <div className="flex-1 rounded-2xl border border-linen-100 bg-surface shadow-sm overflow-hidden">
            <div className="bg-linen-50 px-5 py-4 border-b border-linen-100">
              <h2 className="text-sm font-bold text-ink-900">Paid Documents</h2>
            </div>

            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-5 py-3 font-bold text-neutral-500 w-12"></th>
                    <th className="px-5 py-3 font-bold text-neutral-500">Type</th>
                    <th className="px-5 py-3 font-bold text-neutral-500">Doc No.</th>
                    <th className="px-5 py-3 font-bold text-neutral-500 text-right">Sum Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linen-50">
                  {isPaymentOnAccount ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-neutral-500">
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
                        <tr key={idx} className="hover:bg-linen-50">
                          <td className="px-5 py-3">
                            <div className="flex h-5 w-5 items-center justify-center rounded border border-teal-600 bg-teal-600 text-surface">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          </td>
                          <td className="px-5 py-3 font-medium text-ink-900">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                inv.InvoiceType === "it_PurchaseInvoice"
                                  ? "bg-teal-50 text-teal-700 ring-teal-700/10"
                                  : "bg-orange-50 text-orange-700 ring-orange-700/10"
                              }`}
                            >
                              {inv.InvoiceType === "it_PurchaseInvoice"
                                ? "A/P Invoice"
                                : "A/P Credit Memo"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-neutral-500">
                            {inv.DocNum || inv.DocEntry}
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-ink-900">
                            {formatCurrency(Number(inv.SumApplied), currencyCode)}
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="w-80 rounded-2xl border border-linen-100 bg-surface shadow-sm p-5 sticky top-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink-900">Payment Summary</h2>
            </div>

            {isPaymentOnAccount && (
              <div className="mb-4 rounded-lg bg-teal-50/50 p-3 border border-teal-100/50">
                <span className="text-sm font-bold text-teal-900">Payment on Account</span>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Cash Sum</span>
                <span className="font-medium text-ink-900">
                  {formatCurrency(
                    Number(paymentDetail.CashSum || 0) +
                      (paymentDetail.PaymentChecks?.filter(
                        (c: { BankCode: string }) => c.BankCode === "CASH",
                      ).reduce(
                        (acc: number, c: { CheckSum: number }) => acc + Number(c.CheckSum || 0),
                        0,
                      ) || 0),
                    currencyCode,
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Check Sum</span>
                <span className="font-medium text-ink-900">
                  {formatCurrency(
                    Number(paymentDetail.CheckSum || 0) ||
                      paymentDetail.PaymentChecks?.filter(
                        (c: { BankCode: string }) => c.BankCode !== "CASH",
                      ).reduce(
                        (acc: number, c: { CheckSum: number }) => acc + Number(c.CheckSum || 0),
                        0,
                      ) ||
                      0,
                    currencyCode,
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Transfer Sum</span>
                <span className="font-medium text-ink-900">
                  {formatCurrency(Number(paymentDetail.TrsfrSum || 0), currencyCode)}
                </span>
              </div>
              <div className="border-t border-linen-100 pt-3 flex justify-between">
                <span className="font-bold text-ink-900">Doc Total</span>
                <span className="text-lg font-black text-teal-600">
                  {formatCurrency(
                    Number(paymentDetail.DocTotal || 0) ||
                      Number(paymentDetail.CashSum || 0) +
                        (paymentDetail.PaymentChecks?.reduce(
                          (acc: number, c: { CheckSum: number }) => acc + Number(c.CheckSum || 0),
                          0,
                        ) || 0) +
                        Number(paymentDetail.TrsfrSum || 0),
                    currencyCode,
                  )}
                </span>
              </div>
            </div>

            <div className="mt-6 border-t border-linen-100 pt-4">
              <Button
                type="button"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || (paymentDetail?.Remarks || "") === remarks}
                className="group h-11 w-full rounded-xl border border-linen-200 bg-surface px-4 py-2 text-sm font-semibold text-ink-900 shadow-sm transition-all hover:bg-linen-50 hover:text-teal-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none cursor-pointer"
                size="md"
                variant="outline"
              >
                <span className="inline-flex items-center justify-center gap-2 w-full">
                  <RefreshCw className="h-4 w-4 transition-all duration-300 group-hover:rotate-180 group-hover:text-teal-600" />
                  {updateMutation.isPending ? "Updating..." : "Update Payment"}
                </span>
              </Button>
            </div>

            {(Number(paymentDetail.CashSum || 0) > 0 ||
              Number(paymentDetail.TrsfrSum || 0) > 0 ||
              paymentDetail.PaymentChecks?.length > 0) && (
              <>
                <div className="mb-4 mt-8 flex items-center justify-between border-t border-linen-100 pt-6">
                  <h2 className="text-sm font-bold text-ink-900">Method Details</h2>
                </div>
                <div className="space-y-3">
                  {/* Cash Card */}
                  {Number(paymentDetail.CashSum || 0) > 0 && (
                    <div className="rounded-xl border border-linen-200 bg-linen-50 p-3 text-xs">
                      <div className="font-bold text-ink-900 mb-2 flex justify-between">
                        <span>Cash Payment</span>
                        <span>
                          {formatCurrency(Number(paymentDetail.CashSum || 0), currencyCode)}
                        </span>
                      </div>
                      {paymentDetail.CashAccount && (
                        <div className="space-y-1.5 text-neutral-500">
                          <div className="flex justify-between">
                            <span>Cash Account</span>
                            <span className="font-medium text-ink-900">
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
                    <div className="rounded-xl border border-linen-200 bg-linen-50 p-3 text-xs">
                      <div className="font-bold text-ink-900 mb-2 flex justify-between">
                        <span>Bank Transfer</span>
                        <span>
                          {formatCurrency(Number(paymentDetail.TrsfrSum || 0), currencyCode)}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-neutral-500">
                        {paymentDetail.TransferDate && (
                          <div className="flex justify-between">
                            <span>Transfer Date</span>
                            <span className="font-medium text-ink-900">
                              {new Date(paymentDetail.TransferDate).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                        )}
                        {paymentDetail.TransferAccount && (
                          <div className="flex justify-between">
                            <span>Transfer Account</span>
                            <span className="font-medium text-ink-900">
                              {paymentDetail.TransferAccount}
                            </span>
                          </div>
                        )}
                        {paymentDetail.TransferReference && (
                          <div className="flex justify-between">
                            <span>Transfer Reference</span>
                            <span className="font-medium text-ink-900">
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
                            className="rounded-xl border border-linen-200 bg-linen-50 p-3 text-xs"
                          >
                            <div className="font-bold text-ink-900 mb-2 flex justify-between">
                              <span>Check Payment</span>
                              <span>{formatCurrency(Number(chk.CheckSum || 0), currencyCode)}</span>
                            </div>
                            <div className="space-y-1.5 text-neutral-500">
                              <div className="flex justify-between">
                                <span>Bank Code</span>
                                <span className="font-medium text-ink-900">
                                  {chk.BankCode || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Check Number</span>
                                <span className="font-medium text-ink-900">
                                  {chk.CheckNumber || "N/A"}
                                </span>
                              </div>
                              {chk.DueDate && (
                                <div className="flex justify-between">
                                  <span>Due Date</span>
                                  <span className="font-medium text-ink-900">
                                    {new Date(chk.DueDate).toLocaleDateString("en-GB")}
                                  </span>
                                </div>
                              )}
                              {countryCode && (
                                <div className="flex justify-between">
                                  <span>Country Code</span>
                                  <span className="font-medium text-ink-900">{countryCode}</span>
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
