import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Calendar as CalendarIcon, Check, HandCoins, Minus } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps, ReactElement } from "react";

import { Calendar } from "@/components/calendar/calendar";
import { CreateModalSkeleton } from "@/components/skeleton/create-modal-skeleton";
import { VendorCustomerGrid } from "@/features/create-pages/create-shared/components/grids/vendor-customer-grid";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";

const LookupPopupModal = lazy(() =>
  import("@/features/create-pages/create-shared/components/modals/lookup-popup-modal").then(
    (module) => ({
      default: module.LookupPopupModal,
    }),
  ),
);
import {
  notifyActionError,
  notifyActionSuccess,
} from "@/features/create-pages/create-shared/utils/create-feedback-toast";
import { sapRemarksField } from "@/features/create-pages/create-shared/utils/sap-document-fields";
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import {
  createOutgoingPaymentCreateFilterState,
  matchesOutgoingPaymentCreateFilters,
} from "@/features/create-pages/outgoing-payment-create/components/outgoing-payment-create-filter.types";
import type {
  OutgoingPaymentCreateDocument,
  OutgoingPaymentCreateFilterKey,
  OutgoingPaymentCreateFilterState,
} from "@/features/create-pages/outgoing-payment-create/components/outgoing-payment-create-filter.types";
import {
  apCreditMemoKeys,
  apCreditMemoQueries,
} from "@/features/table-pages/ap-credit-memo/api/ap-credit-memo.queries";
import {
  apInvoiceKeys,
  apInvoiceQueries,
} from "@/features/table-pages/ap-invoices/api/ap-invoice.queries";
import { outgoingPaymentKeys } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.queries";
import { outgoingPaymentAPI } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.service";

import { useOutgoingPaymentLookups } from "../hooks/use-outgoing-payment-lookups";
import { formatCurrency } from "@/features/dashboard/utils/formatters";
import {
  OutgoingPaymentCreateActiveFilter,
  OutgoingPaymentCreateFilters,
} from "./outgoing-payment-create-filters";
import { PaymentModal } from "./payment-modal";

type ActiveDatePicker = "posting" | null;

const CalendarWithBounds = Calendar as unknown as (
  props: ComponentProps<typeof Calendar> & { minDate?: Date; maxDate?: Date },
) => ReactElement;

export function CreateOutgoingPaymentForm() {
  const queryClient = useQueryClient();
  const lookups = useOutgoingPaymentLookups();
  const [remarks, setRemarks] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [docDate, setDocDate] = useState(toISODate(today));
  const [activeDatePicker, setActiveDatePicker] = useState<ActiveDatePicker>(null);
  const docDateContainerRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        activeDatePicker === "posting" &&
        docDateContainerRef.current &&
        !docDateContainerRef.current.contains(e.target as Node)
      ) {
        setActiveDatePicker(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDatePicker]);

  const [selectedDocs, setSelectedDocs] = useState<
    Record<string, { type: "it_PurchaseInvoice" | "it_PurchCredItnote"; amount: number }>
  >({});
  const [tableFilters, setTableFilters] = useState<OutgoingPaymentCreateFilterState>(
    createOutgoingPaymentCreateFilterState(),
  );
  const [activeFilterKey, setActiveFilterKey] = useState<OutgoingPaymentCreateFilterKey | null>(
    null,
  );

  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isPaymentOnAccount, setIsPaymentOnAccount] = useState(false);

  const selectedVendor = useMemo(() => {
    return lookups.vendors.find((v: any) => v.code === lookups.codeInput);
  }, [lookups.vendors, lookups.codeInput]);

  const currencyCode = selectedVendor?.currency || undefined;
  const [editingAmounts, setEditingAmounts] = useState<Record<string, string>>({});
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    ...apInvoiceQueries.list({
      CardCode: lookups.codeInput,
      DocStatus: "Open",
      limit: 100,
    }),
    enabled: !!lookups.codeInput,
    staleTime: 0,
  });

  const { data: creditMemosData, isLoading: isLoadingCreditMemos } = useQuery({
    ...apCreditMemoQueries.list({
      CardCode: lookups.codeInput,
      DocStatus: "Open",
      limit: 100,
    }),
    enabled: !!lookups.codeInput,
    staleTime: 0,
  });

  const createPaymentMutation = useMutation({
    mutationFn: outgoingPaymentAPI.createOutgoingPayment,
    onError: (error: unknown) => {
      notifyActionError(error, "Failed to create outgoing payment.", "outgoing-payment-create");
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: apInvoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: apCreditMemoKeys.all });
      queryClient.invalidateQueries({ queryKey: outgoingPaymentKeys.all });

      const docNum =
        (result as { data?: { DocNum?: number | string }; DocNum?: number | string })?.data
          ?.DocNum ?? (result as { DocNum?: number | string })?.DocNum;
      notifyActionSuccess(
        docNum != null ? `Outgoing payment #${docNum} created` : "Outgoing payment created",
        "outgoing-payment-create",
      );

      setSelectedDocs({});
      setRemarks("");
    },
  });

  const invoices =
    invoicesData?.data?.map((inv) => ({
      balanceDue: Number(inv.BalanceDue ?? inv.DocTotal) || 0,
      date: inv.DocDate,
      docNum: inv.DocNum,
      docTotal: Number(inv.DocTotal) || 0,
      id: inv.id,
      label: "A/P Invoice",
      type: "it_PurchaseInvoice" as const,
    })) || [];

  const creditMemos =
    creditMemosData?.data?.map((cm) => ({
      balanceDue: Number(cm.BalanceDue ?? cm.DocTotal) || 0,
      date: cm.DocDate,
      docNum: cm.DocNum,
      docTotal: Number(cm.DocTotal) || 0,
      id: cm.id,
      label: "A/P Credit Memo",
      type: "it_PurchCredItnote" as const,
    })) || [];

  const allDocuments = [...invoices, ...creditMemos].toSorted(
    (a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime(),
  );

  const documentsWithPayments = useMemo<OutgoingPaymentCreateDocument[]>(
    () =>
      allDocuments.map((doc) => ({
        ...doc,
        totalPayment: selectedDocs[`${doc.type}-${doc.id}`]?.amount ?? doc.balanceDue,
      })),
    [allDocuments, selectedDocs],
  );

  const displayedDocuments = useMemo(
    () =>
      documentsWithPayments.filter(
        (doc) => doc.balanceDue > 0 && matchesOutgoingPaymentCreateFilters(doc, tableFilters),
      ),
    [documentsWithPayments, tableFilters],
  );

  const docsScrollRef = useRef<HTMLDivElement>(null);
  const docsRowVirtualizer = useVirtualizer({
    count: displayedDocuments.length,
    getScrollElement: () => docsScrollRef.current,
    estimateSize: () => 52,
    overscan: 8,
    getItemKey: (index) => {
      const doc = displayedDocuments[index];
      return doc ? `${doc.type}-${doc.id}` : index;
    },
  });
  const virtualDocRows = docsRowVirtualizer.getVirtualItems();
  const docsTotalSize = docsRowVirtualizer.getTotalSize();
  const docsPaddingTop = virtualDocRows.length > 0 ? (virtualDocRows[0]?.start ?? 0) : 0;
  const docsPaddingBottom =
    virtualDocRows.length > 0
      ? docsTotalSize - (virtualDocRows[virtualDocRows.length - 1]?.end ?? 0)
      : 0;

  const isSelected = (docEntry: number, type: string) => !!selectedDocs[`${type}-${docEntry}`];
  const allSelected =
    displayedDocuments.length > 0 &&
    displayedDocuments.every((doc) => isSelected(doc.id, doc.type));
  const someSelected = displayedDocuments.some((doc) => isSelected(doc.id, doc.type));

  useEffect(() => {
    if (!selectAllCheckboxRef.current) {
      return;
    }
    selectAllCheckboxRef.current.indeterminate = someSelected && !allSelected;
  }, [allSelected, someSelected]);

  const handleToggleAllDocs = () => {
    setSelectedDocs((prev) => {
      const next = { ...prev };
      for (const doc of displayedDocuments) {
        const key = `${doc.type}-${doc.id}`;
        if (allSelected) {
          delete next[key];
        } else if (!next[key]) {
          next[key] = { amount: doc.balanceDue, type: doc.type };
        }
      }
      return next;
    });
  };

  const handleToggleDoc = (
    docEntry: number,
    type: "it_PurchaseInvoice" | "it_PurchCredItnote",
    total: number,
  ) => {
    const key = `${type}-${docEntry}`;
    setSelectedDocs((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { amount: total, type };
      }
      return next;
    });
  };

  const { totalInvoices, totalCreditMemos, balanceDue } = Object.values(selectedDocs).reduce(
    (acc, curr) => {
      if (curr.type === "it_PurchaseInvoice") {
        acc.totalInvoices += curr.amount;
      }
      if (curr.type === "it_PurchCredItnote") {
        acc.totalCreditMemos += curr.amount;
      }

      acc.balanceDue = acc.totalInvoices - acc.totalCreditMemos;
      return acc;
    },
    { balanceDue: 0, totalCreditMemos: 0, totalInvoices: 0 },
  );

  const handlePaymentSubmit = (paymentDetails: {
    PaymentChecks?: {
      BankCode: string;
      Branch: string;
      CheckNumber: number;
      CheckSum: number;
      CheckAccount?: string;
      CountryCode?: string;
      BankName?: string;
      GLAccount?: string;
    }[];
    CashAccount?: string | null;
    TransferSum?: number;
    TransferDate?: string;
    TransferAccount?: string;
    TransferReference?: string;
  }) => {
    const totalCash =
      paymentDetails.PaymentChecks?.filter((c) => c.BankCode === "CASH").reduce(
        (sum, c) => sum + c.CheckSum,
        0,
      ) || 0;
    const totalChecks =
      paymentDetails.PaymentChecks?.filter((c) => c.BankCode !== "CASH").reduce(
        (sum, c) => sum + c.CheckSum,
        0,
      ) || 0;

    const selectedList = Object.entries(selectedDocs).map(([key, val]) => ({
      id: Number(key.split("-")[1]),
      ...val,
    }));

    const selectedInvoices = selectedList
      .filter((d) => d.type === "it_PurchaseInvoice")
      .toSorted((a, b) => {
        const docA = invoices.find((i) => i.id === a.id);
        const docB = invoices.find((i) => i.id === b.id);
        return new Date(docA?.date || 0).getTime() - new Date(docB?.date || 0).getTime();
      });

    const selectedCreditMemos = selectedList.filter((d) => d.type === "it_PurchCredItnote");
    const totalCredit = selectedCreditMemos.reduce((sum, cm) => sum + cm.amount, 0);

    let amountToDistribute =
      totalCash + totalChecks + (paymentDetails.TransferSum || 0) + totalCredit;
    const paymentInvoices: {
      DocEntry: number;
      SumApplied: number;
      InvoiceType: "it_PurchaseInvoice" | "it_PurchCredItnote";
    }[] = [];

    for (const cm of selectedCreditMemos) {
      paymentInvoices.push({
        DocEntry: cm.id,
        InvoiceType: cm.type,
        SumApplied: Number(cm.amount.toFixed(2)),
      });
    }

    for (const inv of selectedInvoices) {
      if (amountToDistribute <= 0) {
        break;
      }
      const toApply = Math.min(inv.amount, amountToDistribute);
      paymentInvoices.push({
        DocEntry: inv.id,
        InvoiceType: inv.type,
        SumApplied: Number(toApply.toFixed(2)),
      });
      amountToDistribute -= toApply;
    }

    if (
      !isPaymentOnAccount &&
      paymentInvoices.length === 0 &&
      totalCash === 0 &&
      totalChecks === 0 &&
      (paymentDetails.TransferSum || 0) === 0
    ) {
      return;
    }

    const currentDocIds = new Set(allDocuments.map((d) => `${d.type}-${d.id}`));
    const staleKeys = Object.keys(selectedDocs).filter((k) => !currentDocIds.has(k));
    if (staleKeys.length > 0) {
      return;
    }

    const cashSum = totalCash;
    const checkSum = totalChecks;
    const transferSum = paymentDetails.TransferSum || 0;

    if (transferSum > 0 && !paymentDetails.TransferReference?.trim()) {
      return;
    }

    const payload = {
      CardCode: lookups.codeInput,
      CashSum: cashSum,
      ...(cashSum > 0 ? { CashAccount: paymentDetails.CashAccount } : {}),
      CheckSum: checkSum,
      DocDate: docDate || "",
      PaymentInvoices: paymentInvoices,
      ...sapRemarksField(remarks),
      TrsfrSum: transferSum,
      ...(transferSum > 0 && paymentDetails.TransferDate
        ? { TransferDate: paymentDetails.TransferDate }
        : {}),
      ...(transferSum > 0 && paymentDetails.TransferAccount
        ? { TransferAccount: paymentDetails.TransferAccount }
        : {}),
      ...(transferSum > 0 && paymentDetails.TransferReference
        ? { TransferReference: paymentDetails.TransferReference.trim() }
        : {}),
      ...(paymentDetails.PaymentChecks ? { PaymentChecks: paymentDetails.PaymentChecks } : {}),
    };
    createPaymentMutation.mutate(payload);
  };

  return (
    <div className="contents">
      <CreatePageWrapper
        dashboardName="Purchase Dashboard"
        dashboardUrl="/dashboard"
        breadcrumbParent={{
          label: "Outgoing Payments Data Table",
          to: "/purchase/outgoing-payment",
        }}
        pageTitle="Create Outgoing Payment"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <VendorCustomerGrid
            loading={lookups.vendorsQuery.isLoading}
            error={lookups.vendorsQuery.isError ? "Failed to load" : null}
            sectionTitle="Vendor Info"
            nameLabel="Vendor Name *"
            codeLabel="Vendor Code *"
            namePlaceholder="Select Vendor"
            codePlaceholder="Select Code"
            nameInput={lookups.nameInput}
            codeInput={lookups.codeInput}
            nameFocused={lookups.nameFocused}
            codeFocused={lookups.codeFocused}
            nameSuggestions={lookups.nameSuggestions}
            codeSuggestions={lookups.codeSuggestions}
            onNameChange={lookups.handleVendorNameChange}
            onCodeChange={lookups.handleVendorCodeChange}
            onNameFocus={() => lookups.setNameFocused(true)}
            onCodeFocus={() => lookups.setCodeFocused(true)}
            onNameBlur={() => setTimeout(() => lookups.setNameFocused(false), 120)}
            onCodeBlur={() => setTimeout(() => lookups.setCodeFocused(false), 120)}
            onOpenNamePopup={() => lookups.openPopup("vendor-name")}
            onOpenCodePopup={() => lookups.openPopup("vendor-code")}
            onSelectVendor={(v) => {
              lookups.selectVendor(v);
              setSelectedDocs({});
            }}
            onSelectVendorByName={(v) => {
              lookups.selectVendor(v);
              setSelectedDocs({});
              setTimeout(() => {
                window.scrollTo({
                  behavior: "smooth",
                  top: document.body.scrollHeight,
                });
              }, 150);
            }}
            nameInputRef={nameInputRef}
          />

          <div className="rounded-2xl border border-linen-100 bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-ink-900">Payment Details</h2>
            <div className="space-y-4">
              <div ref={docDateContainerRef} className="relative">
                <label
                  htmlFor="postingDate"
                  className="mb-1.5 block text-xs font-bold text-neutral-500"
                >
                  Posting Date
                </label>
                <button
                  id="postingDate"
                  type="button"
                  onClick={() =>
                    setActiveDatePicker((prev) => (prev === "posting" ? null : "posting"))
                  }
                  className="relative flex h-10 w-full items-center justify-start rounded-xl border border-linen-200 bg-field-silver pl-3 pr-10 text-sm text-ink-900 outline-none transition hover:bg-surface focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
                >
                  <span>{toDisplayDate(docDate)}</span>
                  <div className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-linen-200 bg-surface text-neutral-500 transition hover:bg-linen-100">
                    <CalendarIcon className="h-3 w-3" />
                  </div>
                </button>
                {activeDatePicker === "posting" && (
                  <div className="absolute left-0 top-full z-40 mt-2">
                    <CalendarWithBounds
                      mode="single"
                      selected={parseISODate(docDate)}
                      maxDate={today}
                      onSelect={(value) => {
                        if (!(value instanceof Date)) {
                          return;
                        }
                        setDocDate(toISODate(value));
                        setActiveDatePicker(null);
                      }}
                    />
                  </div>
                )}
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
                  maxLength={254}
                  onChange={(e) => setRemarks(e.target.value.slice(0, 254))}
                  placeholder="Enter payment remarks..."
                  rows={2}
                  className="w-full rounded-xl border border-linen-200 bg-field-silver px-4 py-2.5 text-sm font-medium text-ink-900 outline-none focus:border-teal-500 focus:bg-surface focus:ring-4 focus:ring-teal-500/10"
                />
              </div>
            </div>
          </div>
        </div>

        {lookups.codeInput && (
          <div className="mt-4 flex gap-4 items-start">
            <div className="flex-1 rounded-2xl border border-linen-100 bg-surface shadow-sm overflow-hidden">
              <div className="flex items-center justify-end gap-2 border-b border-linen-100 bg-linen-50 px-5 py-3 flex-wrap">
                <OutgoingPaymentCreateActiveFilter
                  value={tableFilters}
                  onChange={setTableFilters}
                  activeFilterKey={activeFilterKey}
                  documents={documentsWithPayments}
                />
                <OutgoingPaymentCreateFilters
                  value={tableFilters}
                  onReset={() => {
                    setTableFilters(createOutgoingPaymentCreateFilterState());
                    setActiveFilterKey(null);
                  }}
                  activeFilterKey={activeFilterKey}
                  onActiveFilterChange={setActiveFilterKey}
                  onChange={setTableFilters}
                />
              </div>

              <div ref={docsScrollRef} className="max-h-[400px] min-h-[300px] overflow-auto">
                {isLoadingInvoices || isLoadingCreditMemos ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface sticky top-0">
                      <tr>
                        <th className="w-12 px-5 py-3">
                          <div className="h-3 w-5 rounded bg-linen-100 animate-pulse" />
                        </th>
                        <th className="px-5 py-3">
                          <div className="h-3 w-16 rounded bg-linen-100 animate-pulse" />
                        </th>
                        <th className="px-5 py-3">
                          <div className="h-3 w-20 rounded bg-linen-100 animate-pulse" />
                        </th>
                        <th className="px-5 py-3">
                          <div className="h-3 w-16 rounded bg-linen-100 animate-pulse" />
                        </th>
                        <th className="px-5 py-3 text-right">
                          <div className="h-3 w-16 rounded bg-linen-100 animate-pulse ml-auto" />
                        </th>
                        <th className="px-5 py-3 text-right">
                          <div className="h-3 w-16 rounded bg-linen-100 animate-pulse ml-auto" />
                        </th>
                        <th className="px-5 py-3 text-right">
                          <div className="h-3 w-20 rounded bg-linen-100 animate-pulse ml-auto" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-linen-50">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <tr key={`skel-row-${i}`}>
                          <td className="px-5 py-3">
                            <div className="h-4 w-5 rounded bg-linen-100 animate-pulse" />
                          </td>
                          <td className="px-5 py-3">
                            <div className="h-4 w-20 rounded bg-linen-100 animate-pulse" />
                          </td>
                          <td className="px-5 py-3">
                            <div className="h-4 w-14 rounded bg-linen-100 animate-pulse" />
                          </td>
                          <td className="px-5 py-3">
                            <div className="h-4 w-22 rounded bg-linen-100 animate-pulse" />
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="h-4 w-18 rounded bg-linen-100 animate-pulse ml-auto" />
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="h-4 w-18 rounded bg-linen-100 animate-pulse ml-auto" />
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="h-4 w-24 rounded bg-linen-100 animate-pulse ml-auto" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface sticky top-0 z-10">
                      <tr>
                        <th className="w-12 px-5 py-3 font-bold text-neutral-500">
                          <label className="relative flex cursor-pointer items-center justify-center">
                            <input
                              ref={selectAllCheckboxRef}
                              type="checkbox"
                              aria-label="Select all documents"
                              checked={allSelected}
                              onChange={handleToggleAllDocs}
                              className="absolute h-full w-full cursor-pointer opacity-0"
                            />
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                                allSelected || (someSelected && !allSelected)
                                  ? "border-teal-600 bg-teal-600 text-surface"
                                  : "border-linen-200 bg-surface text-transparent"
                              }`}
                            >
                              {someSelected && !allSelected ? (
                                <Minus className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </div>
                          </label>
                        </th>
                        <th className="px-5 py-3 font-medium text-neutral-500">DOC TYPE</th>
                        <th className="px-5 py-3 font-medium text-neutral-500">DOC NUMBER</th>
                        <th className="px-5 py-3 font-medium text-neutral-500">DOC DATE</th>
                        <th className="px-5 py-3 font-medium text-neutral-500 text-right">
                          DOC TOTAL
                        </th>
                        <th className="px-5 py-3 font-medium text-neutral-500 text-right">
                          BALANCE DUE
                        </th>
                        <th className="px-5 py-3 font-medium text-neutral-500 text-right">
                          TOTAL PAYMENT
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-linen-50">
                      {displayedDocuments.length === 0 &&
                      !isLoadingInvoices &&
                      !isLoadingCreditMemos ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center text-neutral-500">
                            No open documents found.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {docsPaddingTop > 0 ? (
                            <tr aria-hidden="true">
                              <td
                                colSpan={7}
                                style={{ height: docsPaddingTop, padding: 0, border: 0 }}
                              />
                            </tr>
                          ) : null}
                          {virtualDocRows.map((virtualRow) => {
                            const doc = displayedDocuments[virtualRow.index];
                            if (!doc) {
                              return null;
                            }
                            const selected = isSelected(doc.id, doc.type);
                            return (
                              <tr
                                key={`${doc.type}-${doc.id}`}
                                onClick={() => handleToggleDoc(doc.id, doc.type, doc.balanceDue)}
                                className={`cursor-pointer transition-colors ${
                                  selected ? "bg-teal-50/50" : "hover:bg-linen-50"
                                }`}
                              >
                                <td className="px-5 py-3">
                                  <div
                                    className={`flex h-5 w-5 items-center justify-center rounded border ${
                                      selected
                                        ? "bg-teal-600 border-teal-600 text-surface"
                                        : "border-linen-200 bg-surface text-transparent"
                                    }`}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                </td>
                                <td className="px-5 py-3 font-medium">
                                  <span
                                    className={`text-sm ${
                                      doc.type === "it_PurchaseInvoice"
                                        ? "text-teal-700"
                                        : "text-orange-700"
                                    }`}
                                  >
                                    {doc.label}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-neutral-500">{doc.docNum}</td>
                                <td className="px-5 py-3 text-neutral-500">
                                  {toDisplayDate(doc.date)}
                                </td>
                                <td className="px-5 py-3 text-right font-medium text-ink-900">
                                  {doc.docTotal.toFixed(2)}
                                </td>
                                <td className="px-5 py-3 text-right font-medium text-ink-900">
                                  {doc.balanceDue.toFixed(2)}
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={
                                      selected &&
                                      editingAmounts[`${doc.type}-${doc.id}`] !== undefined
                                        ? editingAmounts[`${doc.type}-${doc.id}`]
                                        : (selected
                                            ? (selectedDocs[`${doc.type}-${doc.id}`]?.amount ??
                                              doc.balanceDue)
                                            : doc.balanceDue
                                          ).toFixed(2)
                                    }
                                    onFocus={() => {
                                      if (!selected) {
                                        return;
                                      }
                                      const key = `${doc.type}-${doc.id}`;
                                      const current = (
                                        selectedDocs[key]?.amount ?? doc.balanceDue
                                      ).toFixed(2);
                                      setEditingAmounts((prev) => ({
                                        ...prev,
                                        [key]: current,
                                      }));
                                    }}
                                    onChange={(e) => {
                                      if (!selected) {
                                        return;
                                      }
                                      const raw = e.target.value.replaceAll(/[^0-9.]/g, "");
                                      setEditingAmounts((prev) => ({
                                        ...prev,
                                        [`${doc.type}-${doc.id}`]: raw,
                                      }));
                                    }}
                                    onBlur={() => {
                                      if (!selected) {
                                        return;
                                      }
                                      const key = `${doc.type}-${doc.id}`;
                                      const raw = editingAmounts[key] || "";
                                      const val = Number(raw);
                                      if (isNaN(val) || val < 0.01) {
                                        setSelectedDocs((prev) => ({
                                          ...prev,
                                          [key]: {
                                            amount: doc.balanceDue,
                                            type: doc.type,
                                          },
                                        }));
                                      } else {
                                        const fixed = Math.min(
                                          Math.round(val * 100) / 100,
                                          doc.balanceDue,
                                        );
                                        setSelectedDocs((prev) => ({
                                          ...prev,
                                          [key]: {
                                            amount: fixed,
                                            type: doc.type,
                                          },
                                        }));
                                      }
                                      setEditingAmounts((prev) => {
                                        const next = { ...prev };
                                        delete next[key];
                                        return next;
                                      });
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={!selected}
                                    className={`w-28 rounded-lg border px-3 py-1.5 text-right text-sm font-bold text-ink-900 outline-none transition-all ${
                                      selected
                                        ? "border-linen-200 bg-surface"
                                        : "border-transparent bg-transparent"
                                    }`}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                          {docsPaddingBottom > 0 ? (
                            <tr aria-hidden="true">
                              <td
                                colSpan={7}
                                style={{ height: docsPaddingBottom, padding: 0, border: 0 }}
                              />
                            </tr>
                          ) : null}
                        </>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="w-80 rounded-2xl border border-linen-100 bg-surface shadow-sm p-5 sticky top-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-900">Payment Summary</h2>
              </div>
              <div className="mb-4 rounded-lg bg-teal-50/50 p-3 border border-teal-100/50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPaymentOnAccount}
                    onChange={(e) => setIsPaymentOnAccount(e.target.checked)}
                    className="w-4 h-4 rounded border-linen-200 text-teal-600 focus:ring-teal-600/20"
                  />
                  <span className="text-sm font-bold text-teal-900">Payment on Account</span>
                </label>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Selected Invoices</span>
                  <span className="font-medium text-ink-900">
                    + {formatCurrency(totalInvoices, currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Applied Credit Memos</span>
                  <span className="font-medium text-orange-600">
                    - {formatCurrency(totalCreditMemos, currencyCode)}
                  </span>
                </div>
                <div className="border-t border-linen-100 pt-3 flex justify-between">
                  <span className="font-bold text-ink-900">Balance Due</span>
                  <span className="text-lg font-black text-teal-600">
                    {formatCurrency(Math.max(0, balanceDue), currencyCode)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setPaymentModalOpen(true)}
                disabled={
                  (!isPaymentOnAccount && balanceDue <= 0) || createPaymentMutation.isPending
                }
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-surface shadow-lg shadow-green-200 transition-all hover:bg-green-700 active:scale-95 disabled:bg-linen-100 disabled:text-neutral-400 disabled:shadow-none disabled:cursor-not-allowed"
              >
                <HandCoins className="h-5 w-5" />
                {createPaymentMutation.isPending ? "Processing..." : "Payment Method"}
              </button>
            </div>
          </div>
        )}

        {lookups.modalOpen ? (
          <Suspense
            fallback={
              <CreateModalSkeleton title="Loading vendor lookup" panelClassName="max-w-xl" />
            }
          >
            <LookupPopupModal
              open={lookups.modalOpen}
              mode={lookups.modalMode}
              search={lookups.modalMode === "vendor-name" ? lookups.nameInput : lookups.codeInput}
              results={
                lookups.modalMode === "vendor-name"
                  ? lookups.nameSuggestions
                  : lookups.codeSuggestions
              }
              loading={lookups.vendorsQuery.isLoading}
              error={lookups.vendorsQuery.isError ? "Failed to load vendors" : null}
              onRetry={() => lookups.vendorsQuery.refetch()}
              onSearchChange={(v) =>
                lookups.modalMode === "vendor-name"
                  ? lookups.setNameInput(v)
                  : lookups.setCodeInput(v)
              }
              onSearchSync={() => {}}
              onClose={() => lookups.setModalOpen(false)}
              onSelect={(item) => lookups.selectVendor(item)}
            />
          </Suspense>
        ) : null}

        <PaymentModal
          open={isPaymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          balanceDue={Math.max(0, balanceDue)}
          isPaymentOnAccount={isPaymentOnAccount}
          onPaymentSubmit={handlePaymentSubmit}
          currencyCode={currencyCode}
        />
      </CreatePageWrapper>
    </div>
  );
}
