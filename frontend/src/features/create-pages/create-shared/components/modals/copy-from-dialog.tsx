import { useQuery } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, FileText, StickyNote, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/button'
import { purchaseOrderAPI } from '@/features/table-pages/purchase-orders/api/purchase-order.service'
import { grpoAPI } from '@/features/table-pages/grpo/api/grpo.service'
import { apInvoiceAPI } from '@/features/table-pages/ap-invoices/api/ap-invoice.service'
import { type CreateLookupOption } from '@/features/create-pages/create-shared/utils/create-order.types'

interface CopyFromDialogProps {
  open: boolean
  onClose: () => void
  sourceDocTypes: ('PurchaseOrder' | 'GoodsReceiptPO' | 'APInvoice')[]
  vendorCode: string
  vendorName: string
  onSelectDocuments: (
    selected: Array<{ docNum: string; docType: 'PurchaseOrder' | 'GoodsReceiptPO' | 'APInvoice' }>,
  ) => void
}

interface DocumentOption extends CreateLookupOption {
  docType: 'PurchaseOrder' | 'GoodsReceiptPO' | 'APInvoice'
  docEntry?: number
}

type DialogStep = 'select-type' | 'select-document'

export function CopyFromDialog({
  open,
  onClose,
  sourceDocTypes,
  vendorCode,
  vendorName,
  onSelectDocuments,
}: CopyFromDialogProps) {
  const [step, setStep] = useState<DialogStep>('select-type')
  const [selectedDocType, setSelectedDocType] = useState<
    'PurchaseOrder' | 'GoodsReceiptPO' | 'APInvoice' | null
  >(null)
  const [search, setSearch] = useState('')
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set())

  // Document type options
  const docTypeOptions = sourceDocTypes.map((docType) => ({
    code: docType,
    name:
      docType === 'PurchaseOrder'
        ? 'Purchase Order'
        : docType === 'GoodsReceiptPO'
          ? 'GRPO'
          : 'AP Invoice',
    icon:
      docType === 'PurchaseOrder' ? (
        <FileText className="h-4 w-4" />
      ) : docType === 'GoodsReceiptPO' ? (
        <StickyNote className="h-4 w-4" />
      ) : (
        <FileText className="h-4 w-4" />
      ),
  }))

  // Fetch documents for selected type
  const {
    data: documents,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['copy-from-documents', vendorCode, selectedDocType],
    queryFn: async () => {
      if (!selectedDocType) return []

      const label =
        selectedDocType === 'PurchaseOrder'
          ? 'PO'
          : selectedDocType === 'GoodsReceiptPO'
            ? 'GRPO'
            : 'AP Invoice'

      try {
        // Use the app's API service layer instead of raw fetch
        const result =
          selectedDocType === 'PurchaseOrder'
            ? await purchaseOrderAPI.getPurchaseOrders({
                CardCode: vendorCode,
                DocStatus: 'Open',
                limit: 100,
              })
            : selectedDocType === 'GoodsReceiptPO'
              ? await grpoAPI.getGRPOs({
                  CardCode: vendorCode,
                  DocStatus: 'Open',
                  limit: 100,
                })
              : await apInvoiceAPI.getAPInvoices({
                  CardCode: vendorCode,
                  DocStatus: 'Open',
                  limit: 100,
                })

        const docs = result.data || []

        return docs.map((doc: any) => ({
          code: String(doc.DocNum),
          name: `${label} ${doc.DocNum} - ${doc.DocDate ? new Date(doc.DocDate).toLocaleDateString() : ''}`,
          docType: selectedDocType,
          docEntry: doc.DocEntry,
        })) as DocumentOption[]
      } catch (err) {
        console.error('Failed to fetch documents for Copy From:', err)
        return []
      }
    },
    enabled: step === 'select-document' && Boolean(selectedDocType && vendorCode),
    retry: false,
  })

  const filteredDocuments = (documents || []).filter((doc) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return doc.code.toLowerCase().includes(term) || doc.name.toLowerCase().includes(term)
  })

  const handleSelectDocType = (docType: 'PurchaseOrder' | 'GoodsReceiptPO' | 'APInvoice') => {
    setSelectedDocType(docType)
    setStep('select-document')
    setSearch('')
    setSelectedDocs(new Set())
  }

  const handleToggleDocument = (docCode: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev)
      if (next.has(docCode)) {
        next.delete(docCode)
      } else {
        next.add(docCode)
      }
      return next
    })
  }

  const handleConfirm = () => {
    const selected = filteredDocuments.filter((doc) => selectedDocs.has(doc.code))
    onSelectDocuments(selected.map((doc) => ({ docNum: doc.code, docType: doc.docType })))
    onClose()
    setSearch('')
    setStep('select-type')
    setSelectedDocType(null)
    setSelectedDocs(new Set())
  }

  const handleBack = () => {
    setStep('select-type')
    setSelectedDocType(null)
    setSearch('')
    setSelectedDocs(new Set())
  }

  const handleCancel = () => {
    onClose()
    setSearch('')
    setStep('select-type')
    setSelectedDocType(null)
    setSelectedDocs(new Set())
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/50 p-4 pt-20">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div className="flex items-center gap-2">
            {step === 'select-document' && (
              <button
                type="button"
                onClick={handleBack}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-700"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                {step === 'select-type'
                  ? 'Copy From Document'
                  : `Select ${selectedDocType === 'PurchaseOrder' ? 'PO' : selectedDocType === 'GoodsReceiptPO' ? 'GRPO' : 'AP Invoice'}`}
              </h3>
              <p className="text-xs text-zinc-500">
                {step === 'select-type'
                  ? `Select source for ${vendorName}`
                  : `Open documents from ${vendorName}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Search - only show in document selection step */}
        {step === 'select-document' && (
          <div className="border-b border-zinc-100 px-4 py-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by document number..."
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              autoFocus
            />
          </div>
        )}

        {/* Content */}
        <div className="max-h-[400px] overflow-auto p-2">
          {step === 'select-type' ? (
            <div className="flex flex-col gap-1 p-2">
              {docTypeOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() =>
                    handleSelectDocType(
                      option.code as 'PurchaseOrder' | 'GoodsReceiptPO' | 'APInvoice',
                    )
                  }
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="text-zinc-500">{option.icon}</span>
                  <span className="text-sm font-medium text-zinc-700">{option.name}</span>
                  <ChevronRight className="ml-auto h-4 w-4 text-zinc-400" />
                </button>
              ))}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
              Loading documents...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-sm text-red-500">
              Failed to load documents. Please try again.
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
              {search
                ? 'No documents match your search'
                : 'No Open documents found for this vendor'}
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredDocuments.map((doc) => {
                const isSelected = selectedDocs.has(doc.code)
                return (
                  <button
                    key={doc.code}
                    type="button"
                    onClick={() => handleToggleDocument(doc.code)}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-zinc-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-zinc-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-zinc-900">{doc.name}</div>
                      <div className="text-xs text-zinc-500">Doc #{doc.code}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-4 py-2">
          <span className="text-xs text-zinc-500">
            {step === 'select-type'
              ? `${docTypeOptions.length} source type${docTypeOptions.length !== 1 ? 's' : ''} available`
              : `${selectedDocs.size} of ${filteredDocuments.length} document${filteredDocuments.length !== 1 ? 's' : ''} selected`}
          </span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            {step === 'select-document' && (
              <Button
                type="button"
                size="sm"
                onClick={handleConfirm}
                disabled={selectedDocs.size === 0}
              >
                Copy {selectedDocs.size > 0 ? `(${selectedDocs.size})` : ''}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
