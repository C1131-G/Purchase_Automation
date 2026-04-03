import { useQuery, useQueryClient } from '@tanstack/react-query'
import { goeyToast } from 'goey-toast'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  useCreateAPInvoice,
  useUpdateAPInvoice,
} from '@/features/create-pages/ap-invoice-create/api/ap-invoice-create.mutations'
import { useAPInvoiceLookups } from '@/features/create-pages/ap-invoice-create/hooks/use-ap-invoice-lookups'
import {
  AP_INVOICE_FIELD_ERROR_TEXT,
  AP_INVOICE_FIELD_LABEL_TEXT,
  AP_INVOICE_MANDATORY_FIELDS,
  type APInvoiceMandatoryField,
  filterAndRankLookups,
  getTodayISO,
} from '@/features/create-pages/ap-invoice-create/utils/ap-invoice-create.utils'
import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
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
import { syncLookupSearchByMode } from '@/features/create-pages/create-shared/utils/lookup-search-sync'
import { pageLoadingToast } from '@/features/create-pages/create-shared/utils/page-loading-toast'
import { resolveProductTaxRates } from '@/features/create-pages/create-shared/utils/product-tax-rate'
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

import { generateSingleSourceReference } from '../../create-shared/utils/auto-reference'

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
  warehouseCode: undefined,
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

export function useAPInvoiceCreate({
  mode = 'create',
  docNum,
  sourceDocNum,
  sourceDocType,
}: UseAPInvoiceCreateOptions) {
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
  const loadingToastRef = useRef<ReturnType<typeof pageLoadingToast> | null>(null)

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
  const [fieldErrors, setFieldErrors] = useState<APInvoiceFieldErrors>(
    EMPTY_AP_INVOICE_FIELD_ERRORS,
  )
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
  const docStatus =
    editDetailQuery.data?.data?.DocStatus === 'O'
      ? 'Open'
      : editDetailQuery.data?.data?.DocStatus === 'C'
        ? 'Closed'
        : (editDetailQuery.data?.data?.DocStatus ?? 'Open')

  const sourceDetailQueryGRPO = useQuery({
    ...grpoQueries.detailByDocNum(sourceDocNum || ''),
    enabled: mode === 'create' && sourceDocType === 'GoodsReceiptPO' && Boolean(sourceDocNum),
    staleTime: 0,
    refetchOnMount: true,
  })

  const sourceDetailQueryPO = useQuery({
    ...purchaseOrderQueries.detailByDocNum(sourceDocNum || ''),
    enabled: mode === 'create' && sourceDocType === 'PurchaseOrder' && Boolean(sourceDocNum),
    staleTime: 0,
    refetchOnMount: true,
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

    // Show loading toast when starting edit hydration
    if (!loadingToastRef.current) {
      loadingToastRef.current = pageLoadingToast('A/P Invoice', 'edit')
    }

    void (async () => {
      setVendorCodeInput(String(detail.CardCode ?? '').trim())
      setVendorNameInput(String(detail.CardName ?? '').trim())
      const loadedDocDate = String(detail.DocDate ?? '').slice(0, 10) || getTodayISO()
      let referenceNo = String((detail as { NumAtCard?: string }).NumAtCard ?? '').trim()
      let remarks = String(detail.Comments ?? '').trim()

      // SAP Service Layer auto-generates "Based on ..." in Comments for copy-from flows,
      // and may not store NumAtCard. If NumAtCard is empty but Comments has the
      // auto-generated reference pattern, treat Comments as the reference.
      const autoRefPattern = /^based on /i
      if (!referenceNo && autoRefPattern.test(remarks)) {
        referenceNo = remarks
        remarks = ''
      }

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

      setBuyerInput(buyerFromDocCode || matchedVendor?.salesEmployeeName?.trim() || '')
      setHeader({
        docDate: loadedDocDate,
        docDueDate: String(detail.DocDueDate ?? '').slice(0, 10) || loadedDocDate,
        referenceNo,
        remarks,
      })
      // Set addresses from document (matching PO behavior)
      const shipAddress = String(detail.Address ?? '').trim()
      setBillToAddress(shipAddress)
      setShipToAddress(shipAddress)
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
      // Dismiss loading toast when edit hydration is complete
      loadingToastRef.current?.dismiss()
      loadingToastRef.current = null
    })()
  }, [
    editDocNum,
    editDetailQuery.data,
    isEditMode,
    queryClient,
    salesEmployees,
    setHeader,
    setLines,
    vendors,
  ])

  // Copy-From Hydration (GRPO or PO)
  useEffect(() => {
    if (mode !== 'create') return
    const currentSourceDocNum = sourceDocNum
    const currentSourceDocType = sourceDocType
    if (!currentSourceDocNum || !currentSourceDocType) return

    const detail =
      sourceDocType === 'GoodsReceiptPO'
        ? sourceDetailQueryGRPO.data?.data
        : sourceDetailQueryPO.data?.data
    if (!detail) return

    const isMetadataLoaded = vendors.length > 0 && salesEmployees.length > 0
    const hydrationKey = `${currentSourceDocType}-${currentSourceDocNum}`
    if (hydratedDocNumRef.current === hydrationKey && isMetadataLoaded) return

    // Show loading toast when starting copy-from hydration
    if (!loadingToastRef.current) {
      loadingToastRef.current = pageLoadingToast('A/P Invoice', 'create')
    }

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

    // Extract reference from source document if available
    const numAtCard = String((detail as { NumAtCard?: string }).NumAtCard ?? '').trim()
    const sourceReferenceNo = numAtCard || (hasReferenceMarker ? (splitComments[0] ?? '') : '')

    // Auto-generate reference if not present in source document
    const autoReference = generateSingleSourceReference(currentSourceDocType, currentSourceDocNum)
    const finalReferenceNo = sourceReferenceNo || autoReference
    const referenceWasAutoFilled = !sourceReferenceNo

    const remarks = originalRemarks
    const docDueDate = String(detail.DocDueDate ?? '').slice(0, 10)

    void (async () => {
      const detailLines = detail.DocumentLines ?? []

      // Fetch tax rates BEFORE mapping lines (must be awaited first)
      const taxRateByItemCode = await resolveProductTaxRates(
        queryClient,
        detailLines.map((line) => String(line.ItemCode ?? '').trim()),
      )

      const mappedLines = (detail.DocumentLines ?? []).map((line, index: number) => {
        // Use open quantity (remaining balance) for copy-to, fall back to original quantity
        const lineData = line as Record<string, unknown>
        const openQty = Number(lineData.OpenQty ?? lineData.OpenQuantity ?? line.Quantity ?? 1)
        const quantity = openQty
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
          baseEntry: detail.DocEntry ?? (detail as { id?: number }).id,
          baseLine: line.LineNum ?? index,
          baseType: sourceDocType === 'GoodsReceiptPO' ? 20 : 22,
        }
      })

      setVendorCodeInput(vendorCode)
      setVendorNameInput(vendorName)
      setBuyerInput(buyerName)
      setWarehouseInput(warehouseCode)
      // Set addresses from source document (matching PO behavior)
      const shipAddress = String(detail.Address ?? '').trim()
      setBillToAddress(shipAddress)
      setShipToAddress(shipAddress)
      setHeader({
        docDate: getTodayISO(),
        docDueDate,
        referenceNo: finalReferenceNo,
        remarks,
        referenceAutoFilled: referenceWasAutoFilled,
      })
      setLines(mappedLines)
      setProductRowDrafts({})
      if (isMetadataLoaded) {
        hydratedDocNumRef.current = `${currentSourceDocType}-${currentSourceDocNum}`
      }
      // Dismiss loading toast when copy-from hydration is complete
      loadingToastRef.current?.dismiss()
      loadingToastRef.current = null
    })()
  }, [
    sourceDetailQueryGRPO.data,
    sourceDetailQueryPO.data,
    mode,
    sourceDocNum,
    sourceDocType,
    queryClient,
    salesEmployees,
    setHeader,
    setLines,
    vendors,
  ])

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

    const buyerName =
      vendor.salesEmployeeName?.trim() ||
      (vendor.salesEmployeeCode
        ? salesEmployees
            .find(
              (s) =>
                normalizeCodeForCompare(s.code) ===
                normalizeCodeForCompare(vendor.salesEmployeeCode),
            )
            ?.name?.trim() || ''
        : '')
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

      const buyerName =
        matched.salesEmployeeName?.trim() ||
        (matched.salesEmployeeCode
          ? salesEmployees
              .find(
                (s) =>
                  normalizeCodeForCompare(s.code) ===
                  normalizeCodeForCompare(matched.salesEmployeeCode),
              )
              ?.name?.trim() || ''
          : '')
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

      const buyerName =
        matched.salesEmployeeName?.trim() ||
        (matched.salesEmployeeCode
          ? salesEmployees
              .find(
                (s) =>
                  normalizeCodeForCompare(s.code) ===
                  normalizeCodeForCompare(matched.salesEmployeeCode),
              )
              ?.name?.trim() || ''
          : '')
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
        return prev.map((row) =>
          row.id === activeProductRowId
            ? {
                ...row,
                productCode: product.code,
                productName: product.name,
                stock: Number(product.stock ?? 0),
                price: Number(product.price ?? 0),
                warehouseCode: effectiveWarehouseCode || '',
                uomCode: String(product.purchaseUomCode ?? product.uomCode ?? '').trim(),
                uomEntry: product.purchaseUomEntry ?? product.uomEntry,
                quantity: 1,
              }
            : row,
        )
      }
      return [
        ...prev,
        {
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
        },
      ]
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
      })),
    ])
    setProductPopupOpen(false)
    setProductSearch('')
  }

  const handleCreateAPInvoice = async () => {
    const missing = AP_INVOICE_MANDATORY_FIELDS.filter((field) => {
      if (field === 'vendorName') return !vendorNameInput.trim()
      if (field === 'vendorCode') return !vendorCodeInput.trim()
      if (field === 'warehouseCode') {
        // Check if ANY row has a warehouseCode selected
        return !rows.some((row) => row.warehouseCode?.trim())
      }
      return false
    })

    if (missing.length > 0) {
      const nextErrors = { ...EMPTY_AP_INVOICE_FIELD_ERRORS }
      missing.forEach((field) => {
        nextErrors[field] = AP_INVOICE_FIELD_ERROR_TEXT[field]
      })
      setFieldErrors(nextErrors)
      setCreateError('Fill required fields before creating/updating A/P Invoice.')
      return
    }

    const filteredRows = rows.filter((r) => r.quantity > 0)
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
          Comments: header.remarks.trim() || undefined,
          NumAtCard: header.referenceNo.trim() || undefined,
        }
        await updateMutation.mutateAsync({ id: id!, payload: updatePayload })
      } else {
        const createPayload = {
          CardCode: vendorCodeInput.trim(),
          DocDate: header.docDate || undefined,
          DocDueDate: header.docDueDate || undefined,
          Comments: header.remarks.trim() || undefined,
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
        }
        await createMutation.mutateAsync({ payload: createPayload })
      }
      toastHandle.success()
      if (!isEditMode) {
        resetAPInvoiceCreate()

        // Invalidate PO and GRPO queries so source docs show updated quantities after AP Invoice save
        void queryClient.invalidateQueries({
          queryKey: purchaseOrderQueries.list({ page: 1, limit: 10 }).queryKey,
        })
        void queryClient.invalidateQueries({
          queryKey: grpoQueries.list({ page: 1, limit: 10 }).queryKey,
        })

        // Invalidate specific PO detail query if source was PO
        if (sourceDocNum && sourceDocType === 'PurchaseOrder') {
          void queryClient.invalidateQueries({
            queryKey: purchaseOrderQueries.detailByDocNum(sourceDocNum).queryKey,
          })
        }

        // Invalidate specific GRPO detail query if source was GRPO
        if (sourceDocNum && sourceDocType === 'GoodsReceiptPO') {
          void queryClient.invalidateQueries({
            queryKey: grpoQueries.detailByDocNum(sourceDocNum).queryKey,
          })
        }
      }
    } catch (error) {
      toastHandle.error()
      const errorMsg = normalizeCreateOrderErrorMessage(error, 'Failed to process A/P Invoice.')
      setCreateError(errorMsg)

      // Specifically handle SAP Business One duplicate reference errors (NumAtCard)
      if (
        errorMsg.toLowerCase().includes('already exists') &&
        (errorMsg.toLowerCase().includes('numatcard') ||
          errorMsg.toLowerCase().includes('reference'))
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          referenceNo: 'Customer Ref No already exists for this vendor.',
        }))
      }
    }
  }

  const missingMandatoryFields = useMemo(
    () =>
      AP_INVOICE_MANDATORY_FIELDS.filter((field) => {
        if (field === 'vendorName') return !vendorNameInput.trim()
        if (field === 'vendorCode') return !vendorCodeInput.trim()
        if (field === 'warehouseCode') {
          // Check if ANY row has a warehouseCode selected
          return !rows.some((row) => row.warehouseCode?.trim())
        }
        return false
      }),
    [vendorNameInput, vendorCodeInput, rows],
  )

  const requiredCompletionPercent = useMemo(
    () =>
      ((AP_INVOICE_MANDATORY_FIELDS.length - missingMandatoryFields.length) /
        AP_INVOICE_MANDATORY_FIELDS.length) *
      100,
    [missingMandatoryFields],
  )

  return {
    isEditMode,
    isEditHydrated: !isEditMode || hydratedDocNum === editDocNum,
    isSourceHydrating:
      mode === 'create' &&
      Boolean(sourceDocNum) &&
      (sourceDocType === 'PurchaseOrder'
        ? sourceDetailQueryPO.isLoading
        : sourceDetailQueryGRPO.isLoading),
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

    vendorNameInput,
    vendorCodeInput,
    warehouseInput,
    buyerInput,
    vendorNameFocused,
    setVendorNameFocused,
    vendorCodeFocused,
    setVendorCodeFocused,
    buyerFocused,
    setBuyerFocused,
    warehouseFocused,
    setWarehouseFocused,
    docDate: header.docDate,
    docDueDate: header.docDueDate,
    referenceNo: header.referenceNo,
    referenceAutoFilled: header.referenceAutoFilled,
    remarks: header.remarks,
    billToAddress,
    shipToAddress,
    isClosed,
    docStatus,
    products: productsQuery.data ?? [],

    modalOpen,
    modalMode,
    modalSearch,
    setModalOpen,
    setModalSearch,
    openPopup: openPopupByMode,
    handleLookupModalSearchSync,
    popupResults: useMemo(
      () =>
        filterAndRankLookups(
          modalMode.includes('vendor')
            ? vendors
            : modalMode === 'warehouse'
              ? warehouses
              : salesEmployees,
          modalSearch,
        ),
      [vendors, warehouses, salesEmployees, modalSearch, modalMode],
    ),

    productPopupOpen,
    productSearch,
    setProductPopupOpen,
    setProductSearch,
    openProductPopup,
    loadMoreProducts: () => setProductQueryLimit((prev) => Math.min(prev + 10, FULL_PRODUCT_LIMIT)),
    applyProductToRow,
    applyProductsToRows,
    prefetchProducts: () => {}, // Simplified
    isLookupLoading: modalMode.includes('vendor')
      ? vendorsQuery.isLoading
      : modalMode === 'warehouse'
        ? warehousesQuery.isLoading
        : salesEmployeesQuery.isLoading,
    lookupError:
      (modalMode.includes('vendor')
        ? vendorsQuery.error
        : modalMode === 'warehouse'
          ? warehousesQuery.error
          : salesEmployeesQuery.error
      )?.message ?? null,
    isProductsLoading: productsQuery.isLoading,
    productsError: productsQuery.error?.message ?? null,
    warehouseCode: effectiveWarehouseCode,

    rows,
    productRowDrafts,
    setProductRowDraft: (id: string, field: string, value: string) =>
      setProductRowDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } })),
    clearProductRowDraft: (id: string, field: string) =>
      setProductRowDrafts((prev) => {
        const next = { ...prev[id] }
        delete next[field as keyof typeof next]
        return { ...prev, [id]: next }
      }),
    updateProductRow: (id: string, patch: Partial<APInvoiceCreateLine>) =>
      setLines((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    removeProductRow: (id: string) => setLines((prev) => prev.filter((r) => r.id !== id)),

    stockPreviewProduct,
    setStockPreviewProduct,
    openStockPreview: setStockPreviewProduct,

    fieldErrors,
    createError,
    createDisabledReason:
      missingMandatoryFields.length > 0
        ? 'Mandatory fields missing'
        : rows.length === 0
          ? 'No lines'
          : null,
    missingSearchMandatoryFields:
      !vendorCodeInput || !vendorNameInput ? ['vendorName', 'vendorCode'] : [],
    searchRequiredCompletionPercent: !vendorCodeInput || !vendorNameInput ? 50 : 100,
    searchMandatoryFields: ['vendorName', 'vendorCode'] as const,
    missingMandatoryFields,
    requiredCompletionPercent,
    requiredFieldsTotal: AP_INVOICE_MANDATORY_FIELDS.length,
    requiredFieldLabelText: AP_INVOICE_FIELD_LABEL_TEXT,
    handleCreateOrder: handleCreateAPInvoice,

    setDocDate: (val: string) =>
      isEditMode ? notifyRestricted('Document Date') : setHeader({ docDate: val }),
    setDocDueDate: (val: string) =>
      isClosed ? notifyRestricted('Due Date') : setHeader({ docDueDate: val }),
    setBuyerInput: (val: string) =>
      isEditMode ? notifyRestricted('Buyer') : handleBuyerChange(val),
    setWarehouseInput: (val: string) =>
      isEditMode ? notifyRestricted('Warehouse') : handleWarehouseInputChange(val),
    setReferenceNo: (val: string) =>
      isClosed ? notifyRestricted('Customer Ref No') : setHeader({ referenceNo: val }),
    setRemarks: (val: string) =>
      isClosed ? notifyRestricted('Remarks') : setHeader({ remarks: val }),
    setBillToAddress: (val: string) =>
      isEditMode ? notifyRestricted('Bill To Address') : setBillToAddress(val),
    setShipToAddress: (val: string) =>
      isEditMode ? notifyRestricted('Ship To Address') : setShipToAddress(val),
    selectVendor: (val: LookupItem) =>
      isEditMode ? notifyRestricted('Vendor') : selectVendor(val),
    selectWarehouse: (val: LookupItem) =>
      isEditMode ? notifyRestricted('Warehouse') : selectWarehouse(val),
    selectSalesEmployee: (val: LookupItem) =>
      isEditMode ? notifyRestricted('Sales Employee') : selectBuyer(val),
    handleVendorNameChange: (val: string) =>
      isEditMode ? notifyRestricted('Vendor Name') : handleVendorNameChange(val),
    handleVendorCodeChange: (val: string) =>
      isEditMode ? notifyRestricted('Vendor Code') : handleVendorCodeChange(val),
  }
}
