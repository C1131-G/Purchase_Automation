/** usePurchaseOrderCreate: State and logic for creating/updating purchase orders. */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { goeyToast } from 'goey-toast'
import { useEffect, useMemo, useRef, useState } from 'react'

import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
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
import { documentActionToast } from '@/features/create-pages/create-shared/utils/document-action-toast'
import {
  getLookupInlineSearchByMode,
  syncLookupSearchByMode,
} from '@/features/create-pages/create-shared/utils/lookup-search-sync'
import { pageLoadingToast } from '@/features/create-pages/create-shared/utils/page-loading-toast'
import {
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
} from '@/features/create-pages/purchase-order-create/api/purchase-order-create.mutations'
import {
  EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  FULL_PRODUCT_LIMIT,
  MANDATORY_ERROR_TEXT,
  type ProductSearchFieldError,
  REQUIRED_FIELD_LABEL_TEXT,
} from '@/features/create-pages/purchase-order-create/utils/po-create.utils'
import {
  purchaseOrderKeys,
  purchaseOrderQueries,
} from '@/features/table-pages/purchase-orders/api/purchase-order.queries'
import { type PurchaseOrderDetailLine } from '@/features/table-pages/purchase-orders/api/purchase-order.service'
import {
  usePOHeader,
  useResetPOCreateAction,
  useSetPOHeaderAction,
} from '@/store/create/po-create.store'

import { usePoLookups } from './use-po-lookups'
import { usePoModals } from './use-po-modals'
import { usePoProducts } from './use-po-products'

type PurchaseOrderCreateMode = 'create' | 'edit'

type UsePurchaseOrderCreateOptions = {
  mode?: PurchaseOrderCreateMode
  docNum?: string
  onCreateSuccess?: () => void
}

export function usePurchaseOrderCreate(options?: UsePurchaseOrderCreateOptions) {
  const normalizeCodeForCompare = (value: unknown) => {
    const raw = String(value ?? '').trim()
    if (!raw) return ''
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : raw.toLowerCase()
  }

  const mode = options?.mode ?? 'create'
  const isEditMode = mode === 'edit'
  const header = usePOHeader()
  const resetPOCreate = useResetPOCreateAction()
  const setHeader = useSetPOHeaderAction()
  const queryClient = useQueryClient()
  const createPurchaseOrderMutation = useCreatePurchaseOrder()
  const updatePurchaseOrderMutation = useUpdatePurchaseOrder()

  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])

  const [activeDatePicker, setActiveDatePicker] = useState<ActiveDatePicker>(null)
  const [productSearchFieldErrors, setProductSearchFieldErrors] = useState<ProductSearchFieldError>(
    EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  )
  const [createError, setCreateError] = useState<string | null>(null)
  const hydratedDocNumRef = useRef<string | null>(null)
  const [hydratedDocNum, setHydratedDocNum] = useState<string | null>(null)
  const lastRestrictedToastAtRef = useRef(0)
  const loadingToastRef = useRef<ReturnType<typeof pageLoadingToast> | null>(null)
  const editDocNum = (options?.docNum ?? '').trim()

  const docDateContainerRef = useRef<HTMLDivElement>(null)
  const deliveryDateContainerRef = useRef<HTMLDivElement>(null)

  const modals = usePoModals()

  const notifyRestricted = (fieldName: string) => {
    const now = Date.now()
    if (now - lastRestrictedToastAtRef.current < 2500) return
    lastRestrictedToastAtRef.current = now
    goeyToast.error(`${fieldName} is locked for edit`, {
      id: 'restricted-edit-toast',
    })
  }

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
    vendorLookupToken: `${lookups.codeInput.trim().toLowerCase()}::${lookups.nameInput.trim().toLowerCase()}`,
    productPopupOpen: modals.productPopupOpen,
    setProductPopupOpen: modals.setProductPopupOpen,
    productSearch: modals.productSearch,
    setProductSearch: modals.setProductSearch,
    stockPreviewProductCode: modals.stockPreviewProduct?.code,
    vendorSelected: Boolean(lookups.codeInput || lookups.nameInput),
    isEditMode,
  })

  useEffect(() => {
    if (isEditMode) return
    resetPOCreate()
    hydratedDocNumRef.current = null
  }, [isEditMode, resetPOCreate])

  const editDetailQuery = useQuery({
    ...purchaseOrderQueries.detailByDocNum(editDocNum),
    enabled: isEditMode && Boolean(editDocNum),
  })

  useEffect(() => {
    if (!isEditMode) return
    const currentDocNum = editDocNum
    if (!currentDocNum || hydratedDocNumRef.current === currentDocNum) return
    const detail = editDetailQuery.data?.data
    if (!detail) return

    const vendorCode = String(detail.CardCode ?? '').trim()
    const vendorName = String(detail.CardName ?? '').trim()
    const matchedVendor = lookups.vendors.find((vendor) => String(vendor.code) === vendorCode)
    const warehouseCode = String(detail.DocumentLines?.[0]?.WarehouseCode ?? '').trim()
    const matchedWarehouse = lookups.warehouses.find((item) => String(item.code) === warehouseCode)
    const salesEmployeeNameFromDocCode =
      detail.SalesPersonCode !== undefined && detail.SalesPersonCode !== null
        ? lookups.salesEmployees.find(
            (item) =>
              normalizeCodeForCompare(item.code) ===
              normalizeCodeForCompare(detail.SalesPersonCode),
          )?.name
        : ''
    const associatedSalesEmployeeName =
      salesEmployeeNameFromDocCode ||
      (matchedVendor?.salesEmployeeCode !== undefined
        ? lookups.salesEmployees.find(
            (item) =>
              normalizeCodeForCompare(item.code) ===
              normalizeCodeForCompare(matchedVendor.salesEmployeeCode),
          )?.name
        : '') ||
      matchedVendor?.salesEmployeeName?.trim() ||
      ''

    let referenceNo = String((detail as { NumAtCard?: string }).NumAtCard ?? '').trim()
    let comments = String(detail.Comments ?? '').trim()

    // SAP Service Layer auto-generates "Based on ..." in Comments for copy-from flows,
    // and may not store NumAtCard. If NumAtCard is empty but Comments has the
    // auto-generated reference pattern, treat Comments as the reference.
    const autoRefPattern = /^based on /i
    if (!referenceNo && autoRefPattern.test(comments)) {
      referenceNo = comments
      comments = ''
    }

    const docDate = String(detail.DocDate ?? '').slice(0, 10)
    const docDueDate = String(detail.DocDueDate ?? '').slice(0, 10)
    const billToAddress = String(detail.Address ?? '').trim()
    const shipToAddress = String((detail as Record<string, unknown>).Address2 ?? '').trim()

    // Show loading toast when starting edit hydration
    if (!loadingToastRef.current) {
      loadingToastRef.current = pageLoadingToast('Purchase Order', 'edit')
    }

    void (async () => {
      try {
        const detailLines = detail.DocumentLines ?? []
        const productsForWarehouse =
          warehouseCode.trim().length > 0
            ? await queryClient
                .fetchQuery(
                  createSharedQueries.products(warehouseCode, undefined, FULL_PRODUCT_LIMIT),
                )
                .catch(() => [])
            : []

        const productByCode = new Map(
          productsForWarehouse.map((item) => [String(item.code).trim(), item]),
        )
        const stockByItemCode = new Map<string, number>()

        const uniqueItemCodes = [
          ...new Set(detailLines.map((line) => String(line.ItemCode ?? '').trim())),
        ].filter(Boolean)

        await Promise.all(
          uniqueItemCodes.map(async (itemCode) => {
            const warehouseStocks = await queryClient
              .fetchQuery(createSharedQueries.productWarehouseStocks(itemCode))
              .catch(() => [])

            const resolvedStock = warehouseCode
              ? Number(
                  warehouseStocks.find((stock) => String(stock.code).trim() === warehouseCode)
                    ?.stock ?? 0,
                )
              : warehouseStocks.reduce((sum, stock) => sum + Number(stock.stock ?? 0), 0)

            stockByItemCode.set(itemCode, resolvedStock)
          }),
        )

        const mappedRows = detailLines.map((line: PurchaseOrderDetailLine, index) => {
          const itemCode = String(line.ItemCode ?? '').trim()
          const productMeta = productByCode.get(itemCode)
          const quantity = Number(line.Quantity ?? 1)
          const openQty = Number(line.OpenQty ?? quantity)
          const price = Number(line.Price ?? line.UnitPrice ?? productMeta?.price ?? 0)
          const discountPercent = Number(line.DiscountPercent ?? 0)
          const discountAmount = Math.max(0, (price * quantity * discountPercent) / 100)

          return {
            id: `row-${currentDocNum}-${index}`,
            productCode: itemCode,
            productName: String(line.ItemDescription ?? productMeta?.name ?? '').trim(),
            stock: Number(stockByItemCode.get(itemCode) ?? productMeta?.stock ?? 0),
            price,
            currency: String(detail.DocCurr ?? productMeta?.currency ?? ''),
            taxCode: String(line.TaxCode ?? productMeta?.taxCode ?? '').trim(),
            taxRate: Number(productMeta?.taxRate ?? 0),
            uomCode: String(line.UoMCode ?? productMeta?.uomCode ?? '').trim(),
            uomEntry:
              typeof line.UoMEntry === 'number' && Number.isFinite(line.UoMEntry)
                ? line.UoMEntry
                : productMeta?.uomEntry,
            quantity,
            openQty,
            discountPercent,
            discountAmount,
            comment: '',
            warehouseCode: String(line.WarehouseCode ?? '').trim(),
            lineNum: typeof line.LineNum === 'number' ? line.LineNum : index,
          }
        })

        setHeader({
          vendorCode,
          vendorName,
          docDate: docDate || header.docDate,
          docDueDate,
          warehouseCode,
          referenceNo,
          comments,
        })
        lookups.setNameInput(vendorName)
        lookups.setCodeInput(vendorCode)
        lookups.setWarehouseInput(matchedWarehouse?.name ?? warehouseCode)
        lookups.setSalesEmployeeInput(associatedSalesEmployeeName)
        lookups.setBillToAddress(billToAddress)
        lookups.setShipToAddress(shipToAddress)
        productsHook.setProductRows(mappedRows)
        productsHook.setProductRowDrafts({})

        hydratedDocNumRef.current = currentDocNum
        setHydratedDocNum(currentDocNum)
      } finally {
        // Dismiss loading toast when edit hydration is complete (success or error)
        loadingToastRef.current?.dismiss()
        loadingToastRef.current = null
      }
    })()
  }, [
    queryClient,
    editDetailQuery.data,
    header.docDate,
    isEditMode,
    lookups,
    editDocNum,
    productsHook,
    setHeader,
  ])

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

  useEffect(() => {
    if (!modals.modalOpen) return
    const nextSearch = getLookupInlineSearchByMode(modals.modalMode, {
      vendorName: lookups.nameInput,
      vendorCode: lookups.codeInput,
      warehouse: lookups.warehouseInput,
      salesEmployee: lookups.salesEmployeeInput,
    })
    if (nextSearch !== modals.modalSearch) {
      modals.setModalSearch(nextSearch)
    }
  }, [
    lookups.codeInput,
    lookups.nameInput,
    lookups.salesEmployeeInput,
    lookups.warehouseInput,
    modals,
  ])

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
      // Check if ANY row has a warehouseCode selected (row-level warehouse)
      warehouseCode: productsHook.productRows.some((row) => row.warehouseCode?.trim())
        ? lookups.effectiveWarehouseCode.trim() || 'selected'
        : lookups.effectiveWarehouseCode.trim(),
      docDueDate: header.docDueDate,
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
      lookups.effectiveWarehouseCode,
      header.docDueDate,
      lookups.salesEmployeeInput,
      lookups.billToAddress,
      lookups.shipToAddress,
      header.referenceNo,
      header.comments,
      productsHook.productRows,
    ],
  )

  const missingMandatoryFields = useMemo(
    () =>
      getMissingMandatoryCreateFieldsTyped(createMandatoryValues, PURCHASE_ORDER_MANDATORY_FIELDS),
    [createMandatoryValues],
  )

  const searchMandatoryFields = useMemo(() => ['vendorName', 'vendorCode'] as const, [])
  const missingSearchMandatoryFields = useMemo(
    () =>
      searchMandatoryFields.filter((field) => !String(createMandatoryValues[field] ?? '').trim()),
    [createMandatoryValues, searchMandatoryFields],
  )

  const resolvedSalesEmployeeCode = useMemo(() => {
    const byName = lookups.salesEmployees.find(
      (item) => item.name.trim().toLowerCase() === lookups.salesEmployeeInput.trim().toLowerCase(),
    )
    if (byName) return Number(normalizeCodeForCompare(byName.code))

    const byCode = lookups.salesEmployees.find(
      (item) =>
        normalizeCodeForCompare(item.code) === normalizeCodeForCompare(lookups.salesEmployeeInput),
    )
    if (byCode) return Number(normalizeCodeForCompare(byCode.code))

    return undefined
  }, [lookups.salesEmployeeInput, lookups.salesEmployees])

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
        ? `Add at least one product row before ${isEditMode ? 'updating' : 'creating'} purchase order.`
        : null

  const requiredCompletionPercent =
    ((PURCHASE_ORDER_MANDATORY_FIELDS.length - missingMandatoryFields.length) /
      PURCHASE_ORDER_MANDATORY_FIELDS.length) *
    100

  const requiredFieldsErrorText = `Fill required fields before ${isEditMode ? 'updating' : 'creating'} purchase order.`
  const rowsErrorText = `Add at least one product row before ${isEditMode ? 'updating' : 'creating'} purchase order.`

  const visibleCreateError =
    createError === requiredFieldsErrorText && !createDisabledReason
      ? null
      : createError === rowsErrorText && hasValidRowsForCreate
        ? null
        : createError

  const handleCreateOrder = async () => {
    const nextErrors: ProductSearchFieldError = { ...EMPTY_PRODUCT_SEARCH_FIELD_ERRORS }
    missingMandatoryFields.forEach((field) => {
      nextErrors[field] = MANDATORY_ERROR_TEXT[field]
    })

    if (Object.values(nextErrors).some(Boolean)) {
      setProductSearchFieldErrors(nextErrors)
      setCreateError(requiredFieldsErrorText)
      return
    }

    const validRows = productsHook.productRows.filter(
      (row) => row.productCode.trim() && row.quantity > 0,
    )
    if (validRows.length === 0) {
      setCreateError(rowsErrorText)
      return
    }

    // Validate warehouse is selected for all lines
    const linesMissingWarehouse = validRows.filter((row) => !row.warehouseCode.trim())
    if (linesMissingWarehouse.length > 0) {
      const missingItemCodes = linesMissingWarehouse.map((row) => row.productCode || '<unknown>')
      setCreateError(`Warehouse is required for: ${missingItemCodes.join(', ')}`)
      return
    }

    if (isEditMode) {
      const detail = editDetailQuery.data?.data
      if (detail) {
        const rawComments = String(detail.Comments ?? '').trim()
        const splitComments = rawComments.split(' | ').map((part) => part.trim())
        const hasReferenceMarker = splitComments.length > 1
        const existingReferenceNo = hasReferenceMarker ? (splitComments[0] ?? '') : ''
        const existingCommentText = hasReferenceMarker
          ? splitComments.slice(1).join(' | ')
          : rawComments

        const existingComparable = {
          SalesPersonCode:
            detail.SalesPersonCode !== undefined && detail.SalesPersonCode !== null
              ? Number(normalizeCodeForCompare(detail.SalesPersonCode))
              : undefined,
          DocDate: String(detail.DocDate ?? '').slice(0, 10),
          DocDueDate:
            String(detail.DocDueDate ?? '').slice(0, 10) ||
            String(detail.DocDate ?? '').slice(0, 10),
          Comments: [existingReferenceNo.trim(), existingCommentText.trim()]
            .filter(Boolean)
            .join(' | '),
          Address: String(detail.Address ?? '').trim() || undefined,
          Address2: String((detail as Record<string, unknown>).Address2 ?? '').trim() || undefined,
          DocumentLines: (detail.DocumentLines ?? [])
            .filter((line) => Number(line.Quantity ?? 0) > 0)
            .map((line) => ({
              ItemCode: String(line.ItemCode ?? '').trim(),
              Quantity: Number(line.Quantity ?? 0),
              UnitPrice: Number(line.Price ?? line.UnitPrice ?? 0),
              DiscountPercent: Number(line.DiscountPercent ?? 0),
              UoMCode: String(line.UoMCode ?? '').trim() || undefined,
              UoMEntry:
                typeof line.UoMEntry === 'number' && Number.isFinite(line.UoMEntry)
                  ? line.UoMEntry
                  : undefined,
              WarehouseCode: String(line.WarehouseCode ?? '').trim() || undefined,
              TaxCode: String(line.TaxCode ?? '').trim() || undefined,
            })),
        }

        const currentComparable = {
          SalesPersonCode: resolvedSalesEmployeeCode,
          DocDate: header.docDate,
          DocDueDate: header.docDueDate || header.docDate,
          Comments: [header.referenceNo.trim(), header.comments.trim()].filter(Boolean).join(' | '),
          Address: lookups.billToAddress.trim() || undefined,
          Address2: lookups.shipToAddress.trim() || undefined,
          DocumentLines: validRows.map((row) => ({
            ItemCode: row.productCode,
            Quantity: row.quantity,
            UnitPrice: row.price,
            DiscountPercent: row.discountPercent,
            UoMCode: row.uomCode || undefined,
            UoMEntry: row.uomEntry ?? undefined,
            WarehouseCode: row.warehouseCode || undefined,
            TaxCode: row.taxCode || undefined,
          })),
        }

        if (JSON.stringify(currentComparable) === JSON.stringify(existingComparable)) {
          const noChangeMessage = 'Change at least one field before update.'
          setCreateError(noChangeMessage)
          goeyToast.error(noChangeMessage, { id: 'no-change-update-toast' })
          return
        }
      }
    }

    setCreateError(null)

    const payload = isEditMode
      ? {
          SalesPersonCode: resolvedSalesEmployeeCode,
          DocDate: header.docDate,
          DocDueDate: header.docDueDate || header.docDate,
          Comments: [header.referenceNo.trim(), header.comments.trim()].filter(Boolean).join(' | '),
          Address: lookups.billToAddress.trim() || undefined,
          Address2: lookups.shipToAddress.trim() || undefined,
          DocumentLines: validRows.map((row) => ({
            ItemCode: row.productCode,
            Quantity: row.quantity,
            UnitPrice: row.price,
            DiscountPercent: row.discountPercent,
            UoMCode: row.uomCode || undefined,
            UoMEntry: row.uomEntry ?? undefined,
            WarehouseCode: row.warehouseCode || undefined,
            TaxCode: row.taxCode || undefined,
          })),
        }
      : {
          CardCode: (header.vendorCode || lookups.codeInput).trim(),
          SalesPersonCode: resolvedSalesEmployeeCode,
          DocDate: header.docDate,
          DocDueDate: header.docDueDate || header.docDate,
          Comments: [header.referenceNo.trim(), header.comments.trim()].filter(Boolean).join(' | '),
          Address: lookups.billToAddress.trim() || undefined,
          Address2: lookups.shipToAddress.trim() || undefined,
          DocumentLines: validRows.map((row) => ({
            ItemCode: row.productCode,
            Quantity: row.quantity,
            UnitPrice: row.price,
            DiscountPercent: row.discountPercent,
            UoMCode: row.uomCode || undefined,
            UoMEntry: row.uomEntry ?? undefined,
            WarehouseCode: row.warehouseCode || undefined,
            TaxCode: row.taxCode || undefined,
          })),
        }

    const toastHandle = documentActionToast('Purchase Order', isEditMode ? 'update' : 'create')
    try {
      if (isEditMode) {
        const detail = editDetailQuery.data?.data
        const docEntry = detail?.DocEntry ?? detail?.id
        if (docEntry === undefined || docEntry === null) {
          setCreateError('Unable to update purchase order. Document id is missing.')
          toastHandle.error()
          return
        }
        await updatePurchaseOrderMutation.mutateAsync({ id: docEntry, payload })
      } else {
        await createPurchaseOrderMutation.mutateAsync({ payload })
      }
      toastHandle.success()

      // Proactive Cache Revalidation
      void queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all })
      void Promise.allSettled([
        queryClient.prefetchQuery(purchaseOrderQueries.list({ page: 1, limit: 10 })),
        queryClient.prefetchQuery(purchaseOrderQueries.docNumSuggestions(undefined, 10)),
        queryClient.prefetchQuery(purchaseOrderQueries.docNumSuggestions(undefined, 100)),
      ])

      if (isEditMode) {
        const currentDocNum = (options?.docNum ?? '').trim()
        if (currentDocNum) {
          void queryClient.prefetchQuery(purchaseOrderQueries.detailByDocNum(currentDocNum))
        }
        return
      }

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
      hydratedDocNumRef.current = null
      setHydratedDocNum(null)

      // Notify parent to navigate away after successful create
      if (!isEditMode) {
        options?.onCreateSuccess?.()
      }
    } catch (error) {
      toastHandle.error()
      const errorMsg = normalizeCreateOrderErrorMessage(
        error,
        `Failed to ${isEditMode ? 'update' : 'create'} purchase order. Try again.`,
      )
      setCreateError(errorMsg)
    }
  }

  const submitPurchaseOrderMutation = isEditMode
    ? updatePurchaseOrderMutation
    : createPurchaseOrderMutation

  const totals = useMemo(
    () => calculateOrderTotals(productsHook.productRows),
    [productsHook.productRows],
  )
  const summaryCurrency = useMemo(
    () => calculateSummaryCurrency(productsHook.productRows),
    [productsHook.productRows],
  )
  const summaryCurrencyLabel = summaryCurrency === 'MULTI' ? 'MULTI' : summaryCurrency
  const isEditHydrated = !isEditMode || !editDocNum || hydratedDocNum === editDocNum

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
    applyProductsToRows: (products: ProductLookupItem[]) =>
      productsHook.applyProductsToRows(products, {
        closeProductPopup: () => modals.setProductPopupOpen(false),
      }),
    createPurchaseOrderMutation: submitPurchaseOrderMutation,
    updatePurchaseOrderMutation,
    editDetailQuery,
    docStatus:
      editDetailQuery.data?.data?.DocStatus === 'O'
        ? 'Open'
        : editDetailQuery.data?.data?.DocStatus === 'C'
          ? 'Closed'
          : (editDetailQuery.data?.data?.DocStatus ?? 'Open'),
    isClosed:
      editDetailQuery.data?.data?.DocStatus === 'Closed' ||
      editDetailQuery.data?.data?.DocStatus === 'C',
    isEditMode,
    isEditHydrated,
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
    showEditRestrictedToast: (fieldName = 'Field') => notifyRestricted(fieldName),
  }
}
