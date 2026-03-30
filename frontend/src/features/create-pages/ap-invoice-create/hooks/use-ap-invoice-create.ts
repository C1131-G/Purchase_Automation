import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { useGrpoLookups } from '@/features/create-pages/grpo-create/hooks/use-grpo-lookups'
import {
  apInvoiceAPI,
  type CreateAPInvoiceInput,
} from '@/features/table-pages/ap-invoices/api/ap-invoice.service'
import { apInvoiceQueries } from '@/features/table-pages/ap-invoices/api/ap-invoice.queries'
import { grpoQueries } from '@/features/table-pages/grpo/api/grpo.queries'
import { purchaseOrderQueries } from '@/features/table-pages/purchase-orders/api/purchase-order.queries'
import {
  AP_INVOICE_FIELD_ERROR_TEXT,
  AP_INVOICE_FIELD_LABEL_TEXT,
  type APInvoiceMandatoryField,
  getTodayISO,
} from '@/features/create-pages/ap-invoice-create/utils/ap-invoice-create.utils'
import {
  useAPInvoiceHeader,
  useAPInvoiceLines,
  useResetAPInvoiceCreateAction,
  useSetAPInvoiceHeaderAction,
  useSetAPInvoiceLinesAction,
  type APInvoiceLineItemState,
} from '@/store/create/ap-invoice-create.store'
import { normalizeCreateOrderErrorMessage } from '@/features/create-pages/create-shared/utils/create-order.utils'
import { documentActionToast } from '@/features/create-pages/create-shared/utils/document-action-toast'
import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { calculateOrderTotals } from '@/features/create-pages/create-shared/utils/create-order.calculations'
import {
  type PopupMode,
  type ProductRowDraft,
} from '@/features/create-pages/create-shared/utils/create-order.types'

interface UseAPInvoiceCreateOptions {
  mode?: 'create' | 'edit'
  docNum?: string | undefined
  sourceDocNum?: string | undefined
  sourceDocType?: 'GoodsReceiptPO' | 'PurchaseOrder' | undefined
}

const normalizeCodeForCompare = (value: unknown) => {
  const raw = String(value ?? '').trim()
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : raw.toLowerCase()
}

export function useAPInvoiceCreate({
  mode = 'create',
  docNum,
  sourceDocNum,
  sourceDocType,
}: UseAPInvoiceCreateOptions) {
  const isEditMode = mode === 'edit'
  const editDocNum = (docNum ?? '').trim()
  const queryClient = useQueryClient()

  // Store access
  const header = useAPInvoiceHeader()
  const rows = useAPInvoiceLines()
  const setHeader = useSetAPInvoiceHeaderAction()
  const setLines = useSetAPInvoiceLinesAction()
  const resetAPInvoiceCreate = useResetAPInvoiceCreateAction()

  // Local UI state
  const [vendorNameInput, setVendorNameInput] = useState('')
  const [vendorCodeInput, setVendorCodeInput] = useState('')
  const [warehouseInput, setWarehouseInput] = useState('')
  const [buyerInput, setBuyerInput] = useState('')
  
  const [billToAddress, setBillToAddress] = useState('')
  const [shipToAddress, setShipToAddress] = useState('')
  
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<PopupMode>('vendor-name')
  const [modalSearch, setModalSearch] = useState('')
  
  type ActiveDatePicker = 'doc' | 'delivery' | null
  const [activeDatePicker, setActiveDatePicker] = useState<ActiveDatePicker>(null)
  
  const [productPopupOpen, setProductPopupOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [activeProductRowId, setActiveProductRowId] = useState<string | null>(null)

  const [productRowDrafts, setProductRowDrafts] = useState<Record<string, ProductRowDraft>>({})

  const EMPTY_FIELD_ERRORS: Record<APInvoiceMandatoryField, string | null> = {
    vendorName: null,
    vendorCode: null,
    referenceNo: null,
    comments: null,
  }
  const [fieldErrors, setFieldErrors] = useState(EMPTY_FIELD_ERRORS)
  const [createError, setCreateError] = useState<string | null>(null)

  const [isEditHydrated, setIsEditHydrated] = useState(false)
  const hydratedDocNumRef = useRef<string | null>(null)

  const docDateContainerRef = useRef<HTMLDivElement>(null)
  const deliveryDateContainerRef = useRef<HTMLDivElement>(null)

  // Shared generic queries
  const vendorsQuery = useQuery(createSharedQueries.vendors())
  const warehousesQuery = useQuery(createSharedQueries.warehouses())
  const salesEmployeesQuery = useQuery(createSharedQueries.salesEmployees())
  const productsQuery = useQuery(createSharedQueries.products(undefined, productSearch || undefined))

  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data])
  const warehouses = useMemo(() => warehousesQuery.data ?? [], [warehousesQuery.data])
  const salesEmployees = useMemo(() => salesEmployeesQuery.data ?? [], [salesEmployeesQuery.data])
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])

  const editDetailQuery = useQuery({
    ...apInvoiceQueries.detailByDocNum(editDocNum),
    enabled: isEditMode && Boolean(editDocNum),
  })

  // Handle both standard SAP ('C'/'Closed') and sometimes used 'bost_Close' status codes.
  const rawStatus = String(editDetailQuery.data?.data?.DocStatus ?? '').trim().toLowerCase()
  const isClosed = rawStatus === 'c' || rawStatus === 'closed' || rawStatus === 'bost_close'

  const sourceDetailQueryGRPO = useQuery({
    ...grpoQueries.detailByDocNum(sourceDocNum || ''),
    enabled: mode === 'create' && sourceDocType === 'GoodsReceiptPO' && Boolean(sourceDocNum),
  })
  
  const sourceDetailQueryPO = useQuery({
    ...purchaseOrderQueries.detailByDocNum(sourceDocNum || ''),
    enabled: mode === 'create' && sourceDocType === 'PurchaseOrder' && Boolean(sourceDocNum),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (args: { payload: CreateAPInvoiceInput }) =>
      apInvoiceAPI.createAPInvoice(args.payload),
  })

  const updateMutation = useMutation({
    mutationFn: (args: { id: string | number; payload: any }) =>
      apInvoiceAPI.updateAPInvoice(args.id, args.payload),
  })

  const totals = useMemo(() => calculateOrderTotals(rows), [rows])

  // Initialization/Reset on unmount
  useEffect(() => {
    if (isEditMode) return
    resetAPInvoiceCreate()
    setIsEditHydrated(false)
    hydratedDocNumRef.current = null
    setVendorNameInput('')
    setVendorCodeInput('')
    setBuyerInput('')
    setWarehouseInput('')
    setBillToAddress('')
    setShipToAddress('')
  }, [isEditMode, resetAPInvoiceCreate])

  // Hydration: Edit Mode
  useEffect(() => {
    if (!isEditMode) return
    const currentDocNum = editDocNum
    if (!currentDocNum) return

    const detail = editDetailQuery.data?.data
    if (!detail) return

    const isMetadataLoaded = vendors.length > 0 && salesEmployees.length > 0
    if (hydratedDocNumRef.current === currentDocNum && isMetadataLoaded) return

    const vendorCode = String(detail.CardCode ?? '').trim()
    const vendorName = String(detail.CardName ?? '').trim()
    
    const buyerName =
      salesEmployees.find(
        (item) =>
          normalizeCodeForCompare(item.code) === normalizeCodeForCompare(detail.SalesPersonCode),
      )?.name || ''

    const warehouseCode = String(detail.DocumentLines?.[0]?.WarehouseCode ?? '').trim()
    
    const mappedLines = (detail.DocumentLines ?? []).map((line, index) => ({
      id: `row-edit-${index}`,
      productCode: String(line.ItemCode ?? '').trim(),
      productName: String(line.ItemDescription ?? line.ItemCode ?? '').trim(),
      stock: 0, 
      currency: '',
      taxCode: '',
      taxRate: 0,
      uomCode: String(line.UoMCode ?? '').trim(),
      uomEntry: line.UoMEntry ?? undefined,
      baseQuantity: Number(line.Quantity ?? 0),
      quantity: Number(line.Quantity ?? 0),
      discountPercent: Number(line.DiscountPercent ?? 0),
      discountAmount: 0,
      comment: '',
      price: Number(line.Price ?? line.UnitPrice ?? 0),
      warehouseCode: String(line.WarehouseCode ?? '').trim(),
      baseEntry: line.BaseEntry ?? undefined,
      baseLine: line.BaseLine ?? undefined,
      baseType: line.BaseType ?? undefined,
    }))

    setVendorCodeInput(vendorCode)
    setVendorNameInput(vendorName)
    setBuyerInput(buyerName)
    setWarehouseInput(warehouseCode)
    setBillToAddress(String(detail.Address || '').trim())
    setShipToAddress(String(detail.Address2 || detail.Address || '').trim())
    const numAtCard = String(detail.NumAtCard ?? '').trim()
    const comments = String(detail.Comments ?? '').trim()
    const splitComments = comments.split(' | ').map((part) => part.trim())
    const hasReferenceMarker = splitComments.length > 1
    const referenceNo = numAtCard || (hasReferenceMarker ? (splitComments[0] ?? '') : '')
    const remarks = hasReferenceMarker && !numAtCard ? splitComments.slice(1).join(' | ') : comments

    setHeader({
      vendorCode,
      vendorName,
      docDate: String(detail.DocDate ?? '').slice(0, 10),
      docDueDate: String(detail.DocDueDate ?? '').slice(0, 10),
      referenceNo,
      remarks,
      warehouseCode,
    })
    setLines(mappedLines)
    if (isMetadataLoaded) {
      hydratedDocNumRef.current = currentDocNum
    }
    setIsEditHydrated(true)
  }, [
    editDocNum,
    editDetailQuery.data,
    isEditMode,
    salesEmployees,
    setHeader,
    setLines,
  ])

  // Hydration: Copy from Base Document (GRPO or PO)
  useEffect(() => {
    if (mode !== 'create') return
    const currentSourceDocNum = sourceDocNum
    const currentSourceDocType = sourceDocType
    if (!currentSourceDocNum || !currentSourceDocType) return

    const detail =
      currentSourceDocType === 'GoodsReceiptPO'
        ? (sourceDetailQueryGRPO.data?.data as any)
        : (sourceDetailQueryPO.data?.data as any)
    if (!detail) return

    const isMetadataLoaded = vendors.length > 0 && salesEmployees.length > 0
    // Only return if we have already hydrated with full metadata.
    if (hydratedDocNumRef.current === `${currentSourceDocType}-${currentSourceDocNum}` && isMetadataLoaded) return

    const vendorCode = String(detail.CardCode ?? '').trim()
    const vendorName = String(detail.CardName ?? '').trim()

    const matchedVendor = vendors.find((v) => String(v.code).trim() === vendorCode)
    
    const buyerFromDocCode = detail.SalesPersonCode !== undefined && detail.SalesPersonCode !== null
      ? salesEmployees.find(
          (item) => normalizeCodeForCompare(item.code) === normalizeCodeForCompare(detail.SalesPersonCode)
        )?.name
      : ''
    
    const buyerFromVendorCode = matchedVendor?.salesEmployeeCode !== undefined && matchedVendor.salesEmployeeCode !== null
      ? salesEmployees.find(
          (item) => normalizeCodeForCompare(item.code) === normalizeCodeForCompare(matchedVendor.salesEmployeeCode)
        )?.name
      : ''

    const buyerName = buyerFromDocCode || buyerFromVendorCode || matchedVendor?.salesEmployeeName?.trim() || ''

    const warehouseCode = String(detail.DocumentLines?.[0]?.WarehouseCode ?? '').trim()
    
    const rawComments = String(detail.Comments ?? '').trim()
    const splitComments = rawComments.split(' | ').map((part) => part.trim())
    const hasReferenceMarker = splitComments.length > 1
    const originalRemarks = hasReferenceMarker ? splitComments.slice(1).join(' | ') : rawComments
    
    const numAtCard = String((detail as any).NumAtCard ?? '').trim()
    const referenceNo = numAtCard || (hasReferenceMarker ? (splitComments[0] ?? '') : '')
    const remarks = originalRemarks || `Based on ${currentSourceDocType} ${currentSourceDocNum}`
    
    const docDueDate = String(detail.DocDueDate ?? '').slice(0, 10)
    const address = String(detail.Address ?? '').trim()

    const mappedLines = (detail.DocumentLines ?? []).map((line: any, index: number) => ({
      id: `row-copy-${index}`,
      productCode: String(line.ItemCode ?? '').trim(),
      productName: String(line.ItemDescription ?? line.ItemCode ?? '').trim(),
      stock: 0,
      currency: '',
      taxCode: '',
      taxRate: 0,
      uomCode: String(line.UoMCode ?? '').trim(),
      uomEntry: line.UoMEntry ?? undefined,
      baseQuantity: Number(line.Quantity ?? 0),
      quantity: Number(line.Quantity ?? 0),
      discountPercent: Number(line.DiscountPercent ?? 0),
      discountAmount: 0,
      comment: '',
      price: Number(line.Price ?? line.UnitPrice ?? 0),
      warehouseCode: String(line.WarehouseCode ?? '').trim(),
      baseEntry: detail.DocEntry ?? detail.id,
      baseLine: line.LineNum !== undefined ? line.LineNum : index,
      baseType: currentSourceDocType === 'GoodsReceiptPO' ? 20 : 22,
    }))

    setVendorCodeInput(vendorCode)
    setVendorNameInput(vendorName)
    setBuyerInput(buyerName)
    setWarehouseInput(warehouseCode)
    setBillToAddress(String(detail.Address || address || '').trim())
    setShipToAddress(String(detail.Address2 || detail.Address || address || '').trim())
    setHeader({
      vendorCode,
      vendorName,
      docDate: getTodayISO(),
      docDueDate,
      referenceNo,
      remarks,
      warehouseCode,
    })
    setLines(mappedLines)
    if (isMetadataLoaded) {
      hydratedDocNumRef.current = `${currentSourceDocType}-${currentSourceDocNum}`
    }
  }, [
    sourceDetailQueryGRPO.data,
    sourceDetailQueryPO.data,
    mode,
    sourceDocNum,
    sourceDocType,
    salesEmployees,
    vendors,
    setHeader,
    setLines,
    queryClient,
  ])

  const { vendorNameSuggestions, vendorCodeSuggestions, warehouseSuggestions, buyerSuggestions } =
    useGrpoLookups({
      vendors,
      warehouses,
      buyers: salesEmployees,
      vendorNameInput,
      vendorCodeInput,
      warehouseInput,
      buyerInput,
    })

  const openPopup = (mode: PopupMode) => {
    const searchVal =
      mode === 'vendor-name' || mode === 'vendor-code'
        ? mode === 'vendor-name'
          ? vendorNameInput
          : vendorCodeInput
        : mode === 'warehouse'
          ? warehouseInput
          : buyerInput

    setModalMode(mode)
    setModalSearch(searchVal)
    setModalOpen(true)
  }

  const selectVendor = (vendor: LookupItem) => {
    setVendorNameInput(vendor.name)
    setVendorCodeInput(vendor.code)
    setHeader({ vendorCode: vendor.code, vendorName: vendor.name })
    setBillToAddress(vendor.billToAddress ?? '')
    setShipToAddress(vendor.shipToAddress ?? vendor.billToAddress ?? '')
    setModalOpen(false)
  }

  const selectBuyer = (item: LookupItem) => {
    setBuyerInput(item.name)
    setModalOpen(false)
  }

  const popupResults = useMemo(() => {
    const term = modalSearch.trim().toLowerCase()
    const source = (
      modalMode === 'vendor-name' || modalMode === 'vendor-code'
        ? vendors
        : modalMode === 'warehouse'
          ? warehouses
          : salesEmployees
    ) as LookupItem[]
    if (!term) return source
    const score = (item: LookupItem) => {
      const code = (item.code || '').toLowerCase()
      const name = (item.name || '').toLowerCase()
      if (code === term || name === term) return 0
      if (code.startsWith(term) || name.startsWith(term)) return 1
      if (code.includes(term) || name.includes(term)) return 2
      return 3
    }
    return [...source].sort((a, b) => {
      const byScore = score(a) - score(b)
      if (byScore !== 0) return byScore
      return a.code.localeCompare(b.code, undefined, { sensitivity: 'base', numeric: true })
    })
  }, [vendors, warehouses, salesEmployees, modalSearch, modalMode])

  const prefetchProducts = useCallback(() => {
    void queryClient.prefetchQuery(createSharedQueries.products())
  }, [queryClient])

  const handleCreateOrder = async () => {
    // Validation
    const missing = []
    if (!vendorCodeInput.trim()) missing.push('vendorCode')
    if (!header.referenceNo.trim()) missing.push('referenceNo')
    
    if (missing.length > 0) {
      const nextErrors = { ...EMPTY_FIELD_ERRORS }
      missing.forEach((field) => {
        const key = field === 'remarks' ? 'comments' : field as APInvoiceMandatoryField
        nextErrors[key] = AP_INVOICE_FIELD_ERROR_TEXT[key]
      })
      setFieldErrors(nextErrors)
      setCreateError('Fill required fields before creating/updating AP Invoice.')
      return
    }

    const filteredRows = rows.filter((r) => r.quantity > 0)
    if (filteredRows.length === 0) {
      setCreateError('Set at least one line quantity greater than 0.')
      return
    }

    if (isEditMode) {
      const detail = editDetailQuery.data?.data
      const existingDocDueDate = String(detail?.DocDueDate ?? '').slice(0, 10).trim()
      const rawComments = String(detail?.Comments ?? '').trim()
      const splitComments = rawComments.split(' | ').map((part) => part.trim())
      const hasReferenceMarker = splitComments.length > 1
      const existingRemarks = hasReferenceMarker ? splitComments.slice(1).join(' | ') : rawComments
      const existingReferenceNo = String(detail?.NumAtCard ?? '').trim()

      const currentDocDueDate = String(header.docDueDate ?? '').trim()
      const currentRemarks = String(header.remarks ?? '').trim()
      const currentReferenceNo = String(header.referenceNo ?? '').trim()

      if (
        currentDocDueDate === existingDocDueDate &&
        currentRemarks === existingRemarks.trim() &&
        currentReferenceNo === existingReferenceNo
      ) {
        setCreateError('Change at least one field before update.')
        return
      }
    }

    const payload = isEditMode
      ? {
          DocDueDate: header.docDueDate || undefined,
          Comments: header.remarks.trim() || undefined,
          NumAtCard: header.referenceNo.trim() || undefined,
        }
      : {
          CardCode: vendorCodeInput.trim(),
          DocDate: header.docDate || undefined,
          DocDueDate: header.docDueDate || undefined,
          Comments: [header.referenceNo.trim(), header.remarks.trim()].filter(Boolean).join(' | ') || undefined,
          NumAtCard: header.referenceNo.trim(),
          Address: billToAddress.trim() || undefined,
          Address2: shipToAddress.trim() || undefined,
          DocumentLines: filteredRows.map((row) => ({
            ItemCode: row.productCode,
            Quantity: row.quantity,
            UnitPrice: row.price,
            DiscountPercent: row.discountPercent,
            UoMCode: row.uomCode || undefined,
            UoMEntry: row.uomEntry ?? undefined,
            WarehouseCode: row.warehouseCode || undefined,
            BaseType: row.baseType,
            BaseEntry: row.baseEntry,
            BaseLine: row.baseLine,
          })),
        }

    const toastHandle = documentActionToast('AP Invoice', isEditMode ? 'update' : 'create')
    try {
      if (isEditMode) {
        const id = editDetailQuery.data?.data?.id ?? editDetailQuery.data?.data?.DocEntry
        await updateMutation.mutateAsync({ id: id as any, payload })
      } else {
        await createMutation.mutateAsync({ payload: payload as any })
      }
      toastHandle.success()
      

      if (!isEditMode) {
        resetAPInvoiceCreate()
        setVendorNameInput('')
        setVendorCodeInput('')
        setBuyerInput('')
        setWarehouseInput('')
      }
    } catch (error) {
      toastHandle.error()
      setCreateError(normalizeCreateOrderErrorMessage(error, 'Operation failed.'))
    }
  }

  return {
    isEditMode,
    isEditHydrated,
    isClosed,
    header,
    rows,
    totals,
    vendorNameInput,
    vendorCodeInput,
    warehouseInput,
    buyerInput,
    vendorNameSuggestions,
    vendorCodeSuggestions,
    warehouseSuggestions,
    buyerSuggestions,
    vendors,
    warehouses,
    warehousesLoading: warehousesQuery.isLoading,
    salesEmployees,
    handleCreateOrder,
    setVendorNameInput,
    setVendorCodeInput,
    setWarehouseInput,
    setBuyerInput,
    billToAddress,
    shipToAddress,
    setBillToAddress,
    setShipToAddress,
    setHeader,
    setLines,
    setActiveDatePicker,
    docDateContainerRef,
    deliveryDateContainerRef,
    activeDatePicker,
    fieldErrors,
    createError,
    missingMandatoryFields: [], // Simplified for now
    requiredCompletionPercent: 100, // Simplified
    requiredFieldLabelText: AP_INVOICE_FIELD_LABEL_TEXT,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    
    // Custom Modals
    modalOpen,
    modalMode,
    modalSearch,
    setModalOpen,
    setModalSearch,
    openPopup,
    selectVendor,
    selectBuyer,
    popupResults,

    // Callbacks for components
    handleDocDateChange: (val: string) => setHeader({ docDate: val }),
    handleDocDueDateChange: (val: string) => setHeader({ docDueDate: val }),
    handleRemarksChange: (val: string) => setHeader({ remarks: val }),
    handleReferenceNoChange: (val: string) => setHeader({ referenceNo: val }),
    
    selectWarehouse: (w: LookupItem) => {
      setWarehouseInput(w.code)
      setHeader({ warehouseCode: w.code })
    },
    
    // Product management
    productPopupOpen,
    setProductPopupOpen,
    productSearch,
    setProductSearch,
    products,
    prefetchProducts,
    productRowDrafts,
    setProductRowDraft: (id: string, field: keyof ProductRowDraft, value: string) => {
      setProductRowDrafts(prev => ({
        ...prev,
        [id]: { ...prev[id], [field]: value }
      }))
    },
    clearProductRowDraft: (id: string, field: keyof ProductRowDraft) => {
      setProductRowDrafts(prev => {
        const next = { ...prev }
        if (next[id]) delete next[id][field]
        return next
      })
    },
    openProductPopup: (id: string | null) => {
      setActiveProductRowId(id)
      setProductPopupOpen(true)
    },
    updateProductRow: (id: string, patch: Partial<APInvoiceLineItemState>) => {
      setLines(prev => prev.map(r => (r.id === id ? ({ ...r, ...patch } as APInvoiceLineItemState) : r)))
    },
    removeProductRow: (id: string) => {
      setLines(prev => prev.filter(r => r.id !== id))
    },
    applyProductToRow: (p: any) => {
      if (!activeProductRowId) return
      setLines(prev => prev.map(r => r.id === activeProductRowId ? {
        ...r,
        productCode: p.code,
        productName: p.name,
        price: Number(p.price || 0),
        warehouseCode: warehouseInput || r.warehouseCode,
      } : r))
      setProductPopupOpen(false)
    },
    applyProductsToRows: (products: any[]) => {
      const nextRows = products.map((p) => ({
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        productCode: p.code,
        productName: p.name,
        stock: Number(p.stock || 0),
        currency: String(p.currency || ''),
        taxCode: String(p.taxCode || ''),
        taxRate: Number(p.taxRate || 0),
        price: Number(p.price || 0),
        warehouseCode: warehouseInput || '',
        quantity: 1,
        discountPercent: 0,
        discountAmount: 0,
        comment: '',
      }))
      setLines((prev) => [...prev, ...nextRows])
      setProductPopupOpen(false)
    },
    productsQuery,
  }
}
