import { useQuery, useQueryClient } from '@tanstack/react-query'
import { goeyToast } from 'goey-toast'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  createSharedKeys,
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
import { pageLoadingToast } from '@/features/create-pages/create-shared/utils/page-loading-toast'
import {
  getLookupInlineSearchByMode,
  syncLookupSearchByMode,
} from '@/features/create-pages/create-shared/utils/lookup-search-sync'
import { resolveProductTaxRates } from '@/features/create-pages/create-shared/utils/product-tax-rate'
import {
  useCreateGRPO,
  useUpdateGRPO,
} from '@/features/create-pages/grpo-create/api/grpo-create.mutations'
import { useGrpoLookups } from '@/features/create-pages/grpo-create/hooks/use-grpo-lookups'
import {
  filterAndRankLookups,
  getTodayISO,
  GRPO_FIELD_ERROR_TEXT,
  GRPO_FIELD_LABEL_TEXT,
  GRPO_MANDATORY_FIELDS,
  type GRPOMandatoryField,
} from '@/features/create-pages/grpo-create/utils/grpo-create.utils'
import { grpoQueries } from '@/features/table-pages/grpo/api/grpo.queries'
import { purchaseOrderQueries } from '@/features/table-pages/purchase-orders/api/purchase-order.queries'
import {
  type GRPOLineItemState,
  useGRPOHeader,
  useGRPOLines,
  useResetGRPOCreateAction,
  useSetGRPOHeaderAction,
  useSetGRPOLinesAction,
} from '@/store/create/grpo-create.store'

import { generateSingleSourceReference } from '../../create-shared/utils/auto-reference'

export type GRPOCreateLine = {
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
type GRPOFieldErrors = Record<GRPOMandatoryField, string | undefined>
const QUICK_PRODUCT_LIMIT = 10
const FULL_PRODUCT_LIMIT = 100

const EMPTY_GRPO_FIELD_ERRORS: GRPOFieldErrors = {
  vendorName: undefined,
  vendorCode: undefined,
  warehouseCode: undefined,
}

interface UseGRPOCreateOptions {
  mode?: 'create' | 'edit'
  docNum?: string
  sourceDocNum?: string | undefined
  sourceDocType?: 'PurchaseOrder' | undefined
}

export type UseGRPOCreateReturn = ReturnType<typeof useGRPOCreate>

const normalizeCodeForCompare = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : raw.toLowerCase()
}

export function useGRPOCreate({
  mode = 'create',
  docNum,
  sourceDocNum,
  sourceDocType,
}: UseGRPOCreateOptions) {
  const isEditMode = mode === 'edit'
  const editDocNum = (docNum ?? '').trim()
  const queryClient = useQueryClient()
  const header = useGRPOHeader()
  const setHeader = useSetGRPOHeaderAction()
  const rows = useGRPOLines()
  const setLines = useSetGRPOLinesAction()
  const resetGRPOCreate = useResetGRPOCreateAction()
  const createMutation = useCreateGRPO()
  const updateMutation = useUpdateGRPO()
  const hydratedDocNumRef = useRef<string | null>(null)
  const [hydratedDocNum, setHydratedDocNum] = useState<string | null>(null)
  const [sourceHydrationComplete, setSourceHydrationComplete] = useState(false)
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
  const [fieldErrors, setFieldErrors] = useState<GRPOFieldErrors>(EMPTY_GRPO_FIELD_ERRORS)
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
  const vendorLookupToken = `${vendorCodeInput.trim().toLowerCase()}::${vendorNameInput.trim().toLowerCase()}`

  const productsQuery = useQuery({
    ...createSharedQueries.products(
      effectiveWarehouseCode || undefined,
      debouncedProductSearch.trim() || undefined,
      productQueryLimit,
    ),
    enabled: productPopupOpen && vendorSelected,
  })

  useEffect(() => {
    if (!productPopupOpen || !vendorSelected) return
    void queryClient.invalidateQueries({ queryKey: createSharedKeys.products() })
  }, [productPopupOpen, queryClient, vendorLookupToken, vendorSelected])
  const products = useMemo(
    () => filterAndRankLookups(productsQuery.data ?? [], debouncedProductSearch),
    [productsQuery.data, debouncedProductSearch],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim())
    }, 180)
    return () => window.clearTimeout(timer)
  }, [productSearch])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProductQueryLimit(QUICK_PRODUCT_LIMIT)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [debouncedProductSearch, vendorSelected, productPopupOpen])

  const productWarehouseStocksQuery = useQuery({
    ...createSharedQueries.productWarehouseStocks(stockPreviewProduct?.code),
    enabled: Boolean(stockPreviewProduct?.code),
  })

  const editDetailQuery = useQuery({
    ...grpoQueries.detailByDocNum(editDocNum),
    enabled: isEditMode && Boolean(editDocNum),
  })

  const isClosed =
    editDetailQuery.data?.data?.DocStatus === 'Closed' ||
    editDetailQuery.data?.data?.DocStatus === 'bost_Close' ||
    editDetailQuery.data?.data?.DocStatus === 'C'
  const docStatus =
    editDetailQuery.data?.data?.DocStatus === 'O' ||
    editDetailQuery.data?.data?.DocStatus === 'bost_Open'
      ? 'Open'
      : editDetailQuery.data?.data?.DocStatus === 'C' ||
          editDetailQuery.data?.data?.DocStatus === 'bost_Close'
        ? 'Closed'
        : (editDetailQuery.data?.data?.DocStatus ?? 'Open')

  const sourceDetailQueryPO = useQuery({
    ...purchaseOrderQueries.detailByDocNum(sourceDocNum || ''),
    enabled: mode === 'create' && sourceDocType === 'PurchaseOrder' && Boolean(sourceDocNum),
  })

  useEffect(() => {
    if (isEditMode) return
    resetGRPOCreate()
    hydratedDocNumRef.current = null
  }, [isEditMode, resetGRPOCreate])

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
      loadingToastRef.current = pageLoadingToast('GRPO', 'edit')
    }

    void (async () => {
      try {
        setVendorCodeInput(String(detail.CardCode ?? '').trim())
        setVendorNameInput(String(detail.CardName ?? '').trim())
        const loadedDocDate = String(detail.DocDate ?? '').slice(0, 10) || getTodayISO()
        const numAtCard = String((detail as { NumAtCard?: string }).NumAtCard ?? '').trim()
        const comments = String(detail.Comments ?? '').trim()
        const splitComments = comments.split(' | ').map((part) => part.trim())
        const hasReferenceMarker = splitComments.length > 1
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
        const buyerFromVendorCode =
          matchedVendor?.salesEmployeeCode !== undefined && matchedVendor.salesEmployeeCode !== null
            ? salesEmployees.find(
                (item) =>
                  normalizeCodeForCompare(item.code) ===
                  normalizeCodeForCompare(matchedVendor.salesEmployeeCode),
              )?.name
            : ''
        const referenceNo = numAtCard || (hasReferenceMarker ? (splitComments[0] ?? '') : '')
        const remarks =
          hasReferenceMarker && !numAtCard ? splitComments.slice(1).join(' | ') : comments

        setBuyerInput(
          buyerFromDocCode || buyerFromVendorCode || matchedVendor?.salesEmployeeName?.trim() || '',
        )
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
        const stockByItemCode = new Map<string, Array<{ code: string; stock: number }>>()
        const uniqueItemCodes = [
          ...new Set(detailLines.map((line) => String(line.ItemCode ?? '').trim())),
        ].filter(Boolean)

        await Promise.all(
          uniqueItemCodes.map(async (itemCode) => {
            const warehouseStocks = await queryClient
              .fetchQuery(createSharedQueries.productWarehouseStocks(itemCode))
              .catch(() => [])
            stockByItemCode.set(
              itemCode,
              warehouseStocks.map((stock) => ({
                code: String(stock.code ?? '').trim(),
                stock: Number(stock.stock ?? 0),
              })),
            )
          }),
        )

        const taxRateByItemCode = await resolveProductTaxRates(
          queryClient,
          detailLines.map((line) => String(line.ItemCode ?? '').trim()),
        )

        const mappedLines = (detail.DocumentLines ?? []).map((line, index) => {
          const quantity = Math.max(0, Number(line.Quantity ?? 0))
          const price = Number(line.Price ?? line.UnitPrice ?? 0)
          const grossAmount = Math.max(0, price * quantity)
          const itemCode = String(line.ItemCode ?? '').trim()
          const lineWarehouseCode = String(line.WarehouseCode ?? '').trim()
          const warehouseStocks = stockByItemCode.get(itemCode) ?? []
          const lineStock = lineWarehouseCode
            ? Number(warehouseStocks.find((stock) => stock.code === lineWarehouseCode)?.stock ?? 0)
            : warehouseStocks.reduce((sum, stock) => sum + Number(stock.stock ?? 0), 0)
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
            id: `${currentDocNum}-${index}`,
            productCode: itemCode,
            productName: String(line.ItemDescription ?? line.ItemCode ?? '').trim(),
            stock: lineStock,
            currency: '',
            taxCode: '',
            taxRate:
              taxRateByItemCode.get(itemCode) ??
              (typeof line.VatPrcnt === 'number' ? line.VatPrcnt : Number(line.VatPrcnt) || 0),
            uomCode: String(line.UoMCode ?? '').trim(),
            uomEntry:
              typeof line.UoMEntry === 'number' && Number.isFinite(line.UoMEntry)
                ? line.UoMEntry
                : undefined,
            baseQuantity: quantity,
            quantity,
            discountPercent,
            discountAmount,
            comment: '',
            price,
            warehouseCode: lineWarehouseCode,
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
        setLines(mappedLines)
        setWarehouseInput(String(detail.DocumentLines?.[0]?.WarehouseCode ?? '').trim())
        // Set addresses from document (matching PO behavior)
        const address = String(detail.Address ?? '').trim()
        setBillToAddress(address)
        setShipToAddress(address)
        if (isMetadataLoaded) {
          hydratedDocNumRef.current = currentDocNum
        }
        setHydratedDocNum(currentDocNum)
      } finally {
        // Dismiss loading toast when edit hydration is complete (success or error)
        loadingToastRef.current?.dismiss()
        loadingToastRef.current = null
      }
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

  useEffect(() => {
    if (mode !== 'create') return
    const currentSourceDocNum = sourceDocNum
    const currentSourceDocType = sourceDocType
    if (!currentSourceDocNum || !currentSourceDocType) return

    // Reset source hydration state when source changes
    setSourceHydrationComplete(false)

    const detail = sourceDetailQueryPO.data?.data
    if (!detail) return

    const isMetadataLoaded = vendors.length > 0 && salesEmployees.length > 0
    // Only return if we have already hydrated with full metadata.
    if (
      hydratedDocNumRef.current === `${currentSourceDocType}-${currentSourceDocNum}` &&
      isMetadataLoaded
    )
      return

    // Show loading toast when starting copy-from hydration
    if (!loadingToastRef.current) {
      loadingToastRef.current = pageLoadingToast('GRPO', 'create')
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
    const buyerFromVendorCode =
      matchedVendor?.salesEmployeeCode !== undefined && matchedVendor.salesEmployeeCode !== null
        ? salesEmployees.find(
            (item) =>
              normalizeCodeForCompare(item.code) ===
              normalizeCodeForCompare(matchedVendor.salesEmployeeCode),
          )?.name
        : ''
    const buyerName =
      buyerFromDocCode || buyerFromVendorCode || matchedVendor?.salesEmployeeName?.trim() || ''

    const warehouseCode = String(detail.DocumentLines?.[0]?.WarehouseCode ?? '').trim()
    const rawComments = String(detail.Comments ?? '').trim()
    const splitComments = rawComments.split(' | ').map((part) => part.trim())
    const hasReferenceMarker = splitComments.length > 1
    const originalRemarks = hasReferenceMarker ? splitComments.slice(1).join(' | ') : rawComments
    const numAtCard = String((detail as { NumAtCard?: string }).NumAtCard ?? '').trim()
    const referenceNo = numAtCard || (hasReferenceMarker ? (splitComments[0] ?? '') : '')

    // Auto-generate reference if not present in source document
    const autoReference = generateSingleSourceReference(currentSourceDocType, currentSourceDocNum)
    const finalReferenceNo = referenceNo || autoReference
    const referenceWasAutoFilled = !referenceNo
    const remarks = originalRemarks
    const docDueDate = String(detail.DocDueDate ?? '').slice(0, 10)

    void (async () => {
      const detailLines = detail.DocumentLines ?? []
      const stockByItemCode = new Map<string, Array<{ code: string; stock: number }>>()
      const uniqueItemCodes = [
        ...new Set(detailLines.map((line) => String(line.ItemCode ?? '').trim())),
      ].filter(Boolean)

      await Promise.all(
        uniqueItemCodes.map(async (itemCode) => {
          const warehouseStocks = (await queryClient
            .fetchQuery(createSharedQueries.productWarehouseStocks(itemCode))
            .catch(() => [])) as Array<{ code: string; stock: number }>
          stockByItemCode.set(
            itemCode,
            warehouseStocks.map((stock) => ({
              code: String(stock.code ?? '').trim(),
              stock: Number(stock.stock ?? 0),
            })),
          )
        }),
      )

      const taxRateByItemCode = await resolveProductTaxRates(
        queryClient,
        detailLines.map((line) => String(line.ItemCode ?? '').trim()),
      )

      const mappedLines = detailLines.map((line, index: number) => {
        const itemCode = String(line.ItemCode ?? '').trim()
        const lineWarehouseCode = String(line.WarehouseCode ?? '').trim()
        const warehouseStocks = stockByItemCode.get(itemCode) ?? []
        const lineStock = lineWarehouseCode
          ? Number(warehouseStocks.find((s) => s.code === lineWarehouseCode)?.stock ?? 0)
          : warehouseStocks.reduce((sum, s) => sum + Number(s.stock ?? 0), 0)

        const quantity = Number(line.Quantity ?? 1)
        const price = Number(line.Price ?? line.UnitPrice ?? 0)
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
          id: `row-copy-${currentSourceDocNum}-${index}`,
          productCode: itemCode,
          productName: String(line.ItemDescription ?? line.ItemCode ?? '').trim(),
          stock: lineStock,
          currency: '',
          taxCode: '',
          taxRate:
            taxRateByItemCode.get(itemCode) ??
            (typeof line.VatPrcnt === 'number' ? line.VatPrcnt : Number(line.VatPrcnt) || 0),
          uomCode: String(line.UoMCode ?? '').trim(),
          uomEntry:
            typeof line.UoMEntry === 'number' && Number.isFinite(line.UoMEntry)
              ? line.UoMEntry
              : undefined,
          baseQuantity: quantity,
          quantity,
          discountPercent,
          discountAmount,
          comment: '',
          price,
          warehouseCode: lineWarehouseCode,
          baseEntry: detail.DocEntry ?? detail.id,
          baseLine: line.LineNum ?? index,
          baseType: 22, // Purchase Order base type
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
      if (isMetadataLoaded) {
        hydratedDocNumRef.current = `${currentSourceDocType}-${currentSourceDocNum}`
      }
      setSourceHydrationComplete(true)
      // Dismiss loading toast when copy-from hydration is complete
      loadingToastRef.current?.dismiss()
      loadingToastRef.current = null
    })()
  }, [
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
    useGrpoLookups({
      vendors,
      warehouses,
      buyers: salesEmployees,
      vendorNameInput,
      vendorCodeInput,
      warehouseInput,
      buyerInput,
    })

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
  }, [vendors, warehouses, salesEmployees, modalSearch, modalMode])

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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!modalOpen) return
    const nextSearch = getLookupInlineSearchByMode(modalMode, {
      vendorName: vendorNameInput,
      vendorCode: vendorCodeInput,
      warehouse: warehouseInput,
      salesEmployee: buyerInput,
    })
    if (nextSearch !== modalSearch) {
      setModalSearch(nextSearch)
    }
  }, [
    buyerInput,
    modalMode,
    modalOpen,
    modalSearch,
    setModalSearch,
    vendorCodeInput,
    vendorNameInput,
    warehouseInput,
  ])

  const handleLookupModalSearchSync = (mode: PopupMode, value: string) =>
    syncLookupSearchByMode(mode, value, {
      onVendorName: handleVendorNameChange,
      onVendorCode: handleVendorCodeChange,
      onWarehouse: handleWarehouseInputChange,
      onSalesEmployee: handleBuyerChange,
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

  const handleDocDueDateChange = (value: string) => {
    setHeader({ docDueDate: value })
    setFieldErrors((prev) => ({ ...prev, docDueDate: undefined }))
  }

  const handleDocDateChange = (value: string) => {
    setHeader({ docDate: value })
  }

  const filteredRows = useMemo(() => rows.filter((row) => row.quantity > 0), [rows])

  const selectVendor = (vendor: LookupItem) => {
    setVendorNameInput(vendor.name)
    setVendorCodeInput(vendor.code)
    setBillToAddress(vendor.billToAddress ?? '')
    setShipToAddress(vendor.shipToAddress ?? vendor.billToAddress ?? '')
    setVendorNameFocused(false)
    setVendorCodeFocused(false)
    const buyerByCode =
      vendor.salesEmployeeCode !== undefined && vendor.salesEmployeeCode !== null
        ? salesEmployees.find(
            (item) =>
              normalizeCodeForCompare(item.code) ===
              normalizeCodeForCompare(vendor.salesEmployeeCode),
          )?.name
        : ''
    setBuyerInput(buyerByCode || vendor.salesEmployeeName?.trim() || '')
    setWarehouseInput('')
    setLines([])
    setCreateError(null)
    setFieldErrors((prev) => ({
      ...prev,
      vendorName: undefined,
      vendorCode: undefined,
      salesEmployee: undefined,
      billToAddress: undefined,
      shipToAddress: undefined,
    }))
  }

  const handleVendorNameChange = (value: string) => {
    setVendorNameInput(value)
    setFieldErrors((prev) => ({ ...prev, vendorName: undefined }))
    const matchedByName = vendors.find(
      (item) => item.name.trim().toLowerCase() === value.trim().toLowerCase(),
    )
    if (matchedByName) {
      setVendorCodeInput(matchedByName.code)
      setBillToAddress(matchedByName.billToAddress ?? '')
      setShipToAddress(matchedByName.shipToAddress ?? matchedByName.billToAddress ?? '')
      const buyerByCode =
        matchedByName.salesEmployeeCode !== undefined && matchedByName.salesEmployeeCode !== null
          ? salesEmployees.find(
              (item) =>
                normalizeCodeForCompare(item.code) ===
                normalizeCodeForCompare(matchedByName.salesEmployeeCode),
            )?.name
          : ''
      setBuyerInput(buyerByCode || matchedByName.salesEmployeeName?.trim() || '')
      return
    }
    setVendorCodeInput('')
    setBuyerInput('')
    setWarehouseInput('')
    setLines([])
  }

  const handleVendorCodeChange = (value: string) => {
    setVendorCodeInput(value)
    setFieldErrors((prev) => ({ ...prev, vendorCode: undefined }))
    const matchedByCode = vendors.find(
      (item) => item.code.trim().toLowerCase() === value.trim().toLowerCase(),
    )
    if (matchedByCode) {
      setVendorNameInput(matchedByCode.name)
      setBillToAddress(matchedByCode.billToAddress ?? '')
      setShipToAddress(matchedByCode.shipToAddress ?? matchedByCode.billToAddress ?? '')
      const buyerByCode =
        matchedByCode.salesEmployeeCode !== undefined && matchedByCode.salesEmployeeCode !== null
          ? salesEmployees.find(
              (item) =>
                normalizeCodeForCompare(item.code) ===
                normalizeCodeForCompare(matchedByCode.salesEmployeeCode),
            )?.name
          : ''
      setBuyerInput(buyerByCode || matchedByCode.salesEmployeeName?.trim() || '')
      return
    }
    setVendorNameInput('')
    setBuyerInput('')
    setWarehouseInput('')
    setLines([])
  }

  const handleWarehouseInputChange = (value: string) => {
    setWarehouseInput(value)
    setFieldErrors((prev) => ({ ...prev, warehouseCode: undefined }))
  }

  const handleBuyerChange = (value: string) => {
    setBuyerInput(value)
    setFieldErrors((prev) => ({ ...prev, salesEmployee: undefined }))
    if (!value.trim()) {
      setBuyerFocused(true)
      return
    }
    const byName = salesEmployees.find(
      (item) => item.name.trim().toLowerCase() === value.trim().toLowerCase(),
    )
    const byCode = salesEmployees.find(
      (item) => normalizeCodeForCompare(item.code) === normalizeCodeForCompare(value),
    )
    const matched = byName ?? byCode
    if (matched) {
      selectBuyer(matched)
      return
    }
    setBuyerFocused(true)
  }

  const prefetchProducts = () => {
    if (!effectiveWarehouseCode) return
    void queryClient.prefetchQuery(
      createSharedQueries.products(
        effectiveWarehouseCode || undefined,
        productSearch.trim() || undefined,
        QUICK_PRODUCT_LIMIT,
      ),
    )
  }

  const openProductPopup = (rowId: string | null = null) => {
    setActiveProductRowId(rowId)
    if (!vendorNameInput.trim() || !vendorCodeInput.trim() || !buyerInput.trim()) {
      const nextErrors = { ...EMPTY_GRPO_FIELD_ERRORS }
      if (!vendorNameInput.trim()) nextErrors.vendorName = GRPO_FIELD_ERROR_TEXT.vendorName
      if (!vendorCodeInput.trim()) nextErrors.vendorCode = GRPO_FIELD_ERROR_TEXT.vendorCode
      setFieldErrors(nextErrors)
      return
    }
    setProductQueryLimit(QUICK_PRODUCT_LIMIT)
    setProductPopupOpen(true)
  }

  const loadMoreProducts = () => {
    if (!productPopupOpen) return
    if (productsQuery.isFetching) return
    const currentCount = productsQuery.data?.length ?? 0
    if (currentCount < productQueryLimit) return
    const isSearchMode = debouncedProductSearch.trim().length > 0
    if (!isSearchMode && productQueryLimit >= FULL_PRODUCT_LIMIT) return
    setProductQueryLimit((prev) => Math.min(prev + 10, FULL_PRODUCT_LIMIT))
  }

  const selectBuyer = (item: LookupItem) => {
    setBuyerInput(item.name)
    setBuyerFocused(false)
    setFieldErrors((prev) => ({ ...prev, salesEmployee: undefined }))
  }

  const selectWarehouse = (warehouse: LookupItem) => {
    setWarehouseInput(warehouse.name)
    setProductQueryLimit(QUICK_PRODUCT_LIMIT)
    void queryClient.prefetchQuery(
      createSharedQueries.products(warehouse.code || undefined, undefined, QUICK_PRODUCT_LIMIT),
    )
    setLines((prev) =>
      prev.map((row) => ({
        ...row,
        warehouseCode: warehouse.code,
      })),
    )
    setWarehouseFocused(false)
    setFieldErrors((prev) => ({ ...prev, warehouseCode: undefined }))
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
                baseEntry: undefined,
                baseLine: undefined,
                baseType: undefined,
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
          baseEntry: undefined,
          baseLine: undefined,
          baseType: undefined,
        },
      ]
    })
    setProductPopupOpen(false)
    setProductSearch('')
    setActiveProductRowId(null)
  }

  const applyProductsToRows = (products: ProductLookupItem[]) => {
    setLines((prev) => {
      const nextRows = products.map((product) => ({
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
        baseEntry: undefined,
        baseLine: undefined,
        baseType: undefined,
      }))
      return [...prev, ...nextRows]
    })
    setProductPopupOpen(false)
    setProductSearch('')
    setActiveProductRowId(null)
  }

  const handleReferenceNoChange = (value: string) => {
    setHeader({ referenceNo: value })
    setFieldErrors((prev) => ({ ...prev, referenceNo: undefined }))
  }

  const handleRemarksChange = (value: string) => {
    setHeader({ remarks: value })
    setFieldErrors((prev) => ({ ...prev, comments: undefined }))
  }

  const handleBillToAddressChange = (value: string) => {
    setBillToAddress(value)
    setFieldErrors((prev) => ({ ...prev, billToAddress: undefined }))
  }

  const handleShipToAddressChange = (value: string) => {
    setShipToAddress(value)
    setFieldErrors((prev) => ({ ...prev, shipToAddress: undefined }))
  }

  const missingMandatoryFields = useMemo(() => {
    const requiredFields = GRPO_MANDATORY_FIELDS

    return requiredFields.filter((field) => {
      if (field === 'vendorName') return !vendorNameInput.trim()
      if (field === 'vendorCode') return !vendorCodeInput.trim()
      if (field === 'warehouseCode') {
        // Check if ANY row has a warehouseCode selected
        return !rows.some((row) => row.warehouseCode?.trim())
      }
      return false
    })
  }, [vendorNameInput, vendorCodeInput, rows, header.docDueDate, billToAddress, shipToAddress])

  const searchMandatoryFields = useMemo(() => ['vendorName', 'vendorCode'] as const, [])
  const missingSearchMandatoryFields = useMemo(
    () =>
      searchMandatoryFields.filter((field) => {
        if (field === 'vendorName') return !vendorNameInput.trim()
        if (field === 'vendorCode') return !vendorCodeInput.trim()
        return false
      }),
    [searchMandatoryFields, vendorNameInput, vendorCodeInput, warehouseInput, buyerInput],
  )
  const searchRequiredCompletionPercent = useMemo(() => {
    const completed = searchMandatoryFields.length - missingSearchMandatoryFields.length
    return (completed / searchMandatoryFields.length) * 100
  }, [searchMandatoryFields.length, missingSearchMandatoryFields.length])

  const requiredCompletionPercent = useMemo(() => {
    const requiredFields = GRPO_MANDATORY_FIELDS
    const completed = requiredFields.length - missingMandatoryFields.length
    return (completed / requiredFields.length) * 100
  }, [missingMandatoryFields.length])

  const requiredFieldsTotal = GRPO_MANDATORY_FIELDS.length
  const isEditHydrated = !isEditMode || !editDocNum || hydratedDocNum === editDocNum
  const isSourceHydrating = mode === 'create' && Boolean(sourceDocNum) && !sourceHydrationComplete

  const createDisabledReason = useMemo(() => {
    if (missingMandatoryFields.length > 0) {
      return `Complete required fields: ${missingMandatoryFields.map((field) => GRPO_FIELD_LABEL_TEXT[field]).join(', ')}.`
    }
    if (!rows.some((row) => row.quantity > 0))
      return 'Set at least one product quantity greater than 0.'
    return null
  }, [missingMandatoryFields, rows])

  const updateProductRow = (id: string, patch: Partial<GRPOCreateLine>) => {
    setLines((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row
        const next: GRPOLineItemState = { ...row, ...patch }
        if (typeof next.baseQuantity === 'number' && Number.isFinite(next.baseQuantity)) {
          next.quantity = Math.max(0, Math.min(next.baseQuantity, Number(next.quantity) || 0))
        } else {
          next.quantity = Math.max(0, Number(next.quantity) || 0)
        }
        return next
      }),
    )
  }

  const removeProductRow = (id: string) => {
    setLines((prev) => prev.filter((row) => row.id !== id))
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

  const openStockPreview = (product: StockPreviewProduct) => {
    setStockPreviewProduct(product)
  }

  const resolvedSalesEmployeeCode = useMemo(() => {
    const byName = salesEmployees.find(
      (item) => item.name.trim().toLowerCase() === buyerInput.trim().toLowerCase(),
    )
    if (byName) return Number(normalizeCodeForCompare(byName.code))

    const byCode = salesEmployees.find(
      (item) => normalizeCodeForCompare(item.code) === normalizeCodeForCompare(buyerInput),
    )
    if (byCode) return Number(normalizeCodeForCompare(byCode.code))

    return undefined
  }, [buyerInput, salesEmployees])

  const handleCreateGRPO = async () => {
    if (missingMandatoryFields.length > 0) {
      const nextErrors = { ...EMPTY_GRPO_FIELD_ERRORS }
      missingMandatoryFields.forEach((field) => {
        nextErrors[field] = GRPO_FIELD_ERROR_TEXT[field]
      })
      setFieldErrors(nextErrors)
      setCreateError('Fill required fields before creating/updating GRPO.')
      return
    }

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

    if (isEditMode) {
      const detail = editDetailQuery.data?.data
      const existingDocDueDate = String(detail?.DocDueDate ?? '')
        .slice(0, 10)
        .trim()
      const rawComments = String(detail?.Comments ?? '').trim()
      const splitComments = rawComments.split(' | ').map((part) => part.trim())
      const hasReferenceMarker = splitComments.length > 1
      const existingRemarks = hasReferenceMarker ? splitComments.slice(1).join(' | ') : rawComments
      const currentDocDueDate = String(header.docDueDate ?? '').trim()
      const currentRemarks = String(header.remarks ?? '').trim()
      const currentReferenceNo = String(header.referenceNo ?? '').trim()
      const existingReferenceNo = String(detail?.NumAtCard ?? '').trim()

      if (
        currentDocDueDate === existingDocDueDate &&
        currentRemarks === existingRemarks.trim() &&
        currentReferenceNo === existingReferenceNo
      ) {
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
          Comments: header.remarks.trim() || undefined,
          NumAtCard: header.referenceNo.trim() || undefined,
        }
      : {
          CardCode: vendorCodeInput.trim(),
          DocDate: header.docDate || undefined,
          DocDueDate: header.docDueDate || undefined,
          SalesPersonCode: resolvedSalesEmployeeCode,
          Comments:
            [header.referenceNo.trim(), header.remarks.trim()].filter(Boolean).join(' | ') ||
            undefined,
          NumAtCard: header.referenceNo.trim() || undefined,
          DocumentLines: filteredRows.map((row) => {
            const hasCompleteBaseLink =
              Number.isFinite(row.baseEntry) &&
              Number.isFinite(row.baseLine) &&
              Number.isFinite(row.baseType)

            return {
              ItemCode: row.productCode,
              Quantity: row.quantity,
              UnitPrice: row.price,
              DiscountPercent: row.discountPercent,
              UoMCode: row.uomCode || undefined,
              UoMEntry: row.uomEntry ?? undefined,
              WarehouseCode: row.warehouseCode || undefined,
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

    const toastHandle = documentActionToast('GRPO', isEditMode ? 'update' : 'create')
    try {
      if (isEditMode) {
        const detail = editDetailQuery.data?.data
        const id = detail?.id ?? detail?.DocEntry
        if (id === undefined || id === null) {
          setCreateError('Unable to update GRPO. Document id is missing.')
          toastHandle.error()
          return
        }
        await updateMutation.mutateAsync({
          id,
          payload,
        })
      } else {
        await createMutation.mutateAsync({ payload })
      }
      toastHandle.success()

      if (isEditMode) {
        const currentDocNum = (docNum ?? '').trim()
        if (currentDocNum) {
          void queryClient.prefetchQuery(grpoQueries.detailByDocNum(currentDocNum))
        }
        return
      }

      resetGRPOCreate()
      setVendorNameInput('')
      setVendorCodeInput('')
      setBuyerInput('')
      setProductRowDrafts({})
      setWarehouseInput('')
      setBillToAddress('')
      setShipToAddress('')
      setVendorNameFocused(false)
      setVendorCodeFocused(false)
      setBuyerFocused(false)
      setWarehouseFocused(false)
      setActiveDatePicker(null)
      setProductPopupOpen(false)
      setProductSearch('')
      setDebouncedProductSearch('')
      setActiveProductRowId(null)
      setStockPreviewProduct(null)
      setFieldErrors(EMPTY_GRPO_FIELD_ERRORS)
      setCreateError(null)
      void Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: grpoQueries.list({ page: 1, limit: 10 }).queryKey,
        }),
        queryClient.prefetchQuery(grpoQueries.docNumSuggestions(undefined, 10)),
        queryClient.prefetchQuery(grpoQueries.docNumSuggestions(undefined, 100)),
      ])
    } catch (error) {
      toastHandle.error()
      const errorMsg = normalizeCreateOrderErrorMessage(
        error,
        `Failed to ${isEditMode ? 'update' : 'create'} GRPO. Try again.`,
      )
      setCreateError(errorMsg)

      // Map SAP duplicate reference errors (NumAtCard) to the UI field
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

  return {
    isEditMode,
    isEditHydrated,
    isSourceHydrating,
    today,
    activeDatePicker,
    setActiveDatePicker,
    docDateContainerRef,
    deliveryDateContainerRef,
    handleDocDateChange,
    handleDocDueDateChange,
    showEditRestrictedToast: (fieldName = 'Field') => notifyRestricted(fieldName),

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
    products,
    effectiveWarehouseCode,

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

    modalOpen,
    modalMode,
    modalSearch,
    setModalOpen,
    setModalSearch,
    openPopup: openPopupByMode,
    handleLookupModalSearchSync,
    popupResults,

    productPopupOpen,
    productSearch,
    setProductPopupOpen,
    setProductSearch,
    openProductPopup,
    loadMoreProducts,
    applyProductToRow,
    applyProductsToRows,
    prefetchProducts: () => (isEditMode ? null : prefetchProducts()),

    rows,
    productRowDrafts,
    setProductRowDraft,
    clearProductRowDraft,
    updateProductRow,
    removeProductRow,

    stockPreviewProduct,
    setStockPreviewProduct,
    openStockPreview,

    fieldErrors,
    createError,
    createDisabledReason,
    missingSearchMandatoryFields,
    searchRequiredCompletionPercent,
    searchMandatoryFields,
    missingMandatoryFields,
    requiredCompletionPercent,
    requiredFieldsTotal,
    requiredFieldLabelText: GRPO_FIELD_LABEL_TEXT,
    handleCreateOrder: handleCreateGRPO,

    setDocDate: (val: string) =>
      isEditMode ? notifyRestricted('Document Date') : setHeader({ docDate: val }),
    setDocDueDate: (val: string) => setHeader({ docDueDate: val }),
    setBuyerInput: (val: string) =>
      isEditMode ? notifyRestricted('Buyer') : handleBuyerChange(val),
    setSalesEmployeeInput: (val: string) =>
      isEditMode ? notifyRestricted('Sales Employee') : handleBuyerChange(val),
    setWarehouseInput: (val: string) =>
      isEditMode ? notifyRestricted('Warehouse') : handleWarehouseInputChange(val),
    setReferenceNo: handleReferenceNoChange,
    setRemarks: handleRemarksChange,
    setBillToAddress: (val: string) =>
      isEditMode ? notifyRestricted('Bill To Address') : handleBillToAddressChange(val),
    setShipToAddress: (val: string) =>
      isEditMode ? notifyRestricted('Ship To Address') : handleShipToAddressChange(val),
    selectVendor: (val: LookupItem) =>
      isEditMode ? notifyRestricted('Vendor') : selectVendor(val),
    selectWarehouse: (val: LookupItem) =>
      isEditMode ? notifyRestricted('Warehouse') : selectWarehouse(val),
    selectSalesEmployee: (val: LookupItem) =>
      isEditMode ? notifyRestricted('Sales Employee') : selectBuyer(val),
    selectBuyer: (val: LookupItem) => (isEditMode ? notifyRestricted('Buyer') : selectBuyer(val)),
    handleVendorNameChange: (val: string) =>
      isEditMode ? notifyRestricted('Vendor Name') : handleVendorNameChange(val),
    handleVendorCodeChange: (val: string) =>
      isEditMode ? notifyRestricted('Vendor Code') : handleVendorCodeChange(val),
  }
}
