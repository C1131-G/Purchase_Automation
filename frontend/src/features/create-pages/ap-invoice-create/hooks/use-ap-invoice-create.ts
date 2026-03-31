import { useQuery, useQueryClient } from '@tanstack/react-query'
import { goeyToast } from 'goey-toast'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  createSharedQueries,
} from '@/features/create-pages/create-shared/api/create-shared.queries'
import {
  type LookupItem,
  type ProductLookupItem,
} from '@/features/create-pages/create-shared/api/create-shared.types'
import {
  type ActiveDatePicker,
  type PopupMode,
  type ProductRowDraft,
  type StockPreviewProduct,
} from '@/features/create-pages/create-shared/utils/create-order.types'
import { normalizeCreateOrderErrorMessage } from '@/features/create-pages/create-shared/utils/create-order.utils'
import { documentActionToast } from '@/features/create-pages/create-shared/utils/document-action-toast'
import {
  syncLookupSearchByMode,
} from '@/features/create-pages/create-shared/utils/lookup-search-sync'
import { resolveProductTaxRates } from '@/features/create-pages/create-shared/utils/product-tax-rate'
import { reconcileAddresses } from '@/features/create-pages/create-shared/utils/address.utils'
import {
  useCreateAPInvoice,
  useUpdateAPInvoice,
} from '@/features/create-pages/ap-invoice-create/api/ap-invoice-create.mutations'
import { useAPInvoiceLookups } from '@/features/create-pages/ap-invoice-create/hooks/use-ap-invoice-lookups'
import {
  filterAndRankLookups,
  getTodayISO,
  AP_INVOICE_FIELD_ERROR_TEXT,
  AP_INVOICE_FIELD_LABEL_TEXT,
  AP_INVOICE_MANDATORY_FIELDS,
  type APInvoiceMandatoryField,
} from '@/features/create-pages/ap-invoice-create/utils/ap-invoice-create.utils'
import { apInvoiceQueries } from '@/features/table-pages/ap-invoices/api/ap-invoice.queries'
import { grpoQueries } from '@/features/table-pages/grpo/api/grpo.queries'
import { purchaseOrderQueries } from '@/features/table-pages/purchase-orders/api/purchase-order.queries'
import {
  useAPInvoiceHeader,
  useAPInvoiceLines,
  useResetAPInvoiceCreateAction,
  useSetAPInvoiceHeaderAction,
  useSetAPInvoiceLinesAction,
} from '@/store/create/ap-invoice-create.store'

export type APInvoiceCreateLine = {
  id: string
  productCode: string
  productName: string
  stock: number
  currency: string
  taxCode: string
  taxRate: number
  uomCode?: string | undefined
  uomEntry?: number | undefined
  baseQuantity?: number | undefined
  quantity: number
  discountPercent: number
  discountAmount: number
  comment: string
  price: number
  warehouseCode: string
  baseLine?: number | undefined
  baseEntry?: number | undefined
  baseType?: number | undefined
}
type APInvoiceFieldErrors = Record<APInvoiceMandatoryField, string | undefined>
const QUICK_PRODUCT_LIMIT = 10
const FULL_PRODUCT_LIMIT = 100

const EMPTY_AP_INVOICE_FIELD_ERRORS: APInvoiceFieldErrors = {
  vendorName: undefined,
  vendorCode: undefined,
  referenceNo: undefined,
  comments: undefined,
}

interface UseAPInvoiceCreateOptions {
  mode?: 'create' | 'edit'
  docNum?: string
  sourceDocNum?: string | undefined
  sourceDocType?: 'PurchaseOrder' | 'GoodsReceiptPO' | undefined
}

const normalizeCodeForCompare = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : raw.toLowerCase()
}

export function useAPInvoiceCreate({ mode = 'create', docNum, sourceDocNum, sourceDocType }: UseAPInvoiceCreateOptions) {
  const isEditMode = mode === 'edit'
  const editDocNum = (docNum ?? '').trim()
  const queryClient = useQueryClient()
  const header = useAPInvoiceHeader()
  const setHeader = useSetAPInvoiceHeaderAction()
  const rows = useAPInvoiceLines()
  const setLines = useSetAPInvoiceLinesAction()
  const resetAPInvoiceCreate = useResetAPInvoiceCreateAction()
  const createMutation = useCreateAPInvoice()
  const updateMutation = useUpdateAPInvoice()
  const hydratedDocNumRef = useRef<string | null>(null)
  const [hydratedDocNum, setHydratedDocNum] = useState<string | null>(null)
  const lastRestrictedToastAtRef = useRef(0)

  const [vendorNameInput, setVendorNameInput] = useState('')
  const [vendorCodeInput, setVendorCodeInput] = useState('')
  const [vendorNameFocused, setVendorNameFocused] = useState(false)
  const [vendorCodeFocused, setVendorCodeFocused] = useState(false)
  const [buyerInput, setBuyerInput] = useState('')
  const [buyerFocused, setBuyerFocused] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<PopupMode>('vendor-name')
  const [modalSearch, setModalSearch] = useState('')
  const [productPopupOpen, setProductPopupOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')
  const [productQueryLimit, setProductQueryLimit] = useState(QUICK_PRODUCT_LIMIT)
  const [activeProductRowId, setActiveProductRowId] = useState<string | null>(null)
  const [warehouseInput, setWarehouseInput] = useState('')
  const [warehouseFocused, setWarehouseFocused] = useState(false)

  const [billToAddress, setBillToAddress] = useState('')
  const [shipToAddress, setShipToAddress] = useState('')

  const [productRowDrafts, setProductRowDrafts] = useState<Record<string, ProductRowDraft>>({})
  const [stockPreviewProduct, setStockPreviewProduct] = useState<StockPreviewProduct | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<APInvoiceFieldErrors>(EMPTY_AP_INVOICE_FIELD_ERRORS)
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])
  const [activeDatePicker, setActiveDatePicker] = useState<ActiveDatePicker>(null)
  const docDateContainerRef = useRef<HTMLDivElement>(null)
  const deliveryDateContainerRef = useRef<HTMLDivElement>(null)

  const notifyRestricted = (fieldName: string) => {
    const now = Date.now()
    if (now - lastRestrictedToastAtRef.current < 2500) return
    lastRestrictedToastAtRef.current = now
    goeyToast.error(`${fieldName} is locked for edit`, {
      id: 'restricted-edit-toast',
    })
  }

  const vendorsQuery = useQuery(createSharedQueries.vendors())
  const warehousesQuery = useQuery(createSharedQueries.warehouses())
  const salesEmployeesQuery = useQuery(createSharedQueries.salesEmployees())
  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data])
  const warehouses = useMemo(() => warehousesQuery.data ?? [], [warehousesQuery.data])
  const salesEmployees = useMemo(() => salesEmployeesQuery.data ?? [], [salesEmployeesQuery.data])
  const effectiveWarehouseCode = useMemo(() => {
    const normalized = warehouseInput.trim().toLowerCase()
    const matched = warehouses.find(
      (item) => item.name.toLowerCase() === normalized || item.code.toLowerCase() === normalized,
    )
    return matched?.code ?? warehouseInput.trim()
  }, [warehouseInput, warehouses])

  const vendorSelected = Boolean(vendorCodeInput) || Boolean(vendorNameInput)

  const productsQuery = useQuery({
    ...createSharedQueries.products(
      effectiveWarehouseCode || undefined,
      debouncedProductSearch.trim() || undefined,
      productQueryLimit,
    ),
    enabled: productPopupOpen && vendorSelected,
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim())
    }, 180)
    return () => window.clearTimeout(timer)
  }, [productSearch])

  const productWarehouseStocksQuery = useQuery({
    ...createSharedQueries.productWarehouseStocks(stockPreviewProduct?.code),
    enabled: Boolean(stockPreviewProduct?.code),
  })

  const editDetailQuery = useQuery({
    ...apInvoiceQueries.detailByDocNum(editDocNum),
    enabled: isEditMode && Boolean(editDocNum),
  })

  const isClosed =
    editDetailQuery.data?.data?.DocStatus === 'Closed' ||
    editDetailQuery.data?.data?.DocStatus === 'C'

  const sourceDetailQueryGRPO = useQuery({
    ...grpoQueries.detailByDocNum(sourceDocNum || ''),
    enabled: mode === 'create' && sourceDocType === 'GoodsReceiptPO' && Boolean(sourceDocNum),
  })

  const sourceDetailQueryPO = useQuery({
    ...purchaseOrderQueries.detailByDocNum(sourceDocNum || ''),
    enabled: mode === 'create' && sourceDocType === 'PurchaseOrder' && Boolean(sourceDocNum),
  })

  useEffect(() => {
    if (isEditMode) return
    resetAPInvoiceCreate()
    hydratedDocNumRef.current = null
  }, [isEditMode, resetAPInvoiceCreate])

  // Edit Mode Hydration
  useEffect(() => {
    if (!isEditMode) return
    const currentDocNum = editDocNum
    if (!currentDocNum) return
    const detail = editDetailQuery.data?.data
    if (!detail) return

    const isMetadataLoaded = vendors.length > 0 && salesEmployees.length > 0
    if (hydratedDocNumRef.current === currentDocNum && isMetadataLoaded) return

    void (async () => {
      setVendorCodeInput(String(detail.CardCode ?? '').trim())
      setVendorNameInput(String(detail.CardName ?? '').trim())
      const loadedDocDate = String(detail.DocDate ?? '').slice(0, 10) || getTodayISO()
      const numAtCard = String((detail as any).NumAtCard ?? '').trim()
      const comments = String(detail.Comments ?? '').trim()
      const splitComments = comments.split(' | ').map((part) => part.trim())
      const hasReferenceMarker = splitComments.length > 1
      const address = String(detail.Address ?? '').trim()
      const matchedVendor = vendors.find(
        (vendor) => String(vendor.code).trim() === String(detail.CardCode ?? '').trim(),
      )
      const buyerFromDocCode =
        detail.SalesPersonCode !== undefined && detail.SalesPersonCode !== null
          ? salesEmployees.find(
              (item) =>
                normalizeCodeForCompare(item.code) ===
                normalizeCodeForCompare(detail.SalesPersonCode),
            )?.name
          : ''
      const referenceNo = numAtCard || (hasReferenceMarker ? (splitComments[0] ?? '') : '')
      const remarks = hasReferenceMarker ? splitComments.slice(1).join(' | ') : comments

      setBuyerInput(buyerFromDocCode || matchedVendor?.salesEmployeeName?.trim() || '')
      setHeader({
        docDate: loadedDocDate,
        docDueDate: String(detail.DocDueDate ?? '').slice(0, 10) || loadedDocDate,
        referenceNo,
        remarks,
      })
      const bA = String(detail.Address || address || '').trim()
      const sA = String(detail.Address2 || '').trim()
      
      setBillToAddress(bA)
      setShipToAddress(reconcileAddresses(bA, sA))
      const detailLines = detail.DocumentLines ?? []

      const taxRateByItemCode = await resolveProductTaxRates(
        queryClient,
        detailLines.map((line) => String(line.ItemCode ?? '').trim()),
      )

      const mappedLines = (detail.DocumentLines ?? []).map((line, index) => {
        const quantity = Math.max(0, Number(line.Quantity ?? 0))
        const price = Number(line.Price ?? line.UnitPrice ?? 0)
        const grossAmount = Math.max(0, price * quantity)
        const discountPercent = Number(line.DiscountPercent ?? 0)
        const discountAmount = Math.max(0, (grossAmount * discountPercent) / 100)
        const itemCode = String(line.ItemCode ?? '').trim()

        return {
          id: `${currentDocNum}-${index}`,
          productCode: String(line.ItemCode ?? '').trim(),
          productName: String(line.ItemDescription ?? line.ItemCode ?? '').trim(),
          stock: 0, // In edit mode, stock is less relevant for invoices
          currency: String(detail.DocCurr ?? '').trim(),
          taxCode: String(line.TaxCode ?? '').trim(),
          taxRate:
            taxRateByItemCode.get(itemCode) ??
            (typeof line.VatPrcnt === 'number' ? line.VatPrcnt : Number(line.VatPrcnt) || 0),
          uomCode: String(line.UoMCode ?? '').trim(),
          uomEntry: typeof line.UoMEntry === 'number' ? line.UoMEntry : undefined,
          baseQuantity: quantity,
          quantity,
          discountPercent,
          discountAmount,
          comment: '',
          price,
          warehouseCode: String(line.WarehouseCode ?? '').trim(),
          baseEntry: typeof line.BaseEntry === 'number' ? line.BaseEntry : undefined,
          baseLine: typeof line.BaseLine === 'number' ? line.BaseLine : undefined,
          baseType: typeof line.BaseType === 'number' ? line.BaseType : undefined,
        }
      })
      setLines(mappedLines)
      setProductRowDrafts({})
      setWarehouseInput(String(detail.DocumentLines?.[0]?.WarehouseCode ?? '').trim())
      if (isMetadataLoaded) {
        hydratedDocNumRef.current = currentDocNum
      }
      setHydratedDocNum(currentDocNum)
    })()
  }, [editDocNum, editDetailQuery.data, isEditMode, queryClient, salesEmployees, setHeader, setLines, vendors])

  // Copy-From Hydration (GRPO or PO)
  useEffect(() => {
    if (mode !== 'create') return
    const currentSourceDocNum = sourceDocNum
    const currentSourceDocType = sourceDocType
    if (!currentSourceDocNum || !currentSourceDocType) return

    const detail = sourceDocType === 'GoodsReceiptPO' ? sourceDetailQueryGRPO.data?.data : sourceDetailQueryPO.data?.data
    if (!detail) return

    const isMetadataLoaded = vendors.length > 0 && salesEmployees.length > 0
    if (hydratedDocNumRef.current === `${currentSourceDocType}-${currentSourceDocNum}` && isMetadataLoaded) return

    const vendorCode = String(detail.CardCode ?? '').trim()
    const vendorName = String(detail.CardName ?? '').trim()
    const matchedVendor = vendors.find((v) => String(v.code).trim() === vendorCode)
    
    const buyerFromDocCode =
      detail.SalesPersonCode !== undefined && detail.SalesPersonCode !== null
        ? salesEmployees.find(
            (item) =>
              normalizeCodeForCompare(item.code) ===
              normalizeCodeForCompare(detail.SalesPersonCode),
          )?.name
        : ''
    const buyerName = buyerFromDocCode || matchedVendor?.salesEmployeeName?.trim() || ''

    const warehouseCode = String(detail.DocumentLines?.[0]?.WarehouseCode ?? '').trim()
    const rawComments = String(detail.Comments ?? '').trim()
    const splitComments = rawComments.split(' | ').map((part) => part.trim())
    const hasReferenceMarker = splitComments.length > 1
    const originalRemarks = hasReferenceMarker ? splitComments.slice(1).join(' | ') : rawComments
    const remarks = originalRemarks || `Based on ${currentSourceDocType} ${currentSourceDocNum}`
    const docDueDate = String(detail.DocDueDate ?? '').slice(0, 10)
    const address = String(detail.Address ?? '').trim()

    void (async () => {
      const mappedLines = (detail.DocumentLines ?? []).map((line: any, index: number) => {
        const quantity = Number(line.Quantity ?? 1)
        const price = Number(line.Price ?? line.UnitPrice ?? 0)
        const grossAmount = Math.max(0, price * quantity)
        const discountPercent = Number(line.DiscountPercent ?? 0)
        const discountAmount = Math.max(0, (grossAmount * discountPercent) / 100)
        const itemCode = String(line.ItemCode ?? '').trim()

        return {
          id: `row-copy-${currentSourceDocNum}-${index}`,
          productCode: String(line.ItemCode ?? '').trim(),
          productName: String(line.ItemDescription ?? line.ItemCode ?? '').trim(),
          stock: 0,
          currency: String(detail.DocCurr ?? '').trim(),
          taxCode: String(line.TaxCode ?? '').trim(),
          taxRate:
            taxRateByItemCode.get(itemCode) ??
            (typeof line.VatPrcnt === 'number' ? line.VatPrcnt : Number(line.VatPrcnt) || 0),
          uomCode: String(line.UoMCode ?? '').trim(),
          uomEntry: typeof line.UoMEntry === 'number' ? line.UoMEntry : undefined,
          baseQuantity: quantity,
          quantity,
          discountPercent,
          discountAmount,
          comment: '',
          price,
          warehouseCode: String(line.WarehouseCode ?? warehouseCode).trim(),
          baseEntry: detail.DocEntry ?? (detail as any).id,
          baseLine: line.LineNum ?? index,
          baseType: sourceDocType === 'GoodsReceiptPO' ? 20 : 22,
        }
      })

      setVendorCodeInput(vendorCode)
      setVendorNameInput(vendorName)
      setBuyerInput(buyerName)
      setWarehouseInput(warehouseCode)
      const bA_copy = String(detail.Address || address || '').trim()
      const sA_copy = String(detail.Address2 || '').trim()
      
      setBillToAddress(bA_copy)
      setShipToAddress(reconcileAddresses(bA_copy, sA_copy))
      const detailLines = detail.DocumentLines ?? []
      const taxRateByItemCode = await resolveProductTaxRates(
        queryClient,
        detailLines.map((line: any) => String(line.ItemCode ?? '').trim()),
      )
      setHeader({
        docDate: getTodayISO(),
        docDueDate,
        referenceNo: '',
        remarks,
      })
      setLines(mappedLines)
      setProductRowDrafts({})
      if (isMetadataLoaded) {
        hydratedDocNumRef.current = `${currentSourceDocType}-${currentSourceDocNum}`
      }
    })()
  }, [sourceDetailQueryGRPO.data, sourceDetailQueryPO.data, mode, sourceDocNum, sourceDocType, queryClient, salesEmployees, setHeader, setLines, vendors])

  const { vendorNameSuggestions, vendorCodeSuggestions, warehouseSuggestions, buyerSuggestions } =
    useAPInvoiceLookups({
      vendors,
      warehouses,
      buyers: salesEmployees,
      vendorNameInput,
      vendorCodeInput,
      warehouseInput,
      buyerInput,
    })

  const openPopupByMode = (mode: PopupMode) => {
    const searchVal =
      mode === 'vendor-name' || mode === 'vendor-code'
        ? mode === 'vendor-name' ? vendorNameInput : vendorCodeInput
        : mode === 'warehouse' ? warehouseInput : buyerInput

    setModalMode(mode)
    setModalSearch(searchVal)
    setModalOpen(true)
  }

  const handleLookupModalSearchSync = (mode: PopupMode, value: string) =>
    syncLookupSearchByMode(mode, value, {
      onVendorName: handleVendorNameChange,
      onVendorCode: handleVendorCodeChange,
      onWarehouse: handleWarehouseInputChange,
      onSalesEmployee: handleBuyerChange,
    })

  const selectVendor = (vendor: LookupItem) => {
    setVendorNameInput(vendor.name)
    setVendorCodeInput(vendor.code)
    setBillToAddress(vendor.billToAddress ?? '')
    setShipToAddress(vendor.shipToAddress ?? '')
    
    const buyerName = vendor.salesEmployeeName?.trim() || (
      vendor.salesEmployeeCode 
        ? salesEmployees.find(s => normalizeCodeForCompare(s.code) === normalizeCodeForCompare(vendor.salesEmployeeCode))?.name?.trim() || ''
        : ''
    )
    setBuyerInput(buyerName)
    
    setWarehouseInput('')
    setLines([])
    setCreateError(null)
    setFieldErrors((prev) => ({ ...prev, vendorName: undefined, vendorCode: undefined }))
    setVendorNameFocused(false)
    setVendorCodeFocused(false)
  }

  const handleVendorNameChange = (value: string) => {
    setVendorNameInput(value)
    setFieldErrors((prev) => ({ ...prev, vendorName: undefined }))
    const matched = vendors.find((v) => v.name.trim().toLowerCase() === value.trim().toLowerCase())
    if (matched) {
      setVendorCodeInput(matched.code)
      setBillToAddress(matched.billToAddress ?? '')
      setShipToAddress(matched.shipToAddress ?? matched.billToAddress ?? '')
      
      const buyerName = matched.salesEmployeeName?.trim() || (
        matched.salesEmployeeCode 
          ? salesEmployees.find(s => normalizeCodeForCompare(s.code) === normalizeCodeForCompare(matched.salesEmployeeCode))?.name?.trim() || ''
          : ''
      )
      setBuyerInput(buyerName)
      setVendorNameFocused(false)
      setVendorCodeFocused(false)
      return
    }
    setVendorCodeInput('')
    setBuyerInput('')
    setLines([])
  }

  const handleVendorCodeChange = (value: string) => {
    setVendorCodeInput(value)
    setFieldErrors((prev) => ({ ...prev, vendorCode: undefined }))
    const matched = vendors.find((v) => v.code.trim().toLowerCase() === value.trim().toLowerCase())
    if (matched) {
      setVendorNameInput(matched.name)
      setBillToAddress(matched.billToAddress ?? '')
      setShipToAddress(matched.shipToAddress ?? matched.billToAddress ?? '')
      
      const buyerName = matched.salesEmployeeName?.trim() || (
        matched.salesEmployeeCode 
          ? salesEmployees.find(s => normalizeCodeForCompare(s.code) === normalizeCodeForCompare(matched.salesEmployeeCode))?.name?.trim() || ''
          : ''
      )
      setBuyerInput(buyerName)
      setVendorNameFocused(false)
      setVendorCodeFocused(false)
      return
    }
    setVendorNameInput('')
    setBuyerInput('')
    setLines([])
  }

  const handleWarehouseInputChange = (value: string) => {
    setWarehouseInput(value)
    setFieldErrors((prev) => ({ ...prev, warehouseCode: undefined }))
    const matched = warehouses.find(
      (w) =>
        w.name.trim().toLowerCase() === value.trim().toLowerCase() ||
        w.code.trim().toLowerCase() === value.trim().toLowerCase(),
    )
    if (matched) {
      setLines((prev) => prev.map((row) => ({ ...row, warehouseCode: matched.code })))
      setWarehouseFocused(false)
    }
  }

  const handleBuyerChange = (value: string) => {
    setBuyerInput(value)
    setFieldErrors((prev) => ({ ...prev, salesEmployee: undefined }))
    const matched = salesEmployees.find(
      (s) =>
        s.name.trim().toLowerCase() === value.trim().toLowerCase() ||
        s.code.trim().toLowerCase() === value.trim().toLowerCase(),
    )
    if (matched) {
      setBuyerFocused(false)
    }
  }

  const openProductPopup = (rowId: string | null = null) => {
    setActiveProductRowId(rowId)
    if (!vendorNameInput.trim() || !vendorCodeInput.trim()) {
      setFieldErrors((prev) => ({ 
        ...prev, 
        vendorName: !vendorNameInput.trim() ? AP_INVOICE_FIELD_ERROR_TEXT.vendorName : undefined,
        vendorCode: !vendorCodeInput.trim() ? AP_INVOICE_FIELD_ERROR_TEXT.vendorCode : undefined,
      }))
      return
    }
    setProductPopupOpen(true)
  }

  const selectWarehouse = (warehouse: LookupItem) => {
    setWarehouseInput(warehouse.name)
    setLines((prev) => prev.map((row) => ({ ...row, warehouseCode: warehouse.code })))
    setWarehouseFocused(false)
  }

  const selectBuyer = (item: LookupItem) => {
    setBuyerInput(item.name)
    setBuyerFocused(false)
  }

  const applyProductToRow = (product: ProductLookupItem) => {
    setLines((prev) => {
      if (activeProductRowId) {
        return prev.map((row) => row.id === activeProductRowId ? {
          ...row,
          productCode: product.code,
          productName: product.name,
          stock: Number(product.stock ?? 0),
          price: Number(product.price ?? 0),
          warehouseCode: effectiveWarehouseCode || '',
          uomCode: String(product.purchaseUomCode ?? product.uomCode ?? '').trim(),
          uomEntry: product.purchaseUomEntry ?? product.uomEntry,
          quantity: 1,
        } : row)
      }
      return [...prev, {
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        productCode: product.code,
        productName: product.name,
        stock: Number(product.stock ?? 0),
        currency: String(product.currency ?? ''),
        taxCode: String(product.taxCode ?? ''),
        taxRate: Number(product.taxRate ?? 0),
        uomCode: String(product.purchaseUomCode ?? product.uomCode ?? '').trim(),
        uomEntry: product.purchaseUomEntry ?? product.uomEntry,
        quantity: 1,
        discountPercent: 0,
        discountAmount: 0,
        comment: '',
        price: Number(product.price ?? 0),
        warehouseCode: effectiveWarehouseCode || '',
      }]
    })
    setProductPopupOpen(false)
    setProductSearch('')
  }

  const applyProductsToRows = (products: ProductLookupItem[]) => {
    setLines((prev) => [
      ...prev,
      ...products.map((product) => ({
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        productCode: product.code,
        productName: product.name,
        stock: Number(product.stock ?? 0),
        currency: String(product.currency ?? ''),
        taxCode: String(product.taxCode ?? ''),
        taxRate: Number(product.taxRate ?? 0),
        uomCode: String(product.purchaseUomCode ?? product.uomCode ?? '').trim(),
        uomEntry: product.purchaseUomEntry ?? product.uomEntry,
        quantity: 1,
        discountPercent: 0,
        discountAmount: 0,
        comment: '',
        price: Number(product.price ?? 0),
        warehouseCode: effectiveWarehouseCode || '',
      }))
    ])
    setProductPopupOpen(false)
    setProductSearch('')
  }

  const handleCreateAPInvoice = async () => {
    const missing = AP_INVOICE_MANDATORY_FIELDS.filter(field => {
      if (field === 'vendorName') return !vendorNameInput.trim()
      if (field === 'vendorCode') return !vendorCodeInput.trim()
      if (field === 'referenceNo') return !header.referenceNo.trim()
      if (field === 'comments') return !header.remarks.trim()
      return false
    })

    if (missing.length > 0) {
      const nextErrors = { ...EMPTY_AP_INVOICE_FIELD_ERRORS }
      missing.forEach((field) => { nextErrors[field] = AP_INVOICE_FIELD_ERROR_TEXT[field] })
      setFieldErrors(nextErrors)
      setCreateError('Fill required fields before creating/updating A/P Invoice.')
      return
    }

    const filteredRows = rows.filter(r => r.quantity > 0)
    if (filteredRows.length === 0) {
      setCreateError('Set at least one line quantity greater than 0.')
      return
    }

    // Validate warehouse is selected for all lines
    const linesMissingWarehouse = filteredRows.filter((row) => !row.warehouseCode.trim())
    if (linesMissingWarehouse.length > 0) {
      const missingItemCodes = linesMissingWarehouse.map((row) => row.productCode || '<unknown>')
      setCreateError(`Warehouse is required for: ${missingItemCodes.join(', ')}`)
      return
    }

    const toastHandle = documentActionToast('A/P Invoice', isEditMode ? 'update' : 'create')
    try {
      if (isEditMode) {
        const id = editDetailQuery.data?.data?.id ?? editDetailQuery.data?.data?.DocEntry
        const updatePayload = {
          DocDueDate: header.docDueDate || undefined,
          Comments: [header.referenceNo.trim(), header.remarks.trim()].filter(Boolean).join(' | ') || undefined,
          NumAtCard: header.referenceNo.trim() || undefined,
        }
        await updateMutation.mutateAsync({ id: id!, payload: updatePayload })
      } else {
        const createPayload = {
          CardCode: vendorCodeInput.trim(),
          DocDate: header.docDate || undefined,
          DocDueDate: header.docDueDate || undefined,
          Comments: [header.referenceNo.trim(), header.remarks.trim()].filter(Boolean).join(' | ') || undefined,
          NumAtCard: header.referenceNo.trim() || undefined,
          Address: billToAddress.trim() || undefined,
          Address2: shipToAddress.trim() || undefined,
          DocumentLines: filteredRows.map((row) => ({
            ItemCode: row.productCode,
            Quantity: row.quantity,
            UnitPrice: row.price,
            DiscountPercent: row.discountPercent,
            UoMCode: row.uomCode || undefined,
            WarehouseCode: row.warehouseCode || undefined,
            BaseType: row.baseType,
            BaseEntry: row.baseEntry,
            BaseLine: row.baseLine,
          })),
        });
        await createMutation.mutateAsync({ payload: createPayload })
      }
      toastHandle.success()
      if (!isEditMode) resetAPInvoiceCreate()
    } catch (error) {
      toastHandle.error()
      const errorMsg = normalizeCreateOrderErrorMessage(error, 'Failed to process A/P Invoice.')
      setCreateError(errorMsg)

      // Specifically handle SAP Business One duplicate reference errors (NumAtCard)
      if (errorMsg.toLowerCase().includes('already exists') && 
          (errorMsg.toLowerCase().includes('numatcard') || errorMsg.toLowerCase().includes('reference'))) {
        setFieldErrors(prev => ({
          ...prev,
          referenceNo: 'Customer Ref No already exists for this vendor.'
        }))
      }
    }
  }

  const missingMandatoryFields = useMemo(() =>
    AP_INVOICE_MANDATORY_FIELDS.filter(field => {
      if (field === 'vendorName') return !vendorNameInput.trim()
      if (field === 'vendorCode') return !vendorCodeInput.trim()
      if (field === 'warehouseCode') return !warehouseInput.trim()
      if (field === 'referenceNo') return !header.referenceNo.trim()
      if (field === 'comments') return !header.remarks.trim()
      return false
    }), [vendorNameInput, vendorCodeInput, warehouseInput, header.referenceNo, header.remarks])

  const requiredCompletionPercent = useMemo(() => 
    ((AP_INVOICE_MANDATORY_FIELDS.length - missingMandatoryFields.length) / AP_INVOICE_MANDATORY_FIELDS.length) * 100
  , [missingMandatoryFields])

  return {
    isEditMode,
    isEditHydrated: !isEditMode || hydratedDocNum === editDocNum,
    today,
    activeDatePicker,
    setActiveDatePicker,
    docDateContainerRef,
    deliveryDateContainerRef,
    handleDocDateChange: (val: string) => setHeader({ docDate: val }),
    handleDocDueDateChange: (val: string) => setHeader({ docDueDate: val }),
    showEditRestrictedToast: notifyRestricted,

    vendorsQuery,
    warehousesQuery,
    salesEmployeesQuery,
    productsQuery,
    productWarehouseStocksQuery,
    editDetailQuery,
    createMutation,
    updateMutation,

    vendorNameSuggestions,
    vendorCodeSuggestions,
    warehouseSuggestions,
    buyerSuggestions,
    vendors,
    warehouses,
    salesEmployees,

    vendorNameInput, vendorCodeInput, warehouseInput, buyerInput,
    vendorNameFocused, setVendorNameFocused, vendorCodeFocused, setVendorCodeFocused,
    buyerFocused, setBuyerFocused, warehouseFocused, setWarehouseFocused,
    docDate: header.docDate, docDueDate: header.docDueDate,
    referenceNo: header.referenceNo, remarks: header.remarks,
    billToAddress, shipToAddress, isClosed,
    products: productsQuery.data ?? [],

    modalOpen, modalMode, modalSearch, setModalOpen, setModalSearch,
    openPopup: openPopupByMode, handleLookupModalSearchSync,
    popupResults: useMemo(() => filterAndRankLookups((
      modalMode.includes('vendor') ? vendors : modalMode === 'warehouse' ? warehouses : salesEmployees
    ) as any[], modalSearch), [vendors, warehouses, salesEmployees, modalSearch, modalMode]),

    productPopupOpen, productSearch, setProductPopupOpen, setProductSearch,
    openProductPopup, 
    loadMoreProducts: () => setProductQueryLimit(prev => Math.min(prev + 10, FULL_PRODUCT_LIMIT)),
    applyProductToRow, applyProductsToRows,
    prefetchProducts: () => {}, // Simplified
    isLookupLoading: modalMode.includes('vendor') ? vendorsQuery.isLoading : modalMode === 'warehouse' ? warehousesQuery.isLoading : salesEmployeesQuery.isLoading,
    lookupError: (modalMode.includes('vendor') ? vendorsQuery.error : modalMode === 'warehouse' ? warehousesQuery.error : salesEmployeesQuery.error)?.message ?? null,
    isProductsLoading: productsQuery.isLoading,
    productsError: productsQuery.error?.message ?? null,
    warehouseCode: effectiveWarehouseCode,

    rows,
    productRowDrafts,
    setProductRowDraft: (id: string, field: string, value: string) => setProductRowDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } })),
    clearProductRowDraft: (id: string, field: string) => setProductRowDrafts(prev => {
      const next = { ...prev[id] }; delete (next as any)[field]
      return { ...prev, [id]: next }
    }),
    updateProductRow: (id: string, patch: any) => setLines(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r)),
    removeProductRow: (id: string) => setLines(prev => prev.filter(r => r.id !== id)),

    stockPreviewProduct, setStockPreviewProduct,
    openStockPreview: setStockPreviewProduct,

    fieldErrors, createError,
    createDisabledReason: missingMandatoryFields.length > 0 ? 'Mandatory fields missing' : rows.length === 0 ? 'No lines' : null,
    missingSearchMandatoryFields: !vendorCodeInput || !vendorNameInput ? ['vendorName', 'vendorCode'] : [],
    searchRequiredCompletionPercent: (!vendorCodeInput || !vendorNameInput) ? 50 : 100,
    searchMandatoryFields: ['vendorName', 'vendorCode'] as const,
    missingMandatoryFields,
    requiredCompletionPercent,
    requiredFieldsTotal: AP_INVOICE_MANDATORY_FIELDS.length,
    requiredFieldLabelText: AP_INVOICE_FIELD_LABEL_TEXT,
    handleCreateOrder: handleCreateAPInvoice,

    setDocDate: (val: string) => (isEditMode ? notifyRestricted('Document Date') : setHeader({ docDate: val })),
    setDocDueDate: (val: string) => (isClosed ? notifyRestricted('Due Date') : setHeader({ docDueDate: val })),
    setBuyerInput: (val: string) => (isEditMode ? notifyRestricted('Buyer') : handleBuyerChange(val)),
    setWarehouseInput: (val: string) => (isEditMode ? notifyRestricted('Warehouse') : handleWarehouseInputChange(val)),
    setReferenceNo: (val: string) => (isClosed ? notifyRestricted('Customer Ref No') : setHeader({ referenceNo: val })),
    setRemarks: (val: string) => (isClosed ? notifyRestricted('Remarks') : setHeader({ remarks: val })),
    setBillToAddress: (val: string) => (isEditMode ? notifyRestricted('Bill To Address') : setBillToAddress(val)),
    setShipToAddress: (val: string) => (isEditMode ? notifyRestricted('Ship To Address') : setShipToAddress(val)),
    selectVendor: (val: any) => (isEditMode ? notifyRestricted('Vendor') : selectVendor(val)),
    selectWarehouse: (val: any) => (isEditMode ? notifyRestricted('Warehouse') : selectWarehouse(val)),
    selectSalesEmployee: (val: any) => (isEditMode ? notifyRestricted('Sales Employee') : selectBuyer(val)),
    handleVendorNameChange: (val: string) => (isEditMode ? notifyRestricted('Vendor Name') : handleVendorNameChange(val)),
    handleVendorCodeChange: (val: string) => (isEditMode ? notifyRestricted('Vendor Code') : handleVendorCodeChange(val)),
  }
}







