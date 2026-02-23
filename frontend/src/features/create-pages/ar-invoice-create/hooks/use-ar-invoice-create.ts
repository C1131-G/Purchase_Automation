import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useCreateARInvoice } from '@/features/create-pages/ar-invoice-create/api/ar-invoice-create.mutations'
import {
  EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  MANDATORY_ERROR_TEXT,
  type ProductSearchFieldError,
  REQUIRED_FIELD_LABEL_TEXT,
} from '@/features/create-pages/ar-invoice-create/utils/ar-invoice-create.utils'
import { type ProductLookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import {
  getMissingMandatoryCreateFieldsTyped,
  SALES_ORDER_MANDATORY_FIELDS,
} from '@/features/create-pages/create-shared/config/create-mandatory-fields'
import {
  calculateOrderTotals,
  calculateSummaryCurrency,
} from '@/features/create-pages/create-shared/utils/create-order.calculations'
import {
  type ActiveDatePicker,
  type PopupMode,
} from '@/features/create-pages/create-shared/utils/create-order.types'
import { normalizeCreateOrderErrorMessage } from '@/features/create-pages/create-shared/utils/create-order.utils'
import { createOrderToast } from '@/features/create-pages/create-shared/utils/create-order-toast'
import { syncLookupSearchByMode } from '@/features/create-pages/create-shared/utils/lookup-search-sync'
import {
  arInvoiceKeys,
  arInvoiceQueries,
} from '@/features/table-pages/ar-invoices/api/ar-invoice.queries'
import {
  useARInvoiceHeader,
  useResetARInvoiceCreateAction,
  useSetARInvoiceHeaderAction,
} from '@/store/create/ar-invoice-create.store'

import { useArLookups } from './use-ar-lookups'
import { useArModals } from './use-ar-modals'
import { useArProducts } from './use-ar-products'

export function useARInvoiceCreate() {
  const header = useARInvoiceHeader()
  const resetARInvoiceCreate = useResetARInvoiceCreateAction()
  const setHeader = useSetARInvoiceHeaderAction()
  const createARInvoiceMutation = useCreateARInvoice()

  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])

  const [activeDatePicker, setActiveDatePicker] = useState<ActiveDatePicker>(null)
  const [productSearchFieldErrors, setProductSearchFieldErrors] = useState<ProductSearchFieldError>(
    EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  )
  const [createError, setCreateError] = useState<string | null>(null)

  const docDateContainerRef = useRef<HTMLDivElement>(null)
  const deliveryDateContainerRef = useRef<HTMLDivElement>(null)

  const modals = useArModals()

  const clearFieldError = (field: keyof ProductSearchFieldError) => {
    setProductSearchFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const lookups = useArLookups({
    headerWarehouseCode: header.warehouseCode ?? '',
    setHeader,
    clearFieldError,
    closeModal: () => modals.setModalOpen(false),
  })

  const productsHook = useArProducts({
    effectiveWarehouseCode: lookups.effectiveWarehouseCode,
    productPopupOpen: modals.productPopupOpen,
    setProductPopupOpen: modals.setProductPopupOpen,
    productSearch: modals.productSearch,
    setProductSearch: modals.setProductSearch,
    stockPreviewProductCode: modals.stockPreviewProduct?.code,
  })

  useEffect(() => {
    resetARInvoiceCreate()
  }, [resetARInvoiceCreate])

  const popupResults = useMemo(() => {
    const term = modals.modalSearch.trim().toLowerCase()
    const source = (
      modals.modalMode === 'vendor-name' || modals.modalMode === 'vendor-code'
        ? lookups.vendors
        : modals.modalMode === 'warehouse'
          ? lookups.warehouses
          : lookups.salesEmployees
    ) as ProductLookupItem[]
    if (!term) return source
    const score = (item: ProductLookupItem) => {
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
  }, [
    lookups.vendors,
    lookups.warehouses,
    lookups.salesEmployees,
    modals.modalSearch,
    modals.modalMode,
  ])

  const openPopupWithContext = (mode: PopupMode) => {
    modals.openPopup(mode, {
      nameInput: lookups.nameInput,
      codeInput: lookups.codeInput,
      warehouseInput: lookups.warehouseInput,
      salesEmployeeInput: lookups.salesEmployeeInput,
    })
  }

  const handleLookupModalSearchSync = (mode: PopupMode, value: string) =>
    syncLookupSearchByMode(mode, value, {
      onVendorName: lookups.handleVendorNameChange,
      onVendorCode: lookups.handleVendorCodeChange,
      onWarehouse: lookups.handleWarehouseChange,
      onSalesEmployee: lookups.handleSalesEmployeeChange,
    })

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

  const handleOpenProductPopup = (rowId: string | null = null) => {
    const existingRow = rowId ? productsHook.productRows.find((r) => r.id === rowId) : null
    const initialSearch = existingRow ? existingRow.productName : ''

    productsHook.openProductPopup(rowId, initialSearch, {
      onValidateBeforeOpen: () => {
        const nextErrors: ProductSearchFieldError = { ...EMPTY_PRODUCT_SEARCH_FIELD_ERRORS }
        if (!lookups.nameInput.trim()) nextErrors.vendorName = 'Customer Name is required.'
        if (!lookups.codeInput.trim()) nextErrors.vendorCode = 'Customer Code is required.'
        if (!lookups.effectiveWarehouseCode) nextErrors.warehouseCode = 'Warehouse is required.'
        if (!lookups.salesEmployeeInput.trim())
          nextErrors.salesEmployee = 'Sales Employee is required.'
        return nextErrors
      },
      onValidationFailed: (errors) => setProductSearchFieldErrors(errors),
    })
  }

  const createMandatoryValues = useMemo(
    () => ({
      vendorCode: lookups.codeInput.trim() || header.vendorCode.trim(),
      vendorName: lookups.nameInput.trim() || header.vendorName.trim(),
      docDueDate: header.docDueDate,
      warehouseCode: lookups.effectiveWarehouseCode,
      salesEmployee: lookups.salesEmployeeInput.trim(),
      billToAddress: lookups.billToAddress.trim(),
      shipToAddress: lookups.shipToAddress.trim(),
      referenceNo: header.referenceNo.trim(),
      comments: header.comments.trim(),
    }),
    [
      lookups.codeInput,
      header.vendorCode,
      lookups.nameInput,
      header.vendorName,
      header.docDueDate,
      lookups.effectiveWarehouseCode,
      lookups.salesEmployeeInput,
      lookups.billToAddress,
      lookups.shipToAddress,
      header.referenceNo,
      header.comments,
    ],
  )

  const missingMandatoryFields = useMemo(
    () => getMissingMandatoryCreateFieldsTyped(createMandatoryValues, SALES_ORDER_MANDATORY_FIELDS),
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

  const hasValidRowsForCreate = productsHook.productRows.some(
    (row) => row.productCode.trim() && row.quantity > 0,
  )

  const createDisabledReason =
    missingMandatoryFields.length > 0
      ? `Complete required fields: ${missingMandatoryFields.map((field) => REQUIRED_FIELD_LABEL_TEXT[field as keyof typeof REQUIRED_FIELD_LABEL_TEXT]).join(', ')}.`
      : !hasValidRowsForCreate
        ? 'Add at least one product row before creating A/R invoice.'
        : null

  const requiredCompletionPercent =
    ((SALES_ORDER_MANDATORY_FIELDS.length - missingMandatoryFields.length) /
      SALES_ORDER_MANDATORY_FIELDS.length) *
    100

  const visibleCreateError =
    createError === 'Fill required fields before creating A/R invoice.' && !createDisabledReason
      ? null
      : createError === 'Add at least one product row before creating A/R invoice.' &&
          hasValidRowsForCreate
        ? null
        : createError

  function handleCreateOrderAction() {
    void handleCreateOrder()
  }

  const queryClient = useQueryClient()

  const handleCreateOrder = async () => {
    const nextErrors: ProductSearchFieldError = { ...EMPTY_PRODUCT_SEARCH_FIELD_ERRORS }
    missingMandatoryFields.forEach((field) => {
      const mandatoryKey = field as keyof typeof MANDATORY_ERROR_TEXT
      nextErrors[field as keyof ProductSearchFieldError] = MANDATORY_ERROR_TEXT[mandatoryKey]
    })

    if (Object.values(nextErrors).some(Boolean)) {
      setProductSearchFieldErrors(nextErrors)
      setCreateError('Fill required fields before creating A/R invoice.')
      return
    }

    const validRows = productsHook.productRows.filter(
      (row) => row.productCode.trim() && row.quantity > 0,
    )
    if (validRows.length === 0) {
      setCreateError('Add at least one product row before creating A/R invoice.')
      return
    }

    setCreateError(null)

    const payload = {
      CardCode: (header.vendorCode || lookups.codeInput).trim(),
      DocDate: header.docDate,
      DocDueDate: header.docDueDate || header.docDate,
      Address: lookups.billToAddress.trim() || undefined,
      NumAtCard: header.referenceNo.trim() || undefined,
      Comments: [header.referenceNo.trim(), header.comments.trim()].filter(Boolean).join(' | '),
      DocumentLines: validRows.map((row) => ({
        ItemCode: row.productCode,
        Quantity: row.quantity,
        UnitPrice: row.price,
        DiscountPercent: row.discountPercent,
        WarehouseCode: lookups.effectiveWarehouseCode || undefined,
        TaxCode: row.taxCode || undefined,
      })),
    }

    const toastHandle = createOrderToast('A/R Invoice')
    try {
      await createARInvoiceMutation.mutateAsync({ payload })
      toastHandle.success()

      void queryClient.invalidateQueries({ queryKey: arInvoiceKeys.all })
      void Promise.allSettled([
        queryClient.prefetchQuery(arInvoiceQueries.list({ page: 1, limit: 10 })),
        queryClient.prefetchQuery(arInvoiceQueries.docNumSuggestions(undefined, 10)),
        queryClient.prefetchQuery(arInvoiceQueries.docNumSuggestions(undefined, 100)),
      ])

      resetARInvoiceCreate()
      lookups.setNameInput('')
      lookups.setCodeInput('')
      lookups.setWarehouseInput('')
      lookups.setSalesEmployeeInput('')
      lookups.setBillToAddress('')
      lookups.setShipToAddress('')
      lookups.setNameFocused(false)
      lookups.setCodeFocused(false)
      lookups.setWarehouseFocused(false)
      lookups.setSalesEmployeeFocused(false)
      setActiveDatePicker(null)
      modals.setModalOpen(false)
      modals.setModalMode('vendor-name')
      modals.setModalSearch('')
      productsHook.setProductRows([])
      productsHook.setProductRowDrafts({})
      setProductSearchFieldErrors(EMPTY_PRODUCT_SEARCH_FIELD_ERRORS)
      modals.setProductSearch('')
      productsHook.setDebouncedProductSearch('')
      productsHook.setActiveProductRowId(null)
      modals.setProductPopupOpen(false)
      modals.setStockPreviewProduct(null)
      setCreateError(null)
    } catch (error) {
      toastHandle.error()
      const errorMessage = normalizeCreateOrderErrorMessage(
        error,
        'Failed to create A/R invoice. Try again.',
      )
      setCreateError(errorMessage)
    }
  }

  const totals = useMemo(
    () => calculateOrderTotals(productsHook.productRows),
    [productsHook.productRows],
  )
  const summaryCurrency = useMemo(
    () => calculateSummaryCurrency(productsHook.productRows),
    [productsHook.productRows],
  )
  const summaryCurrencyLabel = summaryCurrency === 'MULTI' ? 'MULTI' : summaryCurrency

  return {
    ...lookups,
    ...modals,
    ...productsHook,
    openProductPopup: handleOpenProductPopup,
    openPopup: openPopupWithContext,
    applyProductToRow: (product: ProductLookupItem) =>
      productsHook.applyProductToRow(product, {
        closeProductPopup: () => modals.setProductPopupOpen(false),
      }),
    createARInvoiceMutation,
    header,
    today,
    activeDatePicker,
    setActiveDatePicker,
    handleLookupModalSearchSync,
    popupResults,
    productSearchFieldErrors,
    setProductSearchFieldErrors,
    createError: visibleCreateError,
    setCreateError,
    missingMandatoryFields,
    missingSearchMandatoryFields,
    searchMandatoryFields,
    searchRequiredCompletionPercent,
    requiredCompletionPercent,
    createDisabledReason,
    totals,
    summaryCurrencyLabel,
    docDateContainerRef,
    deliveryDateContainerRef,
    handleCreateOrder: handleCreateOrderAction,
    setHeader,
  }
}
