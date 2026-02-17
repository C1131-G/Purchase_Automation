import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'

import { CreateModalSkeleton } from '@/components/skeleton/create-modal-skeleton'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { createSharedQueries as purchaseOrderCreateQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { type ProductLookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { AddressReferenceSection } from '@/features/create-pages/create-shared/components/sections/address-reference.section'
import { DocumentDetailsSection } from '@/features/create-pages/create-shared/components/sections/document-details.section'
import { VendorCustomerSection } from '@/features/create-pages/create-shared/components/sections/vendor-customer.section'
import { WarehouseLogisticsSection } from '@/features/create-pages/create-shared/components/sections/warehouse-logistics.section'
import {
  getMissingMandatoryCreateFieldsTyped,
  PURCHASE_ORDER_MANDATORY_FIELDS,
} from '@/features/create-pages/create-shared/config/create-mandatory-fields'
import {
  calculateOrderTotals,
  calculateSummaryCurrency,
} from '@/features/create-pages/create-shared/utils/create-order.calculations'
import {
  type ActiveDatePicker,
  type LookupOption,
  type PopupMode,
  type ProductRow,
  type ProductRowDraft,
  type StockPreviewProduct,
} from '@/features/create-pages/create-shared/utils/create-order.types'
import {
  normalizeCreateOrderErrorMessage,
  parseISODate,
  toDisplayDate,
  toISODate,
} from '@/features/create-pages/create-shared/utils/create-order.utils'
import { useCreatePurchaseOrder } from '@/features/create-pages/purchase-order-create/api/purchase-order-create.mutations'
import {
  usePOHeader,
  useResetPOCreateAction,
  useSetPOHeaderAction,
} from '@/store/create/po-create.store'
import { toast } from '@/store/toast.store'

const LookupPopupModal = lazy(() =>
  import('@/features/create-pages/purchase-order-create/components/purchase-order-create.modals').then(
    (module) => ({
      default: module.LookupPopupModal,
    }),
  ),
)
const ProductPopupModal = lazy(() =>
  import('@/features/create-pages/purchase-order-create/components/purchase-order-create.modals').then(
    (module) => ({
      default: module.ProductPopupModal,
    }),
  ),
)
const ProductWarehouseStockModal = lazy(() =>
  import('@/features/create-pages/purchase-order-create/components/purchase-order-create.modals').then(
    (module) => ({
      default: module.ProductWarehouseStockModal,
    }),
  ),
)

type ProductSearchFieldError = {
  vendorName: string | undefined
  vendorCode: string | undefined
  docDueDate: string | undefined
  warehouseCode: string | undefined
  salesEmployee: string | undefined
  billToAddress: string | undefined
  shipToAddress: string | undefined
  referenceNo: string | undefined
  comments: string | undefined
}
const EMPTY_PRODUCT_SEARCH_FIELD_ERRORS: ProductSearchFieldError = {
  vendorName: undefined,
  vendorCode: undefined,
  docDueDate: undefined,
  warehouseCode: undefined,
  salesEmployee: undefined,
  billToAddress: undefined,
  shipToAddress: undefined,
  referenceNo: undefined,
  comments: undefined,
}
const MANDATORY_ERROR_TEXT: Record<(typeof PURCHASE_ORDER_MANDATORY_FIELDS)[number], string> = {
  vendorCode: 'Vendor Code is required.',
  vendorName: 'Vendor Name is required.',
  docDueDate: 'Delivery Date is required.',
  warehouseCode: 'Warehouse is required.',
  salesEmployee: 'Buyer is required.',
  billToAddress: 'Bill To Address is required.',
  shipToAddress: 'Ship To Address is required.',
  referenceNo: 'Reference is required.',
  comments: 'Remarks is required.',
}
const REQUIRED_FIELD_LABEL_TEXT: Record<(typeof PURCHASE_ORDER_MANDATORY_FIELDS)[number], string> =
  {
    vendorCode: 'Vendor Code',
    vendorName: 'Vendor Name',
    docDueDate: 'Delivery Date',
    warehouseCode: 'Warehouse',
    salesEmployee: 'Buyer',
    billToAddress: 'Bill To Address',
    shipToAddress: 'Ship To Address',
    referenceNo: 'Reference',
    comments: 'Remarks',
  }

export function PurchaseOrderCreate() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const header = usePOHeader()
  const resetPOCreate = useResetPOCreateAction()
  const setHeader = useSetPOHeaderAction()
  const createPurchaseOrderMutation = useCreatePurchaseOrder()
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])
  const vendorsQuery = useQuery(purchaseOrderCreateQueries.vendors())
  const warehousesQuery = useQuery(purchaseOrderCreateQueries.warehouses())
  const salesEmployeesQuery = useQuery(purchaseOrderCreateQueries.salesEmployees())

  const [nameInput, setNameInput] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [warehouseInput, setWarehouseInput] = useState('')
  const [salesEmployeeInput, setSalesEmployeeInput] = useState('')
  const [billToAddress, setBillToAddress] = useState('')
  const [shipToAddress, setShipToAddress] = useState('')
  const [nameFocused, setNameFocused] = useState(false)
  const [codeFocused, setCodeFocused] = useState(false)
  const [warehouseFocused, setWarehouseFocused] = useState(false)
  const [salesEmployeeFocused, setSalesEmployeeFocused] = useState(false)
  const [activeDatePicker, setActiveDatePicker] = useState<ActiveDatePicker>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<PopupMode>('vendor-name')
  const [modalSearch, setModalSearch] = useState('')
  const [productRows, setProductRows] = useState<ProductRow[]>([])
  const [productRowDrafts, setProductRowDrafts] = useState<Record<string, ProductRowDraft>>({})
  const [productPopupOpen, setProductPopupOpen] = useState(false)
  const [productSearchFieldErrors, setProductSearchFieldErrors] = useState<ProductSearchFieldError>(
    EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  )
  const [productSearch, setProductSearch] = useState('')
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')
  const [activeProductRowId, setActiveProductRowId] = useState<string | null>(null)
  const [stockPreviewProduct, setStockPreviewProduct] = useState<StockPreviewProduct | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const docDateContainerRef = useRef<HTMLDivElement>(null)
  const deliveryDateContainerRef = useRef<HTMLDivElement>(null)
  const productSectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    resetPOCreate()
  }, [resetPOCreate])

  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data])
  const warehouses = useMemo(() => warehousesQuery.data ?? [], [warehousesQuery.data])
  const salesEmployees = useMemo(() => salesEmployeesQuery.data ?? [], [salesEmployeesQuery.data])
  const findVendorByCode = (value: string) =>
    (vendors as ProductLookupItem[]).find(
      (vendor) => vendor.code.toLowerCase() === value.trim().toLowerCase(),
    )
  const findVendorByName = (value: string) =>
    (vendors as ProductLookupItem[]).find(
      (vendor) => vendor.name.toLowerCase() === value.trim().toLowerCase(),
    )
  const findWarehouseByCode = (value: string) =>
    (warehouses as ProductLookupItem[]).find(
      (item) => item.code.toLowerCase() === value.trim().toLowerCase(),
    )
  const findWarehouseByName = (value: string) =>
    (warehouses as ProductLookupItem[]).find(
      (item) => item.name.toLowerCase() === value.trim().toLowerCase(),
    )
  const effectiveWarehouseCode = useMemo(() => {
    const lookup = warehouseInput.trim().toLowerCase()
    const matched = (warehouses as ProductLookupItem[]).find(
      (item: ProductLookupItem) =>
        item.name.toLowerCase() === lookup || item.code.toLowerCase() === lookup,
    )
    if (matched?.code) return matched.code
    return (header.warehouseCode ?? '').trim()
  }, [warehouseInput, warehouses, header.warehouseCode])
  const productsQuery = useQuery({
    ...purchaseOrderCreateQueries.products(
      effectiveWarehouseCode || undefined,
      debouncedProductSearch || undefined,
      debouncedProductSearch ? undefined : 100,
    ),
    enabled: productPopupOpen && Boolean(effectiveWarehouseCode),
  })
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const productWarehouseStocksQuery = useQuery({
    ...purchaseOrderCreateQueries.productWarehouseStocks(stockPreviewProduct?.code),
    enabled: Boolean(stockPreviewProduct?.code),
  })
  const productWarehouseStocks = useMemo(
    () => productWarehouseStocksQuery.data ?? [],
    [productWarehouseStocksQuery.data],
  )
  const nameSuggestions = useMemo(() => {
    const term = nameInput.trim().toLowerCase()
    if (!term) return (vendors as ProductLookupItem[]).slice(0, 10)
    return (vendors as ProductLookupItem[])
      .filter(
        (vendor) =>
          vendor.name.toLowerCase().includes(term) || vendor.code.toLowerCase().includes(term),
      )
      .slice(0, 8)
  }, [vendors, nameInput])

  const codeSuggestions = useMemo(() => {
    const term = codeInput.trim().toLowerCase()
    if (!term) return (vendors as ProductLookupItem[]).slice(0, 10)
    return (vendors as ProductLookupItem[])
      .filter(
        (vendor) =>
          vendor.code.toLowerCase().includes(term) || vendor.name.toLowerCase().includes(term),
      )
      .slice(0, 8)
  }, [vendors, codeInput])

  const popupResults = useMemo(() => {
    const term = modalSearch.trim().toLowerCase()
    const source = (
      modalMode === 'vendor-name' || modalMode === 'vendor-code'
        ? vendors
        : modalMode === 'warehouse'
          ? warehouses
          : salesEmployees
    ) as ProductLookupItem[]
    if (!term) return source
    return source.filter(
      (item: ProductLookupItem) =>
        (item.code || '').toLowerCase().includes(term) ||
        (item.name || '').toLowerCase().includes(term),
    )
  }, [vendors, warehouses, salesEmployees, modalSearch, modalMode])
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [productSearch])

  const selectVendor = (vendor: LookupOption) => {
    const nextBillToAddress = vendor.billToAddress ?? ''
    const nextShipToAddress = vendor.shipToAddress ?? ''
    setHeader({ vendorCode: vendor.code, vendorName: vendor.name })
    setNameInput(vendor.name)
    setCodeInput(vendor.code)
    setProductSearchFieldErrors((prev) => ({
      ...prev,
      vendorName: undefined,
      vendorCode: undefined,
      billToAddress: nextBillToAddress.trim() ? undefined : prev.billToAddress,
      shipToAddress: nextShipToAddress.trim() ? undefined : prev.shipToAddress,
    }))
    setBillToAddress(nextBillToAddress)
    setShipToAddress(nextShipToAddress)
    setNameFocused(false)
    setCodeFocused(false)
    setModalOpen(false)
  }

  const selectWarehouse = (item: { code: string; name: string }) => {
    setWarehouseInput(item.name)
    setHeader({ warehouseCode: item.code })
    setProductSearchFieldErrors((prev) => ({ ...prev, warehouseCode: undefined }))
    // Warm product list as soon as warehouse is chosen so popup opens with data immediately.
    void queryClient.prefetchQuery(purchaseOrderCreateQueries.products(item.code, undefined, 100))
    setWarehouseFocused(false)
    setModalOpen(false)
  }

  const selectSalesEmployee = (item: { code: string; name: string }) => {
    setSalesEmployeeInput(item.name)
    setProductSearchFieldErrors((prev) => ({ ...prev, salesEmployee: undefined }))
    setSalesEmployeeFocused(false)
    setModalOpen(false)
  }

  const openPopup = (mode: PopupMode) => {
    setModalMode(mode)
    if (mode === 'vendor-name') setModalSearch(nameInput)
    if (mode === 'vendor-code') setModalSearch(codeInput)
    if (mode === 'warehouse') setModalSearch('')
    if (mode === 'sales-employee') setModalSearch('')
    setModalOpen(true)
  }

  const warehouseSuggestions = useMemo(() => {
    const term = warehouseInput.trim().toLowerCase()
    if (!term) return (warehouses as ProductLookupItem[]).slice(0, 10)
    return (warehouses as ProductLookupItem[])
      .filter(
        (item: ProductLookupItem) =>
          item.code.toLowerCase().includes(term) || item.name.toLowerCase().includes(term),
      )
      .slice(0, 8)
  }, [warehouses, warehouseInput])

  const salesEmployeeSuggestions = useMemo(() => {
    const term = salesEmployeeInput.trim().toLowerCase()
    if (!term) return (salesEmployees as ProductLookupItem[]).slice(0, 10)
    return (salesEmployees as ProductLookupItem[])
      .filter(
        (item: ProductLookupItem) =>
          item.code.toLowerCase().includes(term) || item.name.toLowerCase().includes(term),
      )
      .slice(0, 8)
  }, [salesEmployees, salesEmployeeInput])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!activeDatePicker) return
      const target = event.target as Node
      const insideDoc = docDateContainerRef.current?.contains(target)
      const insideDelivery = deliveryDateContainerRef.current?.contains(target)
      if (!insideDoc && !insideDelivery) {
        setActiveDatePicker(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeDatePicker])

  const openProductPopup = (rowId: string | null = null) => {
    const nextErrors: ProductSearchFieldError = {
      ...EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
      vendorName: nameInput.trim() ? undefined : 'Vendor Name is required.',
      vendorCode: codeInput.trim() ? undefined : 'Vendor Code is required.',
      warehouseCode: effectiveWarehouseCode ? undefined : 'Warehouse is required.',
      salesEmployee: salesEmployeeInput.trim() ? undefined : 'Buyer is required.',
    }
    const hasErrors = Object.values(nextErrors).some(Boolean)
    setProductSearchFieldErrors(nextErrors)
    if (hasErrors) {
      return
    }

    setProductSearch('')
    setDebouncedProductSearch('')
    void queryClient.fetchQuery(
      purchaseOrderCreateQueries.products(effectiveWarehouseCode, undefined, 100),
    )
    setActiveProductRowId(rowId)
    setProductPopupOpen(true)
    window.requestAnimationFrame(() => {
      productSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const openStockPreview = (product: StockPreviewProduct) => {
    setStockPreviewProduct(product)
  }

  const updateProductRow = (id: string, patch: Partial<ProductRow>) => {
    setProductRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const removeProductRow = (id: string) => {
    setProductRows((prev) => prev.filter((row) => row.id !== id))
    setProductRowDrafts((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const setProductRowDraft = (id: string, field: keyof ProductRowDraft, value: string) => {
    setProductRowDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }))
  }

  const clearProductRowDraft = (id: string, field: keyof ProductRowDraft) => {
    setProductRowDrafts((prev) => {
      const rowDraft = prev[id]
      if (!rowDraft || rowDraft[field] === undefined) return prev
      const nextRowDraft = { ...rowDraft }
      delete nextRowDraft[field]
      if (Object.keys(nextRowDraft).length === 0) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: nextRowDraft }
    })
  }

  const prefetchProducts = () => {
    void queryClient.prefetchQuery(
      purchaseOrderCreateQueries.products(
        effectiveWarehouseCode || undefined,
        debouncedProductSearch || undefined,
        debouncedProductSearch ? undefined : 100,
      ),
    )
  }

  const applyProductToRow = (product: ProductLookupItem) => {
    void queryClient.prefetchQuery(purchaseOrderCreateQueries.productWarehouseStocks(product.code))

    const maxAllowed = Math.max(1, Math.floor(product.stock) - 1)
    if (activeProductRowId) {
      updateProductRow(activeProductRowId, {
        productCode: product.code,
        productName: product.name,
        stock: product.stock,
        price: product.price,
        currency: product.currency,
        taxCode: product.taxCode,
        taxRate: product.taxRate,
        quantity: Math.min(maxAllowed, 1),
        discountPercent: 0,
        discountAmount: 0,
      })
    } else {
      setProductRows((prev) => [
        ...prev,
        {
          id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          productCode: product.code,
          productName: product.name,
          stock: product.stock,
          price: product.price,
          currency: product.currency,
          taxCode: product.taxCode,
          taxRate: product.taxRate,
          quantity: Math.min(maxAllowed, 1),
          discountPercent: 0,
          discountAmount: 0,
          comment: '',
        },
      ])
    }
    setProductPopupOpen(false)
    setActiveProductRowId(null)
  }

  const createMandatoryValues = useMemo(
    () => ({
      vendorCode: codeInput.trim() || header.vendorCode.trim(),
      vendorName: nameInput.trim() || header.vendorName.trim(),
      docDueDate: header.docDueDate,
      warehouseCode: effectiveWarehouseCode,
      salesEmployee: salesEmployeeInput.trim(),
      billToAddress: billToAddress.trim(),
      shipToAddress: shipToAddress.trim(),
      referenceNo: header.referenceNo.trim(),
      comments: header.comments.trim(),
    }),
    [
      codeInput,
      header.vendorCode,
      nameInput,
      header.vendorName,
      header.docDueDate,
      effectiveWarehouseCode,
      salesEmployeeInput,
      billToAddress,
      shipToAddress,
      header.referenceNo,
      header.comments,
    ],
  )
  const missingMandatoryFields = useMemo(
    () =>
      getMissingMandatoryCreateFieldsTyped(createMandatoryValues, PURCHASE_ORDER_MANDATORY_FIELDS),
    [createMandatoryValues],
  )
  const searchMandatoryFields = useMemo(
    () => ['vendorName', 'vendorCode', 'warehouseCode', 'salesEmployee'] as const,
    [],
  )
  const missingSearchMandatoryFields = useMemo(
    () =>
      searchMandatoryFields.filter((field) => !String(createMandatoryValues[field] ?? '').trim()),
    [createMandatoryValues, searchMandatoryFields],
  )
  const searchRequiredCompletionPercent =
    ((searchMandatoryFields.length - missingSearchMandatoryFields.length) /
      searchMandatoryFields.length) *
    100
  const hasValidRowsForCreate = productRows.some(
    (row) => row.productCode.trim() && row.quantity > 0,
  )
  const createDisabledReason =
    missingMandatoryFields.length > 0
      ? `Complete required fields: ${missingMandatoryFields.map((field) => REQUIRED_FIELD_LABEL_TEXT[field]).join(', ')}.`
      : !hasValidRowsForCreate
        ? 'Add at least one product row before creating purchase order.'
        : null
  const requiredCompletionPercent =
    ((PURCHASE_ORDER_MANDATORY_FIELDS.length - missingMandatoryFields.length) /
      PURCHASE_ORDER_MANDATORY_FIELDS.length) *
    100

  const handleCreateOrder = async () => {
    const missingFields = missingMandatoryFields
    const nextErrors: ProductSearchFieldError = { ...EMPTY_PRODUCT_SEARCH_FIELD_ERRORS }
    for (const field of missingFields) {
      nextErrors[field] = MANDATORY_ERROR_TEXT[field]
    }
    const hasHeaderErrors = Object.values(nextErrors).some(Boolean)
    setProductSearchFieldErrors(nextErrors)
    if (hasHeaderErrors) {
      setCreateError('Fill required fields before creating purchase order.')
      return
    }

    const validRows = productRows.filter((row) => row.productCode.trim() && row.quantity > 0)
    if (validRows.length === 0) {
      setCreateError('Add at least one product row before creating purchase order.')
      return
    }

    setCreateError(null)

    const payload = {
      CardCode: (header.vendorCode || codeInput).trim(),
      DocDate: header.docDate,
      DocDueDate: header.docDueDate || header.docDate,
      Comments: [header.referenceNo.trim(), header.comments.trim()].filter(Boolean).join(' | '),
      DocumentLines: validRows.map((row) => ({
        ItemCode: row.productCode,
        Quantity: row.quantity,
        UnitPrice: row.price,
        DiscountPercent: row.discountPercent,
        WarehouseCode: effectiveWarehouseCode || undefined,
        TaxCode: row.taxCode || undefined,
      })),
    }

    try {
      await createPurchaseOrderMutation.mutateAsync({ payload })
      resetPOCreate()
      setNameInput('')
      setCodeInput('')
      setWarehouseInput('')
      setSalesEmployeeInput('')
      setBillToAddress('')
      setShipToAddress('')
      setNameFocused(false)
      setCodeFocused(false)
      setWarehouseFocused(false)
      setSalesEmployeeFocused(false)
      setActiveDatePicker(null)
      setModalOpen(false)
      setModalMode('vendor-name')
      setModalSearch('')
      setProductRows([])
      setProductRowDrafts({})
      setProductSearchFieldErrors(EMPTY_PRODUCT_SEARCH_FIELD_ERRORS)
      setProductSearch('')
      setDebouncedProductSearch('')
      setActiveProductRowId(null)
      setProductPopupOpen(false)
      setStockPreviewProduct(null)
      setCreateError(null)
      toast.success('Purchase Order created', 'Form reset and ready for next entry.')
    } catch (error) {
      const errorMessage = normalizeCreateOrderErrorMessage(
        error,
        'Failed to create purchase order. Try again.',
      )
      setCreateError(errorMessage)
      toast.error('Create failed', errorMessage)
    }
  }

  const totals = useMemo(() => calculateOrderTotals(productRows), [productRows])
  const summaryCurrency = useMemo(() => calculateSummaryCurrency(productRows), [productRows])
  const summaryCurrencyLabel = summaryCurrency === 'MULTI' ? 'MULTI' : summaryCurrency

  return (
    <div className="w-full bg-zinc-50 p-3 pb-20">
      <div className="mb-3 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)] backdrop-blur-sm">
        <span>Purchase</span>
        <span className="text-zinc-300">›</span>
        <Link to="/purchase/orders" className="text-blue-600 hover:text-blue-700">
          Purchase Orders Table
        </Link>
        <span className="text-zinc-300">›</span>
        <span className="text-zinc-700">Create Purchase Order</span>
      </div>
      {/* <div className="mb-2">
        <Link
          to="/purchase/orders"
          viewTransition
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-600 transition hover:text-blue-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Purchase Orders Table
        </Link>
      </div> */}
      <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <VendorCustomerSection
          loading={vendorsQuery.isLoading}
          error={
            vendorsQuery.isError
              ? vendorsQuery.error instanceof Error
                ? vendorsQuery.error.message
                : 'Unable to load vendors. Please login again.'
              : null
          }
          nameInput={nameInput}
          codeInput={codeInput}
          nameFocused={nameFocused}
          codeFocused={codeFocused}
          nameSuggestions={nameSuggestions}
          codeSuggestions={codeSuggestions}
          onNameChange={(value) => {
            setNameInput(value)
            setProductSearchFieldErrors((prev) => ({ ...prev, vendorName: undefined }))
            if (value.trim() === '') {
              setNameFocused(true)
              setHeader({ vendorName: '', vendorCode: '' })
              setBillToAddress('')
              setShipToAddress('')
              return
            }
            const matched = findVendorByName(value)
            if (matched) {
              selectVendor(matched)
              return
            }
            setHeader({ vendorName: value, vendorCode: '' })
          }}
          onCodeChange={(value) => {
            setCodeInput(value)
            setProductSearchFieldErrors((prev) => ({ ...prev, vendorCode: undefined }))
            if (value.trim() === '') {
              setCodeFocused(true)
              setHeader({ vendorCode: '', vendorName: '' })
              setBillToAddress('')
              setShipToAddress('')
              return
            }
            const matched = findVendorByCode(value)
            if (matched) {
              selectVendor(matched)
              return
            }
            setHeader({ vendorCode: value, vendorName: '' })
          }}
          onNameFocus={() => setNameFocused(true)}
          onCodeFocus={() => setCodeFocused(true)}
          onNameBlur={() => setTimeout(() => setNameFocused(false), 120)}
          onCodeBlur={() => setTimeout(() => setCodeFocused(false), 120)}
          onOpenNamePopup={() => openPopup('vendor-name')}
          onOpenCodePopup={() => openPopup('vendor-code')}
          onSelectVendor={selectVendor}
          vendorNameInvalid={Boolean(productSearchFieldErrors.vendorName)}
          vendorCodeInvalid={Boolean(productSearchFieldErrors.vendorCode)}
          vendorNameErrorText={productSearchFieldErrors.vendorName}
          vendorCodeErrorText={productSearchFieldErrors.vendorCode}
        />

        <WarehouseLogisticsSection
          warehouseInput={warehouseInput}
          salesEmployeeInput={salesEmployeeInput}
          warehouseLoading={warehousesQuery.isLoading}
          salesEmployeesLoading={salesEmployeesQuery.isLoading}
          warehouseFocused={warehouseFocused}
          salesEmployeeFocused={salesEmployeeFocused}
          warehouseSuggestions={warehouseSuggestions}
          salesEmployeeSuggestions={salesEmployeeSuggestions}
          onWarehouseChange={(value) => {
            setWarehouseInput(value)
            setProductSearchFieldErrors((prev) => ({ ...prev, warehouseCode: undefined }))
            if (value.trim() === '') {
              setWarehouseFocused(true)
              setHeader({ warehouseCode: '' })
              return
            }
            const matched = findWarehouseByName(value) ?? findWarehouseByCode(value)
            if (matched) {
              selectWarehouse(matched)
              return
            }
            setHeader({ warehouseCode: '' })
          }}
          onSalesEmployeeChange={(value) => {
            setSalesEmployeeInput(value)
            setProductSearchFieldErrors((prev) => ({ ...prev, salesEmployee: undefined }))
            setSalesEmployeeFocused(true)
          }}
          onWarehouseFocus={() => setWarehouseFocused(true)}
          onSalesEmployeeFocus={() => setSalesEmployeeFocused(true)}
          onWarehouseBlur={() => setTimeout(() => setWarehouseFocused(false), 120)}
          onSalesEmployeeBlur={() => setTimeout(() => setSalesEmployeeFocused(false), 120)}
          onOpenWarehousePopup={() => openPopup('warehouse')}
          onOpenSalesEmployeePopup={() => openPopup('sales-employee')}
          onSelectWarehouse={selectWarehouse}
          onSelectSalesEmployee={selectSalesEmployee}
          warehouseInvalid={Boolean(productSearchFieldErrors.warehouseCode)}
          salesEmployeeInvalid={Boolean(productSearchFieldErrors.salesEmployee)}
          warehouseErrorText={productSearchFieldErrors.warehouseCode}
          salesEmployeeErrorText={productSearchFieldErrors.salesEmployee}
        />

        <DocumentDetailsSection
          docDate={header.docDate}
          docDueDate={header.docDueDate}
          today={today}
          activeDatePicker={activeDatePicker}
          docDateContainerRef={docDateContainerRef}
          deliveryDateContainerRef={deliveryDateContainerRef}
          toDisplayDate={toDisplayDate}
          parseISODate={parseISODate}
          toISODate={toISODate}
          onSetActiveDatePicker={setActiveDatePicker}
          onDocDateChange={(value) => setHeader({ docDate: value })}
          onDocDueDateChange={(value) => {
            setHeader({ docDueDate: value })
            setProductSearchFieldErrors((prev) => ({ ...prev, docDueDate: undefined }))
          }}
          docDueDateInvalid={Boolean(productSearchFieldErrors.docDueDate)}
          {...(productSearchFieldErrors.docDueDate
            ? { docDueDateErrorText: productSearchFieldErrors.docDueDate }
            : {})}
        />
      </div>

      <AddressReferenceSection
        billToAddress={billToAddress}
        shipToAddress={shipToAddress}
        onBillToAddressChange={(value) => {
          setBillToAddress(value)
          setProductSearchFieldErrors((prev) => ({
            ...prev,
            billToAddress: value.trim() ? undefined : prev.billToAddress,
          }))
        }}
        onShipToAddressChange={(value) => {
          setShipToAddress(value)
          setProductSearchFieldErrors((prev) => ({
            ...prev,
            shipToAddress: value.trim() ? undefined : prev.shipToAddress,
          }))
        }}
        billToAddressInvalid={Boolean(productSearchFieldErrors.billToAddress)}
        shipToAddressInvalid={Boolean(productSearchFieldErrors.shipToAddress)}
        billToAddressErrorText={productSearchFieldErrors.billToAddress}
        shipToAddressErrorText={productSearchFieldErrors.shipToAddress}
        referenceNo={header.referenceNo}
        comments={header.comments}
        onReferenceNoChange={(value) => {
          setHeader({ referenceNo: value })
          setProductSearchFieldErrors((prev) => ({ ...prev, referenceNo: undefined }))
        }}
        onCommentsChange={(value) => {
          setHeader({ comments: value })
          setProductSearchFieldErrors((prev) => ({ ...prev, comments: undefined }))
        }}
        referenceNoInvalid={Boolean(productSearchFieldErrors.referenceNo)}
        commentsInvalid={Boolean(productSearchFieldErrors.comments)}
        referenceNoErrorText={productSearchFieldErrors.referenceNo}
        commentsErrorText={productSearchFieldErrors.comments}
      />

      <section ref={productSectionRef} className="mt-3 rounded-2xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
          <h3 className="whitespace-nowrap text-sm font-medium text-zinc-800">Product Details</h3>
          <div className="flex items-center gap-2">
            {missingSearchMandatoryFields.length > 0 ? (
              <Tooltip
                content={`Required fields: ${missingSearchMandatoryFields.map((field) => REQUIRED_FIELD_LABEL_TEXT[field]).join(', ')}`}
                className="block w-auto max-w-none"
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                  <span>Required fields</span>
                  <span
                    className="inline-block size-3 rounded-full border border-zinc-300"
                    style={{
                      background: `conic-gradient(#2563eb ${searchRequiredCompletionPercent}%, #e4e4e7 ${searchRequiredCompletionPercent}% 100%)`,
                    }}
                  />
                  <span>
                    {searchMandatoryFields.length - missingSearchMandatoryFields.length}/
                    {searchMandatoryFields.length}
                  </span>
                </span>
              </Tooltip>
            ) : null}
            <button
              type="button"
              onClick={() => openProductPopup(null)}
              onMouseEnter={prefetchProducts}
              onFocus={prefetchProducts}
              className="group inline-flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600"
            >
              <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              Search Products
            </button>
          </div>
        </div>
        <div className="overflow-x-auto px-2 py-2">
          <table className="min-w-245 w-full text-left text-sm text-zinc-700">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="whitespace-nowrap px-3 py-2">Product</th>
                <th className="whitespace-nowrap px-3 py-2">Quantity</th>
                <th className="whitespace-nowrap px-3 py-2">Price</th>
                <th className="whitespace-nowrap px-3 py-2">Discount %</th>
                <th className="whitespace-nowrap px-3 py-2">Discount Amount</th>
                <th className="whitespace-nowrap px-3 py-2">Net Price</th>
                <th className="whitespace-nowrap px-3 py-2">Total</th>
                <th className="whitespace-nowrap px-3 py-2">Comments</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {productRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-8" colSpan={9}>
                    <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center">
                      <div className="text-sm font-medium text-zinc-700">No products yet</div>
                      <div className="text-xs text-zinc-500">
                        Use <span className="font-semibold text-zinc-700">Search Products</span> to
                        add items.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
              {productRows.map((row) => {
                const maxAllowed = Math.max(1, Math.floor(row.stock) - 1)
                const isNearLimit = row.quantity >= maxAllowed
                const rowDraft = productRowDrafts[row.id]
                const quantityMessage =
                  row.stock > 0
                    ? `Available is ${row.stock}. Now you reach ${row.quantity}. Max allowed is ${maxAllowed}.`
                    : 'No stock information available for selected warehouse.'
                const grossAmount = row.price * row.quantity
                const clampedDiscountAmount = Math.max(0, Math.min(grossAmount, row.discountAmount))
                const discountPercent =
                  grossAmount > 0 ? (clampedDiscountAmount / grossAmount) * 100 : 0
                const lineNetTotal = grossAmount - clampedDiscountAmount
                const unitNetPrice = row.quantity > 0 ? lineNetTotal / row.quantity : 0
                const discountPercentInputValue =
                  rowDraft?.discountPercent ??
                  (discountPercent === 0 ? '' : String(discountPercent))
                const discountAmountInputValue =
                  rowDraft?.discountAmount ??
                  (clampedDiscountAmount === 0 ? '' : String(clampedDiscountAmount))

                return (
                  <tr key={row.id}>
                    <td className="w-64 max-w-64 px-3 py-2">
                      <div className="space-y-1">
                        <Tooltip
                          content={row.productName || 'Select Product'}
                          className="block w-full max-w-full"
                        >
                          <button
                            type="button"
                            onClick={() => openProductPopup(row.id)}
                            className="block w-full cursor-pointer truncate text-left text-sm text-zinc-800 hover:text-zinc-950"
                          >
                            {row.productName || 'Select Product'}
                          </button>
                        </Tooltip>
                        <button
                          type="button"
                          onClick={() =>
                            openStockPreview({
                              code: row.productCode,
                              name: row.productName || row.productCode,
                            })
                          }
                          onMouseEnter={() =>
                            void queryClient.prefetchQuery(
                              purchaseOrderCreateQueries.productWarehouseStocks(row.productCode),
                            )
                          }
                          onFocus={() =>
                            void queryClient.prefetchQuery(
                              purchaseOrderCreateQueries.productWarehouseStocks(row.productCode),
                            )
                          }
                          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <span className="truncate">{`Warehouse: ${effectiveWarehouseCode || '-'}`}</span>
                          <span>{`Stock: ${row.stock}`}</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Tooltip content={quantityMessage} className="block w-auto max-w-none">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={rowDraft?.quantity ?? String(row.quantity)}
                          onChange={(event) =>
                            setProductRowDraft(row.id, 'quantity', event.target.value)
                          }
                          onBlur={(event) => {
                            const rawValue = event.target.value.trim()
                            const typedQuantity =
                              rawValue === '' ? 1 : Math.max(1, Number(rawValue) || 1)
                            updateProductRow(row.id, {
                              quantity: Math.min(maxAllowed, typedQuantity),
                            })
                            clearProductRowDraft(row.id, 'quantity')
                          }}
                          className={`h-9 w-24 rounded-lg border px-2 text-sm outline-none focus:bg-white ${
                            isNearLimit
                              ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-400'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-800 focus:border-blue-400'
                          }`}
                        />
                      </Tooltip>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-zinc-700">
                      {row.price.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={discountPercentInputValue}
                        onChange={(event) => {
                          const rawValue = event.target.value
                          setProductRowDraft(row.id, 'discountPercent', rawValue)

                          const trimmedValue = rawValue.trim()
                          if (trimmedValue === '') {
                            updateProductRow(row.id, {
                              discountPercent: 0,
                              discountAmount: 0,
                            })
                            return
                          }

                          const nextPercent = Math.max(0, Number(trimmedValue) || 0)
                          const nextAmount = (grossAmount * nextPercent) / 100
                          updateProductRow(row.id, {
                            discountPercent: nextPercent,
                            discountAmount: Math.max(0, Math.min(grossAmount, nextAmount)),
                          })
                        }}
                        onBlur={(event) => {
                          const rawValue = event.target.value.trim()
                          const nextPercent =
                            rawValue === '' ? 0 : Math.max(0, Number(rawValue) || 0)
                          const nextAmount = (grossAmount * nextPercent) / 100
                          updateProductRow(row.id, {
                            discountPercent: nextPercent,
                            discountAmount: Math.max(0, Math.min(grossAmount, nextAmount)),
                          })
                          clearProductRowDraft(row.id, 'discountPercent')
                        }}
                        className="h-9 w-20 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-sm text-zinc-800 outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        max={grossAmount}
                        value={discountAmountInputValue}
                        onChange={(event) => {
                          const rawValue = event.target.value
                          setProductRowDraft(row.id, 'discountAmount', rawValue)

                          const trimmedValue = rawValue.trim()
                          if (trimmedValue === '') {
                            updateProductRow(row.id, {
                              discountAmount: 0,
                              discountPercent: 0,
                            })
                            return
                          }

                          const nextAmount = Math.max(0, Number(trimmedValue) || 0)
                          const safeAmount = Math.min(grossAmount, nextAmount)
                          const nextPercent = grossAmount > 0 ? (safeAmount / grossAmount) * 100 : 0
                          updateProductRow(row.id, {
                            discountAmount: safeAmount,
                            discountPercent: nextPercent,
                          })
                        }}
                        onBlur={(event) => {
                          const rawValue = event.target.value.trim()
                          const nextAmount =
                            rawValue === '' ? 0 : Math.max(0, Number(rawValue) || 0)
                          const safeAmount = Math.min(grossAmount, nextAmount)
                          const nextPercent = grossAmount > 0 ? (safeAmount / grossAmount) * 100 : 0
                          updateProductRow(row.id, {
                            discountAmount: safeAmount,
                            discountPercent: nextPercent,
                          })
                          clearProductRowDraft(row.id, 'discountAmount')
                        }}
                        className="h-9 w-24 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-sm text-zinc-800 outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-zinc-700">
                      {unitNetPrice.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-zinc-900">
                      {lineNetTotal.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.comment}
                        onChange={(event) =>
                          updateProductRow(row.id, { comment: event.target.value })
                        }
                        placeholder="Comment"
                        className="h-9 w-full min-w-40 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 outline-none focus:border-blue-400 focus:bg-white"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Tooltip content="Remove row" className="block w-auto max-w-none">
                        <button
                          type="button"
                          onClick={() => removeProductRow(row.id)}
                          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50"
                          aria-label="Remove product row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-zinc-100 px-4 py-3">
          <div className="ml-auto w-full max-w-sm">
            <div className="space-y-1">
              <div className="flex items-center justify-end gap-3 border-b border-zinc-200/80 py-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                  Tax Total
                </span>
                {summaryCurrencyLabel ? (
                  <span className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-400">
                    {summaryCurrencyLabel}
                  </span>
                ) : null}
                <span className="min-w-20 text-right text-base font-semibold text-zinc-800">
                  {totals.taxTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-end gap-3 border-b border-zinc-200/80 py-1">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                  Net Total
                </span>
                {summaryCurrencyLabel ? (
                  <span className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-400">
                    {summaryCurrencyLabel}
                  </span>
                ) : null}
                <span className="min-w-20 text-right text-base font-semibold text-zinc-800">
                  {totals.netTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-end gap-3 py-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">
                  Grand Total
                </span>
                {summaryCurrencyLabel ? (
                  <span className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500">
                    {summaryCurrencyLabel}
                  </span>
                ) : null}
                <span className="min-w-20 text-right text-lg font-bold text-zinc-900">
                  {totals.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          {createError ? (
            <p className="mt-2 text-right text-xs font-medium text-red-600">{createError}</p>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              size="md"
              variant="outline"
              onClick={() => navigate({ to: '/purchase/orders', viewTransition: true })}
              className="group h-11 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none"
            >
              <span className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                Back to Table
              </span>
            </Button>
            <div className="flex items-center gap-2">
              {createDisabledReason && !createPurchaseOrderMutation.isPending ? (
                missingMandatoryFields.length > 0 ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                    <span>Required fields</span>
                    <span
                      className="inline-block size-3 rounded-full border border-zinc-300"
                      style={{
                        background: `conic-gradient(#2563eb ${requiredCompletionPercent}%, #e4e4e7 ${requiredCompletionPercent}% 100%)`,
                      }}
                    />
                    <span>
                      {PURCHASE_ORDER_MANDATORY_FIELDS.length - missingMandatoryFields.length}/
                      {PURCHASE_ORDER_MANDATORY_FIELDS.length}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                    <span className="inline-block size-2 rounded-full bg-amber-500" />
                    <span>Pick 1 product</span>
                  </span>
                )
              ) : null}
              <Button
                type="button"
                size="md"
                variant="outline"
                isLoading={createPurchaseOrderMutation.isPending}
                loadingText="Creating..."
                onClick={handleCreateOrder}
                className="h-11 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none"
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      </section>
      {modalOpen ? (
        <Suspense
          fallback={<CreateModalSkeleton title="Loading vendor popup" panelClassName="max-w-xl" />}
        >
          <LookupPopupModal
            open={modalOpen}
            mode={modalMode}
            search={modalSearch}
            results={popupResults as LookupOption[]}
            loading={
              modalMode === 'warehouse'
                ? warehousesQuery.isLoading
                : modalMode === 'sales-employee'
                  ? salesEmployeesQuery.isLoading
                  : vendorsQuery.isLoading
            }
            error={
              modalMode === 'warehouse'
                ? warehousesQuery.isError
                  ? warehousesQuery.error instanceof Error
                    ? warehousesQuery.error.message
                    : 'Unable to load warehouses'
                  : null
                : modalMode === 'sales-employee'
                  ? salesEmployeesQuery.isError
                    ? salesEmployeesQuery.error instanceof Error
                      ? salesEmployeesQuery.error.message
                      : 'Unable to load sales employees'
                    : null
                  : vendorsQuery.isError
                    ? vendorsQuery.error instanceof Error
                      ? vendorsQuery.error.message
                      : 'Unable to load vendors'
                    : null
            }
            onSearchChange={setModalSearch}
            onClose={() => setModalOpen(false)}
            onSelect={(item) => {
              if (modalMode === 'warehouse') {
                selectWarehouse(item)
                return
              }
              if (modalMode === 'sales-employee') {
                selectSalesEmployee(item)
                return
              }
              selectVendor(item)
            }}
          />
        </Suspense>
      ) : null}
      {productPopupOpen ? (
        <Suspense
          fallback={
            <CreateModalSkeleton
              title="Loading product popup"
              subtitle="Warehouse"
              columns={4}
              panelClassName="max-w-4xl"
            />
          }
        >
          <ProductPopupModal
            open={productPopupOpen}
            warehouseCode={effectiveWarehouseCode}
            search={productSearch}
            results={products}
            loading={productsQuery.isLoading && products.length === 0}
            error={
              productsQuery.isError
                ? productsQuery.error instanceof Error
                  ? productsQuery.error.message
                  : 'Unable to load products'
                : null
            }
            onSearchChange={setProductSearch}
            onClose={() => setProductPopupOpen(false)}
            onSelect={applyProductToRow}
          />
        </Suspense>
      ) : null}
      {stockPreviewProduct ? (
        <Suspense
          fallback={
            <CreateModalSkeleton
              title="Loading stock popup"
              subtitle="Warehouse stock"
              columns={3}
              panelClassName="max-w-2xl"
            />
          }
        >
          <ProductWarehouseStockModal
            open={Boolean(stockPreviewProduct)}
            product={stockPreviewProduct}
            currentWarehouseCode={effectiveWarehouseCode}
            stocks={productWarehouseStocks}
            loading={
              productWarehouseStocksQuery.isLoading || productWarehouseStocksQuery.isFetching
            }
            error={
              productWarehouseStocksQuery.isError
                ? productWarehouseStocksQuery.error instanceof Error
                  ? productWarehouseStocksQuery.error.message
                  : 'Unable to load warehouse stocks'
                : null
            }
            onClose={() => setStockPreviewProduct(null)}
          />
        </Suspense>
      ) : null}
    </div>
  )
}
