import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { goeyToast } from 'goey-toast'
import { Check, HandCoins, Search } from 'lucide-react'
import { useState } from 'react'

import { VendorCustomerGrid } from '@/features/create-pages/create-shared/components/grids/vendor-customer-grid'
import { CreatePageWrapper } from '@/features/create-pages/create-shared/components/layout/create-page-wrapper'
import { LookupPopupModal } from '@/features/create-pages/create-shared/components/modals/lookup-popup-modal'
import { toISODate } from '@/features/create-pages/create-shared/utils/create-order.utils'
import { arCreditMemoQueries } from '@/features/table-pages/ar-credit-memo/api/ar-credit-memo.queries'
import { arInvoiceQueries } from '@/features/table-pages/ar-invoices/api/ar-invoice.queries'
import { incomingPaymentAPI } from '@/features/table-pages/incoming-payment/api/incoming-payment.service'

import { useIncomingPaymentLookups } from '../hooks/use-incoming-payment-lookups'
// import { paymentInvoiceSchema } from '../schema'
import { PaymentModal } from './payment-modal'

export function CreateIncomingPaymentForm() {
  const navigate = useNavigate()
  const lookups = useIncomingPaymentLookups()
  const [remarks, setRemarks] = useState('')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Selected documents state
  const [selectedDocs, setSelectedDocs] = useState<
    Record<string, { type: 'it_Invoice' | 'it_CredItnote'; amount: number }>
  >({})

  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false)
  const [isPaymentOnAccount, setIsPaymentOnAccount] = useState(false)
  const [openDocsSearch, setOpenDocsSearch] = useState('')

  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    ...arInvoiceQueries.list({ CardCode: lookups.codeInput, DocStatus: 'Open', limit: 100 }),
    enabled: !!lookups.codeInput,
  })

  const { data: creditMemosData, isLoading: isLoadingCreditMemos } = useQuery({
    ...arCreditMemoQueries.list({ CardCode: lookups.codeInput, DocStatus: 'Open', limit: 100 }),
    enabled: !!lookups.codeInput,
  })

  const createPaymentMutation = useMutation({
    mutationFn: incomingPaymentAPI.createIncomingPayment,
    onSuccess: (data) => {
      goeyToast.success(`Incoming Payment ${data.DocNum} created successfully!`)
      navigate({
        to: '/sales/incoming-payment',
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
      balanceDue: Number(inv.BalanceDue) || 0,
      type: 'it_Invoice' as const,
      label: 'A/R Invoice',
    })) || []

  const creditMemos =
    creditMemosData?.data?.map((cm) => ({
      id: cm.id,
      docNum: cm.DocNum,
      date: cm.DocDate,
      docTotal: Number(cm.DocTotal) || 0,
      balanceDue: Number(cm.BalanceDue) || 0,
      type: 'it_CredItnote' as const,
      label: 'A/R Credit Memo',
    })) || []

  const allDocuments = [...invoices, ...creditMemos].sort(
    (a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime(),
  )

  const filteredDocuments = allDocuments.filter(
    (doc) =>
      doc.balanceDue > 0 &&
      (doc.docNum?.toString().includes(openDocsSearch) ||
        doc.label.toLowerCase().includes(openDocsSearch.toLowerCase())),
  )

  const handleToggleDoc = (
    docEntry: number,
    type: 'it_Invoice' | 'it_CredItnote',
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

  const isSelected = (docEntry: number, type: string) => !!selectedDocs[`${type}-${docEntry}`]

  const { totalInvoices, totalCreditMemos, balanceDue } = Object.values(selectedDocs).reduce(
    (acc, curr) => {
      if (curr.type === 'it_Invoice') acc.totalInvoices += curr.amount
      if (curr.type === 'it_CredItnote') acc.totalCreditMemos += curr.amount

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
    const paymentInvoices = Object.entries(selectedDocs)
      .map(([key, val]) => {
        const docEntry = Number(key.split('-')[1])
        return {
          DocEntry: docEntry,
          SumApplied: Number(val.amount.toFixed(2)),
          InvoiceType: val.type,
        }
      })
      .filter((inv) => inv.SumApplied > 0)

    if (!isPaymentOnAccount && paymentInvoices.length === 0) {
      goeyToast.error('Please select at least one document to pay')
      return
    }

    const surchargeTotal = paymentDetails.SurchargeTotal || 0
    goeyToast.info(`Captured surcharge: ${surchargeTotal}`)

    const cashSum =
      paymentDetails.PaymentChecks?.filter((c) => c.BankCode === 'CASH').reduce(
        (sum, c) => sum + c.CheckSum,
        0,
      ) || 0
    const checkSum =
      paymentDetails.PaymentChecks?.filter((c) => c.BankCode !== 'CASH').reduce(
        (sum, c) => sum + c.CheckSum,
        0,
      ) || 0
    const trsfrSum = 0

    createPaymentMutation.mutate({
      CardCode: lookups.codeInput,
      DocDate: toISODate(today) || '',
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
        rootLabel="Sales"
        breadcrumbParent={{ label: 'Incoming Payments', to: '/sales/incoming-payment' }}
        pageTitle="Create Incoming Payment"
      >
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">Create Incoming Payment</h1>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <VendorCustomerGrid
            loading={lookups.vendorsQuery.isLoading}
            error={lookups.vendorsQuery.isError ? 'Failed to load' : null}
            sectionTitle="Customer Info"
            nameLabel="Customer Name *"
            codeLabel="Customer Code *"
            namePlaceholder="Select Customer"
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
              setSelectedDocs({}) // Clear selection on customer change
            }}
          />

          <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-zinc-900">Payment Details</h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="postingDate"
                  className="mb-1.5 block text-xs font-bold text-zinc-600"
                >
                  Posting Date
                </label>
                <input
                  id="postingDate"
                  type="text"
                  readOnly
                  value={toISODate(today) || ''}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900"
                />
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
              <div className="bg-zinc-50 px-5 py-4 border-b border-zinc-100 flex justify-between items-center">
                <h2 className="text-sm font-bold text-zinc-900">Open Documents</h2>
                <div className="flex items-center gap-3">
                  {(isLoadingInvoices || isLoadingCreditMemos) && (
                    <span className="text-xs text-zinc-500">Loading...</span>
                  )}
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Search className="h-4 w-4 text-zinc-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by Doc No. or Type..."
                      value={openDocsSearch}
                      onChange={(e) => setOpenDocsSearch(e.target.value)}
                      className="w-64 rounded-xl border border-zinc-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-zinc-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-zinc-400"
                    />
                  </div>
                </div>
              </div>

              <div className="max-h-[400px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white sticky top-0 shadow-sm">
                    <tr>
                      <th className="px-5 py-3 font-bold text-zinc-600 w-12"></th>
                      <th className="px-5 py-3 font-bold text-zinc-600">Type</th>
                      <th className="px-5 py-3 font-bold text-zinc-600">Doc No.</th>
                      <th className="px-5 py-3 font-bold text-zinc-600">Date</th>
                      <th className="px-5 py-3 font-bold text-zinc-600 text-right">Total</th>
                      <th className="px-5 py-3 font-bold text-zinc-600 text-right">Balance Due</th>
                      <th className="px-5 py-3 font-bold text-zinc-600 text-right">
                        Total Payment
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {filteredDocuments.length === 0 &&
                    !isLoadingInvoices &&
                    !isLoadingCreditMemos ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-zinc-500">
                          No open documents found.
                        </td>
                      </tr>
                    ) : (
                      filteredDocuments.map((doc) => {
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
                            <td className="px-5 py-3 font-medium text-zinc-900">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                  doc.type === 'it_Invoice'
                                    ? 'bg-blue-50 text-blue-700 ring-blue-700/10'
                                    : 'bg-orange-50 text-orange-700 ring-orange-700/10'
                                }`}
                              >
                                {doc.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-zinc-600">{doc.docNum}</td>
                            <td className="px-5 py-3 text-zinc-600">{doc.date}</td>
                            <td className="px-5 py-3 text-right font-medium text-zinc-900">
                              ${doc.docTotal.toFixed(2)}
                            </td>
                            <td className="px-5 py-3 text-right font-medium text-zinc-900">
                              ${doc.balanceDue.toFixed(2)}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                max={doc.balanceDue}
                                value={
                                  selected
                                    ? (selectedDocs[`${doc.type}-${doc.id}`]?.amount ?? 0)
                                    : doc.balanceDue
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
                  <span className="font-medium text-zinc-900">+ ${totalInvoices.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Applied Credit Memos</span>
                  <span className="font-medium text-orange-600">
                    - ${totalCreditMemos.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-zinc-100 pt-3 flex justify-between">
                  <span className="font-bold text-zinc-900">Balance Due</span>
                  <span className="text-lg font-black text-blue-600">
                    ${Math.max(0, balanceDue).toFixed(2)}
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
          error={lookups.vendorsQuery.isError ? 'Failed to load customers' : null}
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
