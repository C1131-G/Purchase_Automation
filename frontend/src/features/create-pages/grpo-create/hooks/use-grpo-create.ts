import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'

import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import {
  type LookupItem,
  type ProductLookupItem,
} from '@/features/create-pages/create-shared/api/create-shared.types'
import {
  type ActiveDatePicker,
  type ProductRowDraft,
  type StockPreviewProduct,
} from '@/features/create-pages/create-shared/utils/create-order.types'
import { createOrderToast } from '@/features/create-pages/create-shared/utils/create-order-toast'
import {
  useCreateGRPO,
  useUpdateGRPO,
} from '@/features/create-pages/grpo-create/api/grpo-create.mutations'
import { useGrpoLookups } from '@/features/create-pages/grpo-create/hooks/use-grpo-lookups'
import { useGrpoProducts } from '@/features/create-pages/grpo-create/hooks/use-grpo-products'
import {
  getTodayISO,
  GRPO_FIELD_ERROR_TEXT,
  GRPO_FIELD_LABEL_TEXT,
  GRPO_MANDATORY_FIELDS,
  type GRPOMandatoryField,
} from '@/features/create-pages/grpo-create/utils/grpo-create.utils'
import { grpoQueries } from '@/features/table-pages/grpo/api/grpo.queries'

export type GRPOCreateLine = {
  id: string
  productCode: string
  productName: string
  stock: number
  currency: string
  taxCode: string
  taxRate: number
  baseQuantity?: number
  quantity: number
  discountPercent: number
  discountAmount: number
  comment: string
  price: number
  warehouseCode: string
  baseLine?: number
  baseEntry?: number
}

type GRPOFieldErrors = Record<GRPOMandatoryField, string | undefined>

const EMPTY_GRPO_FIELD_ERRORS: GRPOFieldErrors = {
  vendorName: undefined,
  vendorCode: undefined,
  warehouseCode: undefined,
  docDueDate: undefined,
  billToAddress: undefined,
  shipToAddress: undefined,
  referenceNo: undefined,
  comments: undefined,
}

interface UseGRPOCreateOptions {
  mode?: 'create' | 'edit'
  docNum?: string
}

const normalizeCodeForCompare = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : raw.toLowerCase()
}

export function useGRPOCreate({ mode = 'create', docNum }: UseGRPOCreateOptions) {
  const isEditMode = mode === 'edit'
  const queryClient = useQueryClient()
  const createMutation = useCreateGRPO()
  const updateMutation = useUpdateGRPO()
  const hydratedDocNumRef = useRef<string | null>(null)

  const [vendorNameInput, setVendorNameInput] = useState('')
  const [vendorCodeInput, setVendorCodeInput] = useState('')
  const [vendorNameFocused, setVendorNameFocused] = useState(false)
  const [vendorCodeFocused, setVendorCodeFocused] = useState(false)
  const [buyerInput, setBuyerInput] = useState('')
  const [buyerFocused, setBuyerFocused] = useState(false)
  const [productPopupOpen, setProductPopupOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [activeProductRowId, setActiveProductRowId] = useState<string | null>(null)
  const [warehouseInput, setWarehouseInput] = useState('')
  const [warehouseFocused, setWarehouseFocused] = useState(false)
  const [docDate, setDocDate] = useState(getTodayISO)
  const [docDueDate, setDocDueDate] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [remarks, setRemarks] = useState('')
  const [billToAddress, setBillToAddress] = useState('')
  const [shipToAddress, setShipToAddress] = useState('')
  const productState = useGrpoProducts()
  const { rows, setRows } = productState
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

  const productsQuery = useQuery({
    ...createSharedQueries.products(
      effectiveWarehouseCode || undefined,
      productSearch || undefined,
    ),
    enabled: productPopupOpen && Boolean(effectiveWarehouseCode),
  })
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const productWarehouseStocksQuery = useQuery({
    ...createSharedQueries.productWarehouseStocks(stockPreviewProduct?.code),
    enabled: Boolean(stockPreviewProduct?.code),
  })

  const editDetailQuery = useQuery({
    ...grpoQueries.detailByDocNum((docNum ?? '').trim()),
    enabled: isEditMode && Boolean((docNum ?? '').trim()),
  })

  useEffect(() => {
    if (!isEditMode) return
    const currentDocNum = (docNum ?? '').trim()
    if (!currentDocNum || hydratedDocNumRef.current === currentDocNum) return
    const detail = editDetailQuery.data?.data
    if (!detail) return

    void (async () => {
      setVendorCodeInput(String(detail.CardCode ?? '').trim())
      setVendorNameInput(String(detail.CardName ?? '').trim())
      const loadedDocDate = String(detail.DocDate ?? '').slice(0, 10) || getTodayISO()
      setDocDate(loadedDocDate)
      setDocDueDate(String(detail.DocDueDate ?? '').slice(0, 10) || loadedDocDate)
      const comments = String(detail.Comments ?? '').trim()
      const splitComments = comments.split(' | ').map((part) => part.trim())
      const hasReferenceMarker = splitComments.length > 1
      setReferenceNo(hasReferenceMarker ? (splitComments[0] ?? '') : '')
      setRemarks(hasReferenceMarker ? splitComments.slice(1).join(' | ') : comments)
      const address = String(detail.Address ?? '').trim()
      setBillToAddress(address)
      setShipToAddress(address)
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
      setBuyerInput(
        buyerFromDocCode || buyerFromVendorCode || matchedVendor?.salesEmployeeName?.trim() || '',
      )
      setRows(
        (detail.DocumentLines ?? []).map((line, index) => ({
          id: `${currentDocNum}-${index}`,
          productCode: String(line.ItemCode ?? '').trim(),
          productName: String(line.ItemDescription ?? line.ItemCode ?? '').trim(),
          stock: 0,
          currency: '',
          taxCode: '',
          taxRate: 0,
          baseQuantity: Math.max(0, Number(line.Quantity ?? 0)),
          quantity: Math.max(0, Number(line.Quantity ?? 0)),
          discountPercent: 0,
          discountAmount: 0,
          comment: '',
          price: Number(line.Price ?? line.UnitPrice ?? 0),
          warehouseCode: String(line.WarehouseCode ?? '').trim(),
          baseLine: index,
        })),
      )
      setWarehouseInput(String(detail.DocumentLines?.[0]?.WarehouseCode ?? '').trim())
      hydratedDocNumRef.current = currentDocNum
    })()
  }, [docNum, editDetailQuery.data, isEditMode, salesEmployees, setRows, vendors])

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
    setDocDueDate(value)
    setFieldErrors((prev) => ({ ...prev, docDueDate: undefined }))
  }

  const handleDocDateChange = (value: string) => {
    setDocDate(value)
    if (!docDueDate) {
      setDocDueDate(value)
    }
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
    setRows([])
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
    setRows([])
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
    setRows([])
  }

  const handleWarehouseInputChange = (value: string) => {
    setWarehouseInput(value)
    setFieldErrors((prev) => ({ ...prev, warehouseCode: undefined }))
  }

  const handleBuyerChange = (value: string) => {
    setBuyerInput(value)
    setFieldErrors((prev) => ({ ...prev, salesEmployee: undefined }))
  }

  const prefetchProducts = () => {
    if (!effectiveWarehouseCode) return
    void queryClient.prefetchQuery(
      createSharedQueries.products(effectiveWarehouseCode || undefined, undefined),
    )
  }

  const openProductPopup = (rowId: string | null = null) => {
    setActiveProductRowId(rowId)
    if (
      !vendorNameInput.trim() ||
      !vendorCodeInput.trim() ||
      !effectiveWarehouseCode ||
      !buyerInput.trim()
    ) {
      const nextErrors = { ...EMPTY_GRPO_FIELD_ERRORS }
      if (!vendorNameInput.trim()) nextErrors.vendorName = GRPO_FIELD_ERROR_TEXT.vendorName
      if (!vendorCodeInput.trim()) nextErrors.vendorCode = GRPO_FIELD_ERROR_TEXT.vendorCode
      if (!effectiveWarehouseCode) nextErrors.warehouseCode = GRPO_FIELD_ERROR_TEXT.warehouseCode
      if (!buyerInput.trim()) nextErrors.salesEmployee = GRPO_FIELD_ERROR_TEXT.salesEmployee
      setFieldErrors(nextErrors)
      return
    }
    prefetchProducts()
    setProductPopupOpen(true)
  }

  const selectBuyer = (item: LookupItem) => {
    setBuyerInput(item.name)
    setBuyerFocused(false)
    setFieldErrors((prev) => ({ ...prev, salesEmployee: undefined }))
  }

  const selectWarehouse = (warehouse: LookupItem) => {
    setWarehouseInput(warehouse.name)
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        warehouseCode: warehouse.code,
      })),
    )
    setWarehouseFocused(false)
    setFieldErrors((prev) => ({ ...prev, warehouseCode: undefined }))
  }

  const applyProductToRow = (product: ProductLookupItem) => {
    setRows((prev) => {
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
                quantity: 1,
                discountPercent: 0,
                discountAmount: 0,
                comment: '',
                price: Number(product.price ?? 0),
                warehouseCode: effectiveWarehouseCode || '',
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
    setActiveProductRowId(null)
  }

  const handleReferenceNoChange = (value: string) => {
    setReferenceNo(value)
    setFieldErrors((prev) => ({ ...prev, referenceNo: undefined }))
  }

  const handleRemarksChange = (value: string) => {
    setRemarks(value)
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
      if (field === 'warehouseCode') return !warehouseInput.trim()
      if (field === 'salesEmployee') return !buyerInput.trim()
      if (field === 'docDueDate') return !docDueDate.trim()
      if (field === 'billToAddress') return !billToAddress.trim()
      if (field === 'shipToAddress') return !shipToAddress.trim()
      if (field === 'referenceNo') return !referenceNo.trim()
      if (field === 'comments') return !remarks.trim()
      return false
    })
  }, [
    vendorNameInput,
    vendorCodeInput,
    warehouseInput,
    buyerInput,
    docDueDate,
    billToAddress,
    shipToAddress,
    referenceNo,
    remarks,
  ])

  const searchMandatoryFields = useMemo(
    () => ['vendorName', 'vendorCode', 'warehouseCode', 'salesEmployee'] as const,
    [],
  )
  const missingSearchMandatoryFields = useMemo(
    () =>
      searchMandatoryFields.filter((field) => {
        if (field === 'vendorName') return !vendorNameInput.trim()
        if (field === 'vendorCode') return !vendorCodeInput.trim()
        if (field === 'warehouseCode') return !warehouseInput.trim()
        if (field === 'salesEmployee') return !buyerInput.trim()
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

  const createDisabledReason = useMemo(() => {
    if (missingMandatoryFields.length > 0) {
      return `Complete required fields: ${missingMandatoryFields.map((field) => GRPO_FIELD_LABEL_TEXT[field]).join(', ')}.`
    }
    if (!rows.some((row) => row.quantity > 0))
      return 'Set at least one product quantity greater than 0.'
    return null
  }, [missingMandatoryFields, rows])

  const updateProductRow = (id: string, patch: Partial<GRPOCreateLine>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row
        const next = { ...row, ...patch }
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
    setRows((prev) => prev.filter((row) => row.id !== id))
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

    setCreateError(null)
    const payload = {
      CardCode: vendorCodeInput.trim(),
      DocDate: docDate || undefined,
      DocDueDate: docDueDate || undefined,
      SalesPersonCode: resolvedSalesEmployeeCode,
      Comments: [referenceNo.trim(), remarks.trim()].filter(Boolean).join(' | ') || undefined,
      DocumentLines: filteredRows.map((row) => ({
        ItemCode: row.productCode,
        Quantity: row.quantity,
        UnitPrice: row.price,
        WarehouseCode: warehouseInput.trim() || row.warehouseCode || undefined,
        ...(Number.isFinite(row.baseEntry)
          ? { BaseType: 22, BaseEntry: row.baseEntry, BaseLine: row.baseLine ?? 0 }
          : {}),
      })),
    }

    const toastHandle = createOrderToast('GRPO', isEditMode ? 'update' : 'create')
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
          payload: {
            Comments: [referenceNo.trim(), remarks.trim()].filter(Boolean).join(' | ') || undefined,
            Address: billToAddress.trim() || shipToAddress.trim() || undefined,
          },
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

      setBuyerInput('')
      setRows([])
      setProductRowDrafts({})
      setWarehouseInput('')
      setReferenceNo('')
      setRemarks('')
      setDocDueDate('')
      setProductPopupOpen(false)
      setProductSearch('')
      setFieldErrors(EMPTY_GRPO_FIELD_ERRORS)
      void Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: grpoQueries.list({ page: 1, limit: 10 }).queryKey,
        }),
        queryClient.prefetchQuery(grpoQueries.docNumSuggestions(undefined, 10)),
        queryClient.prefetchQuery(grpoQueries.docNumSuggestions(undefined, 100)),
      ])
    } catch (error) {
      toastHandle.error()
      setCreateError(error instanceof Error ? error.message : 'Failed to create GRPO.')
    }
  }

  return {
    isEditMode,
    vendorsQuery,
    warehousesQuery,
    salesEmployeesQuery,
    editDetailQuery,
    createMutation,
    updateMutation,
    vendorNameInput,
    vendorCodeInput,
    buyerInput,
    vendorNameFocused,
    vendorCodeFocused,
    buyerFocused,
    productPopupOpen,
    productSearch,
    warehouseInput,
    warehouseFocused,
    referenceNo,
    remarks,
    billToAddress,
    shipToAddress,
    rows,
    productRowDrafts,
    stockPreviewProduct,
    createError,
    fieldErrors,
    createDisabledReason,
    missingMandatoryFields,
    missingSearchMandatoryFields,
    searchMandatoryFields,
    searchRequiredCompletionPercent,
    requiredCompletionPercent,
    requiredFieldsTotal,
    requiredFieldLabelText: GRPO_FIELD_LABEL_TEXT,
    vendorNameSuggestions,
    vendorCodeSuggestions,
    buyerSuggestions,
    warehouseSuggestions,
    salesEmployees,
    productsQuery,
    productWarehouseStocksQuery,
    products,
    effectiveWarehouseCode,
    setVendorNameFocused,
    setVendorCodeFocused,
    setBuyerFocused,
    setProductPopupOpen,
    setProductSearch,
    setStockPreviewProduct,
    setWarehouseFocused,
    setDocDate,
    setDocDueDate,
    setBuyerInput: handleBuyerChange,
    setWarehouseInput: handleWarehouseInputChange,
    setReferenceNo: handleReferenceNoChange,
    setRemarks: handleRemarksChange,
    setBillToAddress: handleBillToAddressChange,
    setShipToAddress: handleShipToAddressChange,
    selectVendor,
    selectBuyer,
    handleVendorNameChange,
    handleVendorCodeChange,
    selectWarehouse,
    prefetchProducts,
    openProductPopup,
    openStockPreview,
    applyProductToRow,
    updateProductRow,
    removeProductRow,
    setProductRowDraft,
    clearProductRowDraft,
    handleCreateGRPO,
    docDate,
    docDueDate,
    today,
    activeDatePicker,
    setActiveDatePicker,
    docDateContainerRef,
    deliveryDateContainerRef,
    handleDocDateChange,
    handleDocDueDateChange,
  }
}
