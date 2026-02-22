import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'

import { type ProductLookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
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
  type PopupMode,
} from '@/features/create-pages/create-shared/utils/create-order.types'
import { normalizeCreateOrderErrorMessage } from '@/features/create-pages/create-shared/utils/create-order.utils'
import { createOrderToast } from '@/features/create-pages/create-shared/utils/create-order-toast'
import { syncLookupSearchByMode } from '@/features/create-pages/create-shared/utils/lookup-search-sync'
import { useCreatePurchaseOrder } from '@/features/create-pages/purchase-order-create/api/purchase-order-create.mutations'
import {
  EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  MANDATORY_ERROR_TEXT,
  type ProductSearchFieldError,
  REQUIRED_FIELD_LABEL_TEXT,
} from '@/features/create-pages/purchase-order-create/utils/po-create.utils'
import {
  purchaseOrderKeys,
  purchaseOrderQueries,
} from '@/features/table-pages/purchase-orders/api/purchase-order.queries'
import {
  usePOHeader,
  useResetPOCreateAction,
  useSetPOHeaderAction,
} from '@/store/create/po-create.store'

import { usePoLookups } from './use-po-lookups'
import { usePoModals } from './use-po-modals'
import { usePoProducts } from './use-po-products'

export function usePurchaseOrderCreate() {
  const header = usePOHeader()
  const resetPOCreate = useResetPOCreateAction()
  const setHeader = useSetPOHeaderAction()
  const createPurchaseOrderMutation = useCreatePurchaseOrder()

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

  const modals = usePoModals()

  const clearFieldError = (field: keyof ProductSearchFieldError) => {
    setProductSearchFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const lookups = usePoLookups({
    headerWarehouseCode: header.warehouseCode ?? '',
    setHeader,
    clearFieldError,
    closeModal: () => modals.setModalOpen(false),
  })

  const productsHook = usePoProducts({
    effectiveWarehouseCode: lookups.effectiveWarehouseCode,
    productPopupOpen: modals.productPopupOpen,
    setProductPopupOpen: modals.setProductPopupOpen,
    productSearch: modals.productSearch,
    setProductSearch: modals.setProductSearch,
    stockPreviewProductCode: modals.stockPreviewProduct?.code,
  })

  useEffect(() => {
    resetPOCreate()
  }, [resetPOCreate])

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
    return source.filter(
      (item: ProductLookupItem) =>
        (item.code || '').toLowerCase().includes(term) ||
        (item.name || '').toLowerCase().includes(term),
    )
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
        if (!lookups.nameInput.trim()) nextErrors.vendorName = 'Vendor Name is required.'
        if (!lookups.codeInput.trim()) nextErrors.vendorCode = 'Vendor Code is required.'
        if (!lookups.effectiveWarehouseCode) nextErrors.warehouseCode = 'Warehouse is required.'
        if (!lookups.salesEmployeeInput.trim()) nextErrors.salesEmployee = 'Buyer is required.'
        return nextErrors
      },
      onValidationFailed: (errors) => setProductSearchFieldErrors(errors),
    })
  }

  // Create & Validation computations
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
  const hasValidRowsForCreate = productsHook.productRows.some(
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

  const visibleCreateError =
    createError === 'Fill required fields before creating purchase order.' && !createDisabledReason
      ? null
      : createError === 'Add at least one product row before creating purchase order.' &&
          hasValidRowsForCreate
        ? null
        : createError

  const queryClient = useQueryClient()

  const handleCreateOrder = async () => {
    const nextErrors: ProductSearchFieldError = { ...EMPTY_PRODUCT_SEARCH_FIELD_ERRORS }
    missingMandatoryFields.forEach((field) => {
      nextErrors[field] = MANDATORY_ERROR_TEXT[field]
    })

    if (Object.values(nextErrors).some(Boolean)) {
      setProductSearchFieldErrors(nextErrors)
      setCreateError('Fill required fields before creating purchase order.')
      return
    }

    const validRows = productsHook.productRows.filter(
      (row) => row.productCode.trim() && row.quantity > 0,
    )
    if (validRows.length === 0) {
      setCreateError('Add at least one product row before creating purchase order.')
      return
    }

    setCreateError(null)

    const payload = {
      CardCode: (header.vendorCode || lookups.codeInput).trim(),
      DocDate: header.docDate,
      DocDueDate: header.docDueDate || header.docDate,
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

    const toastHandle = createOrderToast('Purchase Order')
    try {
      await createPurchaseOrderMutation.mutateAsync({ payload })
      toastHandle.success()

      // Proactive Cache Revalidation
      void queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all })
      void Promise.allSettled([
        queryClient.prefetchQuery(purchaseOrderQueries.list({ page: 1, limit: 10 })),
        queryClient.prefetchQuery(purchaseOrderQueries.docNumSuggestions(undefined, 10)),
        queryClient.prefetchQuery(purchaseOrderQueries.docNumSuggestions(undefined, 100)),
      ])

      resetPOCreate()
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
        'Failed to create purchase order. Try again.',
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
    createPurchaseOrderMutation,
    header,
    today,
    activeDatePicker,
    setActiveDatePicker,
    handleLookupModalSearchSync,
    popupResults,
    productSearchFieldErrors,
    setProductSearchFieldErrors,
    createError: visibleCreateError,
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
    handleCreateOrder,
    setHeader,
  }
}
