import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { goeyToast } from 'goey-toast'
import { Calendar as CalendarIcon, Check, HandCoins, Minus } from 'lucide-react'
import { type ComponentProps, type ReactElement, useEffect, useMemo, useRef, useState } from 'react'

import { Calendar } from '@/components/calendar/calendar'
import { VendorCustomerGrid } from '@/features/create-pages/create-shared/components/grids/vendor-customer-grid'
import { CreatePageWrapper } from '@/features/create-pages/create-shared/components/layout/create-page-wrapper'
import { LookupPopupModal } from '@/features/create-pages/create-shared/components/modals/lookup-popup-modal'
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from '@/features/create-pages/create-shared/utils/create-order.utils'
import {
  apCreditMemoKeys,
  apCreditMemoQueries,
} from '@/features/table-pages/ap-credit-memo/api/ap-credit-memo.queries'
import {
  apInvoiceKeys,
  apInvoiceQueries,
} from '@/features/table-pages/ap-invoices/api/ap-invoice.queries'
import { outgoingPaymentAPI } from '@/features/table-pages/outgoing-payment/api/outgoing-payment.service'
import {
  createOutgoingPaymentCreateFilterState,
  OutgoingPaymentCreateActiveFilter,
  matchesOutgoingPaymentCreateFilters,
  OutgoingPaymentCreateFilters,
  type OutgoingPaymentCreateDocument,
  type OutgoingPaymentCreateFilterKey,
  type OutgoingPaymentCreateFilterState,
} from './outgoing-payment-create-filters'

import { useOutgoingPaymentLookups } from '../hooks/use-outgoing-payment-lookups'
import { PaymentModal } from './payment-modal'

type ActiveDatePicker = 'posting' | null

const CalendarWithBounds = Calendar as unknown as (
  props: ComponentProps<typeof Calendar> & { minDate?: Date; maxDate?: Date },
) => ReactElement

export function CreateOutgoingPaymentForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const lookups = useOutgoingPaymentLookups()
  const [remarks, setRemarks] = useState('')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [docDate, setDocDate] = useState(toISODate(today))
  const [activeDatePicker, setActiveDatePicker] = useState<ActiveDatePicker>(null)
  const docDateContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        activeDatePicker === 'posting' &&
        docDateContainerRef.current &&
        !docDateContainerRef.current.contains(e.target as Node)
      ) {
        setActiveDatePicker(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeDatePicker])

  const [selectedDocs, setSelectedDocs] = useState<
    Record<string, { type: 'it_PurchaseInvoice' | 'it_PurchCredItnote'; amount: number }>
  >({})
  const [tableFilters, setTableFilters] = useState<OutgoingPaymentCreateFilterState>(
    createOutgoingPaymentCreateFilterState(),
  )
  const [activeFilterKey, setActiveFilterKey] = useState<OutgoingPaymentCreateFilterKey | null>(
    null,
  )

  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false)
  const [isPaymentOnAccount, setIsPaymentOnAccount] = useState(false)
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null)

  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    ...apInvoiceQueries.list({ CardCode: lookups.codeInput, DocStatus: 'Open', limit: 100 }),
    enabled: !!lookups.codeInput,
    staleTime: 0,
  })

  const { data: creditMemosData, isLoading: isLoadingCreditMemos } = useQuery({
    ...apCreditMemoQueries.list({ CardCode: lookups.codeInput, DocStatus: 'Open', limit: 100 }),
    enabled: !!lookups.codeInput,
    staleTime: 0,
  })

  const createPaymentMutation = useMutation({
    mutationFn: outgoingPaymentAPI.createOutgoingPayment,
    onSuccess: (data) => {
      const docNum = data.data?.DocNum || data.data?.DocEntry || 'successfully'
      goeyToast.success(`Outgoing Payment ${docNum} created successfully!`)

      queryClient.invalidateQueries({ queryKey: apInvoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: apCreditMemoKeys.all })

      navigate({
        to: '/purchase/outgoing-payment',
        search: { page: 1, limit: 10, sorting: [], columnVisibility: {} },
      })
    },
    onError: (error) => {
      goeyToast.error(error instanceof Error ? error.message : 'Failed to create payment')
    },
  })

  const invoices =
    invoicesData?.data?.map((inv) => ({
      id: inv.id,
      docNum: inv.DocNum,
      date: inv.DocDate,
      docTotal: Number(inv.DocTotal) || 0,
      balanceDue: Number(inv.DocTotal) || 0,
      type: 'it_PurchaseInvoice' as const,
      label: 'A/P Invoice',
    })) || []

  const creditMemos =
    creditMemosData?.data?.map((cm) => ({
      id: cm.id,
      docNum: cm.DocNum,
      date: cm.DocDate,
      docTotal: Number(cm.DocTotal) || 0,
      balanceDue: Number(cm.DocTotal) || 0,
      type: 'it_PurchCredItnote' as const,
      label: 'A/P Credit Memo',
    })) || []

  const allDocuments = [...invoices, ...creditMemos].sort(
    (a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime(),
  )

  const documentsWithPayments = useMemo<OutgoingPaymentCreateDocument[]>(
    () =>
      allDocuments.map((doc) => ({
        ...doc,
        totalPayment: selectedDocs[`${doc.type}-${doc.id}`]?.amount ?? doc.balanceDue,
      })),
    [allDocuments, selectedDocs],
  )

  const displayedDocuments = useMemo(
    () =>
      documentsWithPayments.filter(
        (doc) => doc.balanceDue > 0 && matchesOutgoingPaymentCreateFilters(doc, tableFilters),
      ),
    [documentsWithPayments, tableFilters],
  )

  const isSelected = (docEntry: number, type: string) => !!selectedDocs[`${type}-${docEntry}`]
  const allSelected =
    displayedDocuments.length > 0 &&
    displayedDocuments.every((doc) => isSelected(doc.id, doc.type))
  const someSelected = displayedDocuments.some((doc) => isSelected(doc.id, doc.type))

  useEffect(() => {
    if (!selectAllCheckboxRef.current) return
    selectAllCheckboxRef.current.indeterminate = someSelected && !allSelected
  }, [allSelected, someSelected])

  const handleToggleAllDocs = () => {
    setSelectedDocs((prev) => {
      const next = { ...prev }
      for (const doc of displayedDocuments) {
        const key = `${doc.type}-${doc.id}`
        if (allSelected) {
          delete next[key]
        } else if (!next[key]) {
          next[key] = { type: doc.type, amount: doc.balanceDue }
        }
      }
      return next
    })
  }

  const handleToggleDoc = (
    docEntry: number,
    type: 'it_PurchaseInvoice' | 'it_PurchCredItnote',
    total: number,
  ) => {
    const key = `${type}-${docEntry}`
    setSelectedDocs((prev) => {
      const next = { ...prev }
      if (next[key]) {
        delete next[key]
      } else {
        next[key] = { type, amount: total }
      }
      return next
    })
  }

  const { totalInvoices, totalCreditMemos, balanceDue } = Object.values(selectedDocs).reduce(
    (acc, curr) => {
      if (curr.type === 'it_PurchaseInvoice') acc.totalInvoices += curr.amount
      if (curr.type === 'it_PurchCredItnote') acc.totalCreditMemos += curr.amount

      acc.balanceDue = acc.totalInvoices - acc.totalCreditMemos
      return acc
    },
    { totalInvoices: 0, totalCreditMemos: 0, balanceDue: 0 },
  )

  const handlePaymentSubmit = (paymentDetails: {
    PaymentCreditCards: {
      CreditCard: number
      CreditSum: number
      VoucherNum: string
      CreditCardNumber?: string
      CardValidUntil?: string
    }[]
    PaymentChecks?: {
      BankCode: string
      Branch: string
      CheckNumber: number
      CheckSum: number
      CheckAccount?: string
      Endorse?: 'tYES' | 'tNO'
    }[]
    SurchargeTotal?: number
  }) => {
    const totalCash =
      paymentDetails.PaymentChecks?.filter((c) => c.BankCode === 'CASH').reduce(
        (sum, c) => sum + c.CheckSum,
        0,
      ) || 0
    const totalChecks =
      paymentDetails.PaymentChecks?.filter((c) => c.BankCode !== 'CASH').reduce(
        (sum, c) => sum + c.CheckSum,
        0,
      ) || 0
    const totalCards =
      paymentDetails.PaymentCreditCards?.reduce((sum, c) => sum + c.CreditSum, 0) || 0
    const surcharge = paymentDetails.SurchargeTotal || 0

    const totalPaid = totalCash + totalChecks + totalCards - surcharge

    const selectedList = Object.entries(selectedDocs).map(([key, val]) => ({
      id: Number(key.split('-')[1]),
      ...val,
    }))

    const selectedInvoices = selectedList
      .filter((d) => d.type === 'it_PurchaseInvoice')
      .sort((a, b) => {
        const docA = invoices.find((i) => i.id === a.id)
        const docB = invoices.find((i) => i.id === b.id)
        return new Date(docA?.date || 0).getTime() - new Date(docB?.date || 0).getTime()
      })

    const selectedCreditMemos = selectedList.filter((d) => d.type === 'it_PurchCredItnote')
    const totalCredit = selectedCreditMemos.reduce((sum, cm) => sum + cm.amount, 0)

    let amountToDistribute = totalPaid + totalCredit
    const paymentInvoices: {
      DocEntry: number
      SumApplied: number
      InvoiceType: 'it_PurchaseInvoice' | 'it_PurchCredItnote'
    }[] = []

    for (const cm of selectedCreditMemos) {
      paymentInvoices.push({
        DocEntry: cm.id,
        SumApplied: Number(cm.amount.toFixed(2)),
        InvoiceType: cm.type,
      })
    }

    for (const inv of selectedInvoices) {
      if (amountToDistribute <= 0) break
      const toApply = Math.min(inv.amount, amountToDistribute)
      paymentInvoices.push({
        DocEntry: inv.id,
        SumApplied: Number(toApply.toFixed(2)),
        InvoiceType: inv.type,
      })
      amountToDistribute -= toApply
    }

    if (!isPaymentOnAccount && paymentInvoices.length === 0) {
      goeyToast.error('Please select at least one document to pay')
      return
    }

    const surchargeTotal = paymentDetails.SurchargeTotal || 0
    goeyToast.info(`Captured surcharge: ${surchargeTotal}`)

    const cashSum = totalCash
    const checkSum = totalChecks
    const trsfrSum = 0
    createPaymentMutation.mutate({
      CardCode: lookups.codeInput,
      DocDate: docDate || '',
      Remarks: remarks,
      CashSum: cashSum,
      CheckSum: checkSum,
      TrsfrSum: trsfrSum,
      PaymentCreditCards: paymentDetails.PaymentCreditCards,
      SurchargeTotal: surchargeTotal,
      PaymentInvoices: paymentInvoices,
      ...(paymentDetails.PaymentChecks ? { PaymentChecks: paymentDetails.PaymentChecks } : {}),
    })
  }

  return (
    <div className="contents" onClickCapture={() => goeyToast.dismiss()}>
      <CreatePageWrapper
        rootLabel="Purchase"
        breadcrumbParent={{ label: 'Outgoing Payments', to: '/purchase/outgoing-payment' }}
        pageTitle="Create Outgoing Payment"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <VendorCustomerGrid
            loading={lookups.vendorsQuery.isLoading}
            error={lookups.vendorsQuery.isError ? 'Failed to load' : null}
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
            onOpenNamePopup={() => lookups.openPopup('vendor-name')}
            onOpenCodePopup={() => lookups.openPopup('vendor-code')}
            onSelectVendor={(v) => {
              lookups.selectVendor(v)
              setSelectedDocs({})
            }}
          />

          <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-zinc-900">Payment Details</h2>
            <div className="space-y-4">
              <div ref={docDateContainerRef} className="relative">
                <label
                  htmlFor="postingDate"
                  className="mb-1.5 block text-xs font-bold text-zinc-600"
                >
                  Posting Date
                </label>
                <button
                  id="postingDate"
                  type="button"
                  onClick={() =>
                    setActiveDatePicker((prev) => (prev === 'posting' ? null : 'posting'))
                  }
                  className="relative flex h-10 w-full items-center justify-start rounded-xl border border-zinc-200 bg-zinc-50 pl-3 pr-10 text-sm text-zinc-800 outline-none transition hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                >
                  <span>{toDisplayDate(docDate)}</span>
                  <div className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100">
                    <CalendarIcon className="h-3 w-3" />
                  </div>
                </button>
                {activeDatePicker === 'posting' && (
                  <div className="absolute left-0 top-full z-40 mt-2">
                    <CalendarWithBounds
                      mode="single"
                      selected={parseISODate(docDate)}
                      maxDate={today}
                      onSelect={(value) => {
                        if (!(value instanceof Date)) return
                        setDocDate(toISODate(value))
                        setActiveDatePicker(null)
                      }}
                    />
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="remarks" className="mb-1.5 block text-xs font-bold text-zinc-600">
                  Remarks
                </label>
                <textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter payment remarks..."
                  rows={2}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>
          </div>
        </div>

        {lookups.codeInput && (
          <div className="mt-4 flex gap-4 items-start">
            <div className="flex-1 rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-end gap-2 border-b border-zinc-100 bg-zinc-50 px-5 py-3 flex-wrap">
                <OutgoingPaymentCreateActiveFilter
                  documents={documentsWithPayments}
                  value={tableFilters}
                  onChange={setTableFilters}
                  activeFilterKey={activeFilterKey}
                />
                <OutgoingPaymentCreateFilters
                  value={tableFilters}
                  onReset={() => {
                    setTableFilters(createOutgoingPaymentCreateFilterState())
                    setActiveFilterKey(null)
                  }}
                  activeFilterKey={activeFilterKey}
                  onActiveFilterChange={setActiveFilterKey}
                />
              </div>

              <div className="max-h-[400px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white sticky top-0">
                    <tr>
                      <th className="w-12 px-5 py-3 font-bold text-zinc-600">
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
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-zinc-300 bg-white text-transparent'
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
                      <th className="px-5 py-3 font-bold text-zinc-600">Doc Type</th>
                      <th className="px-5 py-3 font-bold text-zinc-600">Doc Number</th>
                      <th className="px-5 py-3 font-bold text-zinc-600">Doc Date</th>
                      <th className="px-5 py-3 font-bold text-zinc-600 text-right">Doc Total</th>
                      <th className="px-5 py-3 font-bold text-zinc-600 text-right">Balance Due</th>
                      <th className="px-5 py-3 font-bold text-zinc-600 text-right">
                        Total Payment
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {displayedDocuments.length === 0 &&
                    !isLoadingInvoices &&
                    !isLoadingCreditMemos ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-zinc-500">
                          No open documents found.
                        </td>
                      </tr>
                    ) : (
                      displayedDocuments.map((doc) => {
                        const selected = isSelected(doc.id, doc.type)
                        return (
                          <tr
                            key={`${doc.type}-${doc.id}`}
                            onClick={() => handleToggleDoc(doc.id, doc.type, doc.balanceDue)}
                            className={`cursor-pointer transition-colors ${
                              selected ? 'bg-blue-50/50' : 'hover:bg-zinc-50'
                            }`}
                          >
                            <td className="px-5 py-3">
                              <div
                                className={`flex h-5 w-5 items-center justify-center rounded border ${
                                  selected
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-zinc-300 bg-white text-transparent'
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </div>
                            </td>
                            <td className="px-5 py-3 font-medium">
                              <span
                                className={`text-sm ${
                                  doc.type === 'it_PurchaseInvoice'
                                    ? 'text-blue-700'
                                    : 'text-orange-700'
                                }`}
                              >
                                {doc.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-zinc-600">{doc.docNum}</td>
                            <td className="px-5 py-3 text-zinc-600">{toDisplayDate(doc.date)}</td>
                            <td className="px-5 py-3 text-right font-medium text-zinc-900">
                              FJD {doc.docTotal.toFixed(2)}
                            </td>
                            <td className="px-5 py-3 text-right font-medium text-zinc-900">
                              FJD {doc.balanceDue.toFixed(2)}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                max={doc.balanceDue}
                                value={
                                  selected
                                    ? (selectedDocs[`${doc.type}-${doc.id}`]?.amount ?? 0).toFixed(2)
                                    : doc.balanceDue.toFixed(2)
                                }
                                onChange={(e) => {
                                  const val = Number(e.target.value)
                                  if (val >= 0) {
                                    setSelectedDocs((prev) => ({
                                      ...prev,
                                      [`${doc.type}-${doc.id}`]: { type: doc.type, amount: val },
                                    }))
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                disabled={!selected}
                                className={`w-28 rounded-lg border px-3 py-1.5 text-right text-sm font-bold ${
                                  selected
                                    ? 'border-blue-200 bg-white text-blue-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                    : 'border-transparent bg-transparent text-zinc-400'
                                } outline-none transition-all`}
                              />
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="w-80 rounded-2xl border border-zinc-100 bg-white shadow-sm p-5 sticky top-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-900">Payment Summary</h2>
              </div>
              <div className="mb-4 rounded-lg bg-blue-50/50 p-3 border border-blue-100/50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPaymentOnAccount}
                    onChange={(e) => setIsPaymentOnAccount(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600/20"
                  />
                  <span className="text-sm font-bold text-blue-900">Payment on Account</span>
                </label>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Selected Invoices</span>
                  <span className="font-medium text-zinc-900">
                    + FJD {totalInvoices.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Applied Credit Memos</span>
                  <span className="font-medium text-orange-600">
                    - FJD {totalCreditMemos.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-zinc-100 pt-3 flex justify-between">
                  <span className="font-bold text-zinc-900">Balance Due</span>
                  <span className="text-lg font-black text-blue-600">
                    FJD {Math.max(0, balanceDue).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setPaymentModalOpen(true)}
                disabled={
                  (!isPaymentOnAccount && balanceDue <= 0) || createPaymentMutation.isPending
                }
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-green-200 transition-all hover:bg-green-700 active:scale-95 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none disabled:cursor-not-allowed"
              >
                <HandCoins className="h-5 w-5" />
                {createPaymentMutation.isPending ? 'Processing...' : 'Payment Method'}
              </button>
            </div>
          </div>
        )}

        <LookupPopupModal
          open={lookups.modalOpen}
          mode={lookups.modalMode}
          search={lookups.modalMode === 'vendor-name' ? lookups.nameInput : lookups.codeInput}
          results={
            lookups.modalMode === 'vendor-name' ? lookups.nameSuggestions : lookups.codeSuggestions
          }
          loading={lookups.vendorsQuery.isLoading}
          error={lookups.vendorsQuery.isError ? 'Failed to load vendors' : null}
          onRetry={() => lookups.vendorsQuery.refetch()}
          onSearchChange={(v) =>
            lookups.modalMode === 'vendor-name' ? lookups.setNameInput(v) : lookups.setCodeInput(v)
          }
          onSearchSync={() => {}}
          onClose={() => lookups.setModalOpen(false)}
          onSelect={(item) => lookups.selectVendor(item)}
        />

        <PaymentModal
          open={isPaymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          balanceDue={Math.max(0, balanceDue)}
          isPaymentOnAccount={isPaymentOnAccount}
          onPaymentSubmit={handlePaymentSubmit}
        />
      </CreatePageWrapper>
    </div>
  )
}
