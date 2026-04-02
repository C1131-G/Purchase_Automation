import { Check, ChevronLeft, FileText, Loader2, StickyNote } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

const INITIAL_LOAD_SIZE = 10
const INCREMENTAL_LOAD_SIZE = 10
const MAX_RESULTS = 100

const SKELETON_ROW_KEYS = ['slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-5', 'slot-6'] as const

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
  const [documents, setDocuments] = useState<DocumentOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadedCount, setLoadedCount] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Document type options
  const docTypeOptions = useMemo(
    () =>
      sourceDocTypes.map((docType) => ({
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
      })),
    [sourceDocTypes],
  )

  const fetchDocuments = useCallback(
    async (isLoadMore = false) => {
      if (!selectedDocType || !vendorCode) return

      setIsLoading(true)
      setError(null)

      try {
        const currentLimit = isLoadMore ? INCREMENTAL_LOAD_SIZE : INITIAL_LOAD_SIZE

        let result
        if (selectedDocType === 'PurchaseOrder') {
          result = await purchaseOrderAPI.getPurchaseOrders({
            CardCode: vendorCode,
            DocStatus: 'Open',
            limit: currentLimit,
          })
        } else if (selectedDocType === 'GoodsReceiptPO') {
          result = await grpoAPI.getGRPOs({
            CardCode: vendorCode,
            DocStatus: 'Open',
            limit: currentLimit,
          })
        } else {
          result = await apInvoiceAPI.getAPInvoices({
            CardCode: vendorCode,
            DocStatus: 'Open',
            limit: currentLimit,
          })
        }

        const label =
          selectedDocType === 'PurchaseOrder'
            ? 'PO'
            : selectedDocType === 'GoodsReceiptPO'
              ? 'GRPO'
              : 'AP Invoice'

        const newDocs = (result.data || []).map((doc: any) => ({
          code: String(doc.DocNum),
          name: `${label} - ${doc.DocNum} - ${doc.DocDate ? new Date(doc.DocDate).toLocaleDateString('en-GB') : ''}`,
          docType: selectedDocType,
          docEntry: doc.DocEntry,
        })) as DocumentOption[]

        if (isLoadMore) {
          setDocuments((prev) => [...prev, ...newDocs])
          setLoadedCount((prev) => {
            const newCount = prev + newDocs.length
            setHasMore(newDocs.length === currentLimit && newCount < MAX_RESULTS)
            return newCount
          })
        } else {
          setDocuments(newDocs)
          setLoadedCount(newDocs.length)
          setHasMore(newDocs.length === currentLimit && newDocs.length < MAX_RESULTS)
        }
      } catch (err) {
        setError('Failed to load documents. Please try again.')
      } finally {
        setIsLoading(false)
      }
    },
    [selectedDocType, vendorCode],
  )

  // Reset documents only when vendor or document type changes (not on load-more)
  useEffect(() => {
    if (step === 'select-document' && selectedDocType && vendorCode) {
      setDocuments([])
      setLoadedCount(0)
      setHasMore(false)
      setError(null)
    }
  }, [step, selectedDocType, vendorCode])

  // Fetch documents after reset completes
  useEffect(() => {
    if (
      step === 'select-document' &&
      selectedDocType &&
      vendorCode &&
      documents.length === 0 &&
      !isLoading &&
      !error
    ) {
      void fetchDocuments(false)
    }
  }, [step, selectedDocType, vendorCode, fetchDocuments, documents.length, isLoading, error])

  // Filter documents by search (live search, no button needed)
  const filteredDocuments = useMemo(() => {
    if (!search.trim()) return documents
    const term = search.toLowerCase()
    return documents.filter(
      (doc) => doc.code.toLowerCase().includes(term) || doc.name.toLowerCase().includes(term),
    )
  }, [documents, search])

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
    handleCancel()
  }

  const handleBack = () => {
    setStep('select-type')
    setSelectedDocType(null)
    setSearch('')
    setSelectedDocs(new Set())
    setDocuments([])
    setLoadedCount(0)
    setHasMore(false)
    setError(null)
  }

  const handleCancel = () => {
    onClose()
    setSearch('')
    setStep('select-type')
    setSelectedDocType(null)
    setSelectedDocs(new Set())
    setDocuments([])
    setLoadedCount(0)
    setHasMore(false)
    setError(null)
  }

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      void fetchDocuments(true)
    }
  }

  // Scroll to top when step changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [step])

  // Scroll-based load more
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const threshold = 32
      const reachedEnd =
        container.scrollHeight - container.scrollTop - container.clientHeight <= threshold
      if (reachedEnd && hasMore && !isLoading) {
        handleLoadMore()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMore, isLoading])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/50 p-4 pt-20">
      <div className="flex h-full max-h-[calc(100svh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div className="flex items-center gap-2">
            {step === 'select-document' && (
              <button
                type="button"
                onClick={handleBack}
                className="flex h-8 items-center rounded-full border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Back
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
          <div className="flex items-center gap-2">
            {step === 'select-document' && selectedDocs.size > 0 && (
              <button
                onClick={handleConfirm}
                className="flex h-8 items-center rounded-full border border-blue-600 bg-blue-600 px-4 text-xs font-medium text-white transition hover:bg-blue-700"
              >
                Confirm ({selectedDocs.size})
              </button>
            )}
            <button
              type="button"
              onClick={handleCancel}
              className="flex h-8 items-center rounded-full border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Close
            </button>
          </div>
        </div>

        {/* Search - only show in document selection step (live search, no button) */}
        {step === 'select-document' && (
          <div className="shrink-0 border-b border-zinc-100 px-4 py-3">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by document number or name"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        )}

        {/* Content - scrollable area */}
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
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
                </button>
              ))}
            </div>
          ) : isLoading && documents.length === 0 ? (
            // Initial loading skeleton
            <div className="flex flex-col p-2">
              {SKELETON_ROW_KEYS.map((slot) => (
                <div
                  key={`doc-skeleton-${slot}`}
                  className="flex items-center gap-3 border-t border-zinc-100 px-4 py-3"
                >
                  <div className="h-5 w-5 animate-pulse rounded-md bg-zinc-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
                    <div className="h-3 w-1/4 animate-pulse rounded bg-zinc-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : error && documents.length === 0 ? (
            // Error state
            <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-zinc-600">{error}</p>
              <button
                onClick={() => void fetchDocuments(false)}
                className="flex h-8 items-center rounded-full border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Retry
              </button>
            </div>
          ) : filteredDocuments.length === 0 && !isLoading ? (
            // Empty state
            <div className="flex flex-col items-center gap-1 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-8 text-center">
              <p className="text-xs font-medium text-zinc-500">
                {search
                  ? `No documents match "${search.trim()}".`
                  : 'No Open documents found for this vendor.'}
              </p>
            </div>
          ) : (
            // Document list
            <div className="flex flex-col">
              {filteredDocuments.map((doc) => {
                const isSelected = selectedDocs.has(doc.code)
                return (
                  <button
                    key={doc.code}
                    type="button"
                    onClick={() => handleToggleDocument(doc.code)}
                    className={`flex items-center gap-3 border-t border-zinc-100 px-4 py-3 text-left transition hover:bg-zinc-50 ${
                      isSelected ? 'bg-blue-50' : 'bg-white'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-zinc-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-zinc-900">{doc.name}</div>
                    </div>
                  </button>
                )
              })}
              {isLoading && documents.length > 0 && (
                // Loading more indicator
                <div className="flex items-center justify-center gap-2 border-t border-zinc-100 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  <p className="text-xs text-zinc-500">Loading more...</p>
                </div>
              )}
              {!hasMore && documents.length > 0 && (
                // Completion message
                <div className="border-t border-zinc-100 px-4 py-2 text-center text-xs text-zinc-500">
                  {documents.length} document{documents.length !== 1 ? 's' : ''} loaded
                  {loadedCount >= MAX_RESULTS && ' (max reached)'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'select-document' && (
          <div className="shrink-0 flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-4 py-2">
            <span className="text-xs text-zinc-500">
              {selectedDocs.size} of {filteredDocuments.length} document
              {filteredDocuments.length !== 1 ? 's' : ''} selected
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
