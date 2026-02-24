import { useQuery, useQueryClient } from '@tanstack/react-query'
import { goeyToast } from 'goey-toast'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  useCreateARInvoice,
  useUpdateARInvoice,
} from '@/features/create-pages/ar-invoice-create/api/ar-invoice-create.mutations'
import {
  EMPTY_PRODUCT_SEARCH_FIELD_ERRORS,
  FULL_PRODUCT_LIMIT,
  MANDATORY_ERROR_TEXT,
  type ProductSearchFieldError,
  REQUIRED_FIELD_LABEL_TEXT,
} from '@/features/create-pages/ar-invoice-create/utils/ar-invoice-create.utils'
import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import {
  type LookupItem,
  type ProductLookupItem,
} from '@/features/create-pages/create-shared/api/create-shared.types'
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
  type ProductRow,
} from '@/features/create-pages/create-shared/utils/create-order.types'
import { normalizeCreateOrderErrorMessage } from '@/features/create-pages/create-shared/utils/create-order.utils'
import { documentActionToast } from '@/features/create-pages/create-shared/utils/document-action-toast'
import { syncLookupSearchByMode } from '@/features/create-pages/create-shared/utils/lookup-search-sync'
import {
  arInvoiceKeys,
  arInvoiceQueries,
} from '@/features/table-pages/ar-invoices/api/ar-invoice.queries'
import { type ARInvoiceDetailLine } from '@/features/table-pages/ar-invoices/api/ar-invoice.service'
import {
  type ARInvoiceHeaderState,
  useARInvoiceHeader,
  useResetARInvoiceCreateAction,
  useSetARInvoiceHeaderAction,
} from '@/store/create/ar-invoice-create.store'

import { useArLookups } from './use-ar-lookups'
import { useArModals } from './use-ar-modals'
import { useArProducts } from './use-ar-products'

type ARInvoiceCreateMode = 'create' | 'edit'

type UseARInvoiceCreateOptions = {
  mode?: ARInvoiceCreateMode
  docNum?: string
}

export function useARInvoiceCreate(options?: UseARInvoiceCreateOptions) {
  const normalizeCodeForCompare = (value: unknown) => {
    const raw = String(value ?? '').trim()
    if (!raw) return ''
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : raw.toLowerCase()
  }

  const mode = options?.mode ?? 'create'
  const isEditMode = mode === 'edit'
  const queryClient = useQueryClient()
  const header = useARInvoiceHeader()
  const resetARInvoiceCreate = useResetARInvoiceCreateAction()
  const setHeader = useSetARInvoiceHeaderAction()
  const createARInvoiceMutation = useCreateARInvoice()
  const updateARInvoiceMutation = useUpdateARInvoice()

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
  const editDocNum = (options?.docNum ?? '').trim()

  const docDateContainerRef = useRef<HTMLDivElement>(null)
  const deliveryDateContainerRef = useRef<HTMLDivElement>(null)

  const modals = useArModals()

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
    if (isEditMode) return
    resetARInvoiceCreate()
    hydratedDocNumRef.current = null
  }, [isEditMode, resetARInvoiceCreate])

  const editDetailQuery = useQuery({
    ...arInvoiceQueries.detailByDocNum(editDocNum),
    enabled: isEditMode && Boolean(editDocNum),
  })

  useEffect(() => {
    if (!isEditMode) return
    const currentDocNum = editDocNum
    if (!currentDocNum || hydratedDocNumRef.current === currentDocNum) return
    const detail = editDetailQuery.data?.data
    if (!detail) return

    const customerCode = String(detail.CardCode ?? '').trim()
    const customerName = String(detail.CardName ?? '').trim()
    const matchedCustomer = lookups.vendors.find((item) => String(item.code) === customerCode)
    const salesEmployeeNameFromDocCode =
      detail.SalesPersonCode !== undefined && detail.SalesPersonCode !== null
        ? lookups.salesEmployees.find(
            (item: LookupItem) =>
              normalizeCodeForCompare(item.code) ===
              normalizeCodeForCompare(detail.SalesPersonCode),
          )?.name
        : ''
    const associatedSalesEmployeeName =
      salesEmployeeNameFromDocCode ||
      (matchedCustomer?.salesEmployeeCode !== undefined
        ? lookups.salesEmployees.find(
            (item: LookupItem) =>
              normalizeCodeForCompare(item.code) ===
              normalizeCodeForCompare(matchedCustomer.salesEmployeeCode),
          )?.name
        : '') ||
      matchedCustomer?.salesEmployeeName?.trim() ||
      ''
    const warehouseCode = String(detail.DocumentLines?.[0]?.WarehouseCode ?? '').trim()
    const matchedWarehouse = lookups.warehouses.find((item) => String(item.code) === warehouseCode)
    const rawComments = String(detail.Comments ?? '').trim()
    const splitComments = rawComments.split(' | ').map((part) => part.trim())
    const hasReferenceMarker = splitComments.length > 1
    const referenceNo = hasReferenceMarker
      ? (splitComments[0] ?? '')
      : String(detail.NumAtCard ?? '')
    const comments = hasReferenceMarker ? splitComments.slice(1).join(' | ') : rawComments
    const docDate = String(detail.DocDate ?? '').slice(0, 10)
    const docDueDate = String(detail.DocDueDate ?? '').slice(0, 10)
    const address = String(detail.Address ?? '').trim()

    void (async () => {
      const detailLines = detail.DocumentLines ?? []
      const productsForWarehouse = (
        warehouseCode.trim().length > 0
          ? await queryClient
              .fetchQuery(
                createSharedQueries.products(warehouseCode, undefined, FULL_PRODUCT_LIMIT),
              )
              .catch(() => [])
          : []
      ) as ProductLookupItem[]

      const productByCode = new Map<string, ProductLookupItem>(
        productsForWarehouse.map((item) => [String(item.code).trim(), item]),
      )
      const stockByItemCode = new Map<string, number>()
      const uniqueItemCodes = [
        ...new Set(detailLines.map((line) => String(line.ItemCode ?? '').trim())),
      ].filter(Boolean)

      await Promise.all(
        uniqueItemCodes.map(async (itemCode) => {
          const warehouseStocks = (await queryClient
            .fetchQuery(createSharedQueries.productWarehouseStocks(itemCode))
            .catch(() => [])) as Array<{ code: string; stock: number }>

          const resolvedStock = warehouseCode
            ? Number(
                warehouseStocks.find((stock) => String(stock.code).trim() === warehouseCode)
                  ?.stock ?? 0,
              )
            : warehouseStocks.reduce((sum, stock) => sum + Number(stock.stock ?? 0), 0)
          stockByItemCode.set(itemCode, resolvedStock)
        }),
      )

      const mappedRows = detailLines.map((line: ARInvoiceDetailLine, index) => {
        const itemCode = String(line.ItemCode ?? '').trim()
        const productMeta = productByCode.get(itemCode)
        const quantity = Number(line.Quantity ?? 1)
        const price = Number(line.Price ?? line.UnitPrice ?? productMeta?.price ?? 0)
        const grossAmount = Math.max(0, price * quantity)
        const apiDiscountPercent = Number(line.DiscountPercent ?? NaN)
        const lineTotal = Number(line.LineTotal ?? NaN)
        const derivedDiscountAmountFromLineTotal =
          Number.isFinite(lineTotal) && grossAmount > 0
            ? Math.max(0, Math.min(grossAmount, grossAmount - lineTotal))
            : 0
        const discountPercent = Number.isFinite(apiDiscountPercent)
          ? Math.max(0, apiDiscountPercent)
          : grossAmount > 0
            ? (derivedDiscountAmountFromLineTotal / grossAmount) * 100
            : 0
        const discountAmount = Math.max(0, (grossAmount * discountPercent) / 100)
        return {
          id: `row-${currentDocNum}-${index}`,
          productCode: itemCode,
          productName: String(line.ItemDescription ?? productMeta?.name ?? '').trim(),
          stock: Number(stockByItemCode.get(itemCode) ?? productMeta?.stock ?? 0),
          price,
          currency: String(detail.DocCurr ?? productMeta?.currency ?? ''),
          taxCode: String(line.TaxCode ?? productMeta?.taxCode ?? '').trim(),
          taxRate: Number(productMeta?.taxRate ?? 0),
          quantity,
          discountPercent,
          discountAmount,
          comment: '',
          baseEntry:
            typeof line.BaseEntry === 'number' && Number.isFinite(line.BaseEntry)
              ? line.BaseEntry
              : undefined,
          baseLine:
            typeof line.BaseLine === 'number' && Number.isFinite(line.BaseLine)
              ? line.BaseLine
              : undefined,
          baseType:
            typeof line.BaseType === 'number' && Number.isFinite(line.BaseType)
              ? line.BaseType
              : undefined,
        }
      })

      setHeader({
        vendorCode: customerCode,
        vendorName: customerName,
        docDate: docDate || header.docDate,
        docDueDate,
        warehouseCode,
        referenceNo,
        comments,
      })
      lookups.setNameInput(customerName)
      lookups.setCodeInput(customerCode)
      lookups.setWarehouseInput(matchedWarehouse?.name ?? warehouseCode)
      lookups.setSalesEmployeeInput(associatedSalesEmployeeName)
      lookups.setBillToAddress(address)
      lookups.setShipToAddress(address)
      productsHook.setProductRows(mappedRows)
      productsHook.setProductRowDrafts({})

      hydratedDocNumRef.current = currentDocNum
      setHydratedDocNum(currentDocNum)
    })()
  }, [
    editDetailQuery.data,
    header.docDate,
    isEditMode,
    lookups,
    editDocNum,
    productsHook,
    queryClient,
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
      ? `Complete required fields: ${missingMandatoryFields.map((field) => REQUIRED_FIELD_LABEL_TEXT[field as keyof typeof REQUIRED_FIELD_LABEL_TEXT]).join(', ')}.`
      : !hasValidRowsForCreate
        ? `Add at least one product row before ${isEditMode ? 'updating' : 'creating'} A/R invoice.`
        : null

  const requiredCompletionPercent =
    ((SALES_ORDER_MANDATORY_FIELDS.length - missingMandatoryFields.length) /
      SALES_ORDER_MANDATORY_FIELDS.length) *
    100

  const requiredFieldsErrorText = `Fill required fields before ${isEditMode ? 'updating' : 'creating'} A/R invoice.`
  const rowsErrorText = `Add at least one product row before ${isEditMode ? 'updating' : 'creating'} A/R invoice.`

  const visibleCreateError =
    createError === requiredFieldsErrorText && !createDisabledReason
      ? null
      : createError === rowsErrorText && hasValidRowsForCreate
        ? null
        : createError

  function handleCreateOrderAction() {
    void handleCreateOrder()
  }

  const handleCreateOrder = async () => {
    const nextErrors: ProductSearchFieldError = { ...EMPTY_PRODUCT_SEARCH_FIELD_ERRORS }
    missingMandatoryFields.forEach((field) => {
      const mandatoryKey = field as keyof typeof MANDATORY_ERROR_TEXT
      nextErrors[field as keyof ProductSearchFieldError] = MANDATORY_ERROR_TEXT[mandatoryKey]
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

    if (isEditMode) {
      const detail = editDetailQuery.data?.data
      const existingDocDueDate = String(detail?.DocDueDate ?? '')
        .slice(0, 10)
        .trim()
      const rawComments = String(detail?.Comments ?? '').trim()
      const splitComments = rawComments.split(' | ').map((part) => part.trim())
      const hasReferenceMarker = splitComments.length > 1
      const existingComments = hasReferenceMarker ? splitComments.slice(1).join(' | ') : rawComments
      const currentDocDueDate = String(header.docDueDate ?? '').trim()
      const currentComments = String(header.comments ?? '').trim()

      if (currentDocDueDate === existingDocDueDate && currentComments === existingComments.trim()) {
        const noChangeMessage = 'Change at least one field before update.'
        setCreateError(noChangeMessage)
        goeyToast.error(noChangeMessage, { id: 'no-change-update-toast' })
        return
      }
    }

    setCreateError(null)

    const payload = isEditMode
      ? {
          DocDueDate: header.docDueDate || undefined,
          Comments: header.comments.trim() || undefined,
        }
      : {
          CardCode: (header.vendorCode || lookups.codeInput).trim(),
          SalesPersonCode: resolvedSalesEmployeeCode,
          DocDate: header.docDate,
          DocDueDate: header.docDueDate || header.docDate,
          Address: lookups.billToAddress.trim() || lookups.shipToAddress.trim() || undefined,
          NumAtCard: header.referenceNo.trim() || undefined,
          Comments: [header.referenceNo.trim(), header.comments.trim()].filter(Boolean).join(' | '),
          DocumentLines: validRows.map((row) => {
            const hasCompleteBaseLink =
              Number.isFinite(row.baseEntry) &&
              Number.isFinite(row.baseLine) &&
              Number.isFinite(row.baseType)

            return {
              ItemCode: row.productCode,
              Quantity: row.quantity,
              UnitPrice: row.price,
              DiscountPercent: row.discountPercent,
              WarehouseCode: lookups.effectiveWarehouseCode || undefined,
              TaxCode: row.taxCode || undefined,
              ...(hasCompleteBaseLink
                ? {
                    BaseType: row.baseType,
                    BaseEntry: row.baseEntry,
                    BaseLine: row.baseLine,
                  }
                : {}),
            }
          }),
        }

    const toastHandle = documentActionToast('A/R Invoice', isEditMode ? 'update' : 'create')
    try {
      if (isEditMode) {
        const detail = editDetailQuery.data?.data
        const docEntry = detail?.DocEntry ?? detail?.id
        if (docEntry === undefined || docEntry === null) {
          setCreateError('Unable to update A/R invoice. Document id is missing.')
          toastHandle.error()
          return
        }
        await updateARInvoiceMutation.mutateAsync({ id: docEntry, payload })
      } else {
        await createARInvoiceMutation.mutateAsync({ payload })
      }
      toastHandle.success()

      void queryClient.invalidateQueries({ queryKey: arInvoiceKeys.all })
      void Promise.allSettled([
        queryClient.prefetchQuery(arInvoiceQueries.list({ page: 1, limit: 10 })),
        queryClient.prefetchQuery(arInvoiceQueries.docNumSuggestions(undefined, 10)),
        queryClient.prefetchQuery(arInvoiceQueries.docNumSuggestions(undefined, 100)),
      ])

      if (isEditMode) {
        const currentDocNum = (options?.docNum ?? '').trim()
        if (currentDocNum) {
          void queryClient.prefetchQuery(arInvoiceQueries.detailByDocNum(currentDocNum))
        }
        return
      }

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
        `Failed to ${isEditMode ? 'update' : 'create'} A/R Invoice. Try again.`,
      )
      setCreateError(errorMessage)
    }
  }

  const submitARInvoiceMutation = isEditMode ? updateARInvoiceMutation : createARInvoiceMutation

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
    setNameInput: (val: string) =>
      isEditMode ? notifyRestricted('Customer Name') : lookups.setNameInput(val),
    setCodeInput: (val: string) =>
      isEditMode ? notifyRestricted('Customer Code') : lookups.setCodeInput(val),
    setWarehouseInput: (val: string) =>
      isEditMode ? notifyRestricted('Warehouse') : lookups.setWarehouseInput(val),
    setSalesEmployeeInput: (val: string) =>
      isEditMode ? notifyRestricted('Sales Employee') : lookups.setSalesEmployeeInput(val),
    setBillToAddress: (val: string) =>
      isEditMode ? notifyRestricted('Bill To Address') : lookups.setBillToAddress(val),
    setShipToAddress: (val: string) =>
      isEditMode ? notifyRestricted('Ship To Address') : lookups.setShipToAddress(val),
    handleVendorNameChange: (val: string) =>
      isEditMode ? notifyRestricted('Customer Name') : lookups.handleVendorNameChange(val),
    handleVendorCodeChange: (val: string) =>
      isEditMode ? notifyRestricted('Customer Code') : lookups.handleVendorCodeChange(val),
    handleWarehouseChange: (val: string) =>
      isEditMode ? notifyRestricted('Warehouse') : lookups.handleWarehouseChange(val),
    handleSalesEmployeeChange: (val: string) =>
      isEditMode ? notifyRestricted('Sales Employee') : lookups.handleSalesEmployeeChange(val),
    selectVendor: (val: LookupItem) =>
      isEditMode ? notifyRestricted('Customer') : lookups.selectVendor(val),
    selectWarehouse: (val: LookupItem) =>
      isEditMode ? notifyRestricted('Warehouse') : lookups.selectWarehouse(val),
    selectSalesEmployee: (val: LookupItem) =>
      isEditMode ? notifyRestricted('Sales Employee') : lookups.selectSalesEmployee(val),
    openProductPopup: (rowId: string | null = null) =>
      isEditMode ? notifyRestricted('Products') : handleOpenProductPopup(rowId),
    openPopup: (mode: PopupMode) =>
      isEditMode ? notifyRestricted('Lookup') : openPopupWithContext(mode),
    applyProductToRow: (product: ProductLookupItem) =>
      isEditMode
        ? notifyRestricted('Products')
        : productsHook.applyProductToRow(product, {
            closeProductPopup: () => modals.setProductPopupOpen(false),
          }),
    updateProductRow: (id: string, patch: Partial<ProductRow>) =>
      isEditMode ? notifyRestricted('Products') : productsHook.updateProductRow(id, patch),
    removeProductRow: (id: string) =>
      isEditMode ? notifyRestricted('Products') : productsHook.removeProductRow(id),
    createARInvoiceMutation: submitARInvoiceMutation,
    updateARInvoiceMutation,
    editDetailQuery,
    isEditMode,
    isEditHydrated,
    header,
    today,
    activeDatePicker,
    setActiveDatePicker,
    handleLookupModalSearchSync: (mode: PopupMode, val: string) =>
      isEditMode ? notifyRestricted('Lookup Search') : handleLookupModalSearchSync(mode, val),
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
    setHeader: (patch: Partial<ARInvoiceHeaderState>) => {
      // In edit mode, only delivery date and remarks/comments can be updated.
      const allowedKeys = ['docDueDate', 'comments']
      const patchKeys = Object.keys(patch)
      const restrictedUpdate = isEditMode && patchKeys.some((k) => !allowedKeys.includes(k))

      if (restrictedUpdate) {
        notifyRestricted('Header Fields')
        return
      }
      setHeader(patch)
    },
    setDocDate: (val: string) =>
      isEditMode ? notifyRestricted('Document Date') : setHeader({ docDate: val }),
    setDocDueDate: (val: string) => setHeader({ docDueDate: val }),
    showEditRestrictedToast: (fieldName = 'Field') => notifyRestricted(fieldName),
  }
}
