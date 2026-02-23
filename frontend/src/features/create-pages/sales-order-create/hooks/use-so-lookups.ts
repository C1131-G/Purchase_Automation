/** useSoLookups: Orchestrates customer and logistics lookups for Sales Orders. */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { createSharedQueries as salesOrderCreateQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { type ProductLookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { type LookupOption } from '@/features/create-pages/create-shared/utils/create-order.types'
import {
  FULL_PRODUCT_LIMIT,
  type ProductSearchFieldError,
  QUICK_PRODUCT_LIMIT,
} from '@/features/create-pages/sales-order-create/utils/so-create.utils'
import { type SOHeaderState } from '@/store/create/so-create.store'

interface UseSoLookupsProps {
  headerWarehouseCode: string
  setHeader: (patch: Partial<SOHeaderState>) => void
  clearFieldError: (field: keyof ProductSearchFieldError) => void
  closeModal: () => void
}

export function useSoLookups({
  headerWarehouseCode,
  setHeader,
  clearFieldError,
  closeModal,
}: UseSoLookupsProps) {
  const INLINE_SUGGESTION_INITIAL_LIMIT = 10
  const INLINE_SUGGESTION_BACKGROUND_LIMIT = 100

  const normalizeCodeForCompare = (value: unknown) => {
    const raw = String(value ?? '').trim()
    if (!raw) return ''
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : raw.toLowerCase()
  }

  const queryClient = useQueryClient()
  // Master Data Queries: Backing lookups for customers, warehouses, and sales employees.
  // Errors here are surface-propagated to the orchestrator for UI-level display.
  const vendorsQuery = useQuery(salesOrderCreateQueries.customers())
  const warehousesQuery = useQuery(salesOrderCreateQueries.warehouses())
  const salesEmployeesQuery = useQuery(salesOrderCreateQueries.salesEmployees())

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

  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data])
  const warehouses = useMemo(() => warehousesQuery.data ?? [], [warehousesQuery.data])
  const salesEmployees = useMemo(() => salesEmployeesQuery.data ?? [], [salesEmployeesQuery.data])
  const rankLookupOptions = (items: ProductLookupItem[], rawSearch: string) => {
    const term = rawSearch.trim().toLowerCase()
    if (!term) return items

    const score = (item: ProductLookupItem) => {
      const code = item.code.toLowerCase()
      const name = item.name.toLowerCase()
      if (code === term || name === term) return 0
      if (code.startsWith(term) || name.startsWith(term)) return 1
      if (code.includes(term) || name.includes(term)) return 2
      return 3
    }

    return [...items].sort((a, b) => {
      const byScore = score(a) - score(b)
      if (byScore !== 0) return byScore
      return a.code.localeCompare(b.code, undefined, { sensitivity: 'base', numeric: true })
    })
  }

  const limitInlineSuggestions = (items: ProductLookupItem[], input: string, loading: boolean) => {
    if (input.trim()) return items
    return items.slice(
      0,
      loading ? INLINE_SUGGESTION_INITIAL_LIMIT : INLINE_SUGGESTION_BACKGROUND_LIMIT,
    )
  }

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
  const findSalesEmployeeByCode = (value: string) =>
    (salesEmployees as ProductLookupItem[]).find(
      (item) => normalizeCodeForCompare(item.code) === normalizeCodeForCompare(value),
    )
  const findSalesEmployeeByName = (value: string) =>
    (salesEmployees as ProductLookupItem[]).find(
      (item) => item.name.toLowerCase() === value.trim().toLowerCase(),
    )

  const effectiveWarehouseCode = useMemo(() => {
    const lookup = warehouseInput.trim().toLowerCase()
    const matched = (warehouses as ProductLookupItem[]).find(
      (item: ProductLookupItem) =>
        item.name.toLowerCase() === lookup || item.code.toLowerCase() === lookup,
    )
    if (matched?.code) return matched.code
    return (headerWarehouseCode ?? '').trim()
  }, [warehouseInput, warehouses, headerWarehouseCode])

  const resolveVendorSalesEmployeeName = (vendor: LookupOption) => {
    const targetCode = normalizeCodeForCompare(vendor.salesEmployeeCode)
    const nameByCode =
      targetCode === ''
        ? ''
        : ((salesEmployees as ProductLookupItem[]).find(
            (item) => normalizeCodeForCompare(item.code) === targetCode,
          )?.name ?? '')
    if (nameByCode) return nameByCode

    return vendor.salesEmployeeName?.trim() ?? ''
  }

  // Selections
  const selectVendor = (vendor: LookupOption) => {
    const nextBillToAddress = vendor.billToAddress ?? ''
    const nextShipToAddress = vendor.shipToAddress ?? ''
    const associatedSalesEmployeeName = resolveVendorSalesEmployeeName(vendor)
    setHeader({ vendorCode: vendor.code, vendorName: vendor.name })
    setNameInput(vendor.name)
    setCodeInput(vendor.code)
    setSalesEmployeeInput(associatedSalesEmployeeName)

    clearFieldError('vendorName')
    clearFieldError('vendorCode')
    if (associatedSalesEmployeeName) clearFieldError('salesEmployee')
    if (nextBillToAddress.trim()) clearFieldError('billToAddress')
    if (nextShipToAddress.trim()) clearFieldError('shipToAddress')

    setBillToAddress(nextBillToAddress)
    setShipToAddress(nextShipToAddress)
    setNameFocused(false)
    setCodeFocused(false)
    closeModal()
  }

  const selectWarehouse = (item: { code: string; name: string }) => {
    setWarehouseInput(item.name)
    setHeader({ warehouseCode: item.code })
    clearFieldError('warehouseCode')
    void queryClient
      .prefetchQuery(salesOrderCreateQueries.products(item.code, undefined, QUICK_PRODUCT_LIMIT))
      .then(() =>
        queryClient.prefetchQuery(
          salesOrderCreateQueries.products(item.code, undefined, FULL_PRODUCT_LIMIT),
        ),
      )
    setWarehouseFocused(false)
    closeModal()
  }

  const selectSalesEmployee = (item: { code: string; name: string }) => {
    setSalesEmployeeInput(item.name)
    clearFieldError('salesEmployee')
    setSalesEmployeeFocused(false)
    closeModal()
  }

  // Handlers
  const handleVendorNameChange = (value: string) => {
    setNameInput(value)
    clearFieldError('vendorName')
    if (value.trim() === '') {
      setNameFocused(true)
      setHeader({ vendorName: '', vendorCode: '' })
      setSalesEmployeeInput('')
      setBillToAddress('')
      setShipToAddress('')
      return
    }
    const matched = findVendorByName(value)
    if (matched) {
      selectVendor(matched)
      return
    }
    setSalesEmployeeInput('')
    setBillToAddress('')
    setShipToAddress('')
    setNameFocused(true)
    setHeader({ vendorName: value, vendorCode: '' })
  }

  const handleVendorCodeChange = (value: string) => {
    setCodeInput(value)
    clearFieldError('vendorCode')
    if (value.trim() === '') {
      setCodeFocused(true)
      setHeader({ vendorCode: '', vendorName: '' })
      setSalesEmployeeInput('')
      setBillToAddress('')
      setShipToAddress('')
      return
    }
    const matched = findVendorByCode(value)
    if (matched) {
      selectVendor(matched)
      return
    }
    setSalesEmployeeInput('')
    setBillToAddress('')
    setShipToAddress('')
    setCodeFocused(true)
    setHeader({ vendorCode: value, vendorName: '' })
  }

  const handleWarehouseChange = (value: string) => {
    setWarehouseInput(value)
    clearFieldError('warehouseCode')
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
  }

  const handleSalesEmployeeChange = (value: string) => {
    setSalesEmployeeInput(value)
    clearFieldError('salesEmployee')
    if (!value.trim()) {
      setSalesEmployeeFocused(true)
      return
    }
    const matched = findSalesEmployeeByName(value) ?? findSalesEmployeeByCode(value)
    if (matched) {
      selectSalesEmployee(matched)
      return
    }
    setSalesEmployeeFocused(true)
  }

  const nameSuggestions = useMemo(() => {
    const ranked = rankLookupOptions(vendors as ProductLookupItem[], nameInput)
    return limitInlineSuggestions(ranked, nameInput, vendorsQuery.isFetching)
  }, [vendors, nameInput, vendorsQuery.isFetching])

  const codeSuggestions = useMemo(() => {
    const ranked = rankLookupOptions(vendors as ProductLookupItem[], codeInput)
    return limitInlineSuggestions(ranked, codeInput, vendorsQuery.isFetching)
  }, [vendors, codeInput, vendorsQuery.isFetching])

  const warehouseSuggestions = useMemo(() => {
    const ranked = rankLookupOptions(warehouses as ProductLookupItem[], warehouseInput)
    return limitInlineSuggestions(ranked, warehouseInput, warehousesQuery.isFetching)
  }, [warehouses, warehouseInput, warehousesQuery.isFetching])

  const salesEmployeeSuggestions = useMemo(() => {
    const ranked = rankLookupOptions(salesEmployees as ProductLookupItem[], salesEmployeeInput)
    return limitInlineSuggestions(ranked, salesEmployeeInput, salesEmployeesQuery.isFetching)
  }, [salesEmployees, salesEmployeeInput, salesEmployeesQuery.isFetching])

  return {
    vendorsQuery,
    warehousesQuery,
    salesEmployeesQuery,
    vendors,
    warehouses,
    salesEmployees,
    nameInput,
    setNameInput,
    codeInput,
    setCodeInput,
    warehouseInput,
    setWarehouseInput,
    salesEmployeeInput,
    setSalesEmployeeInput,
    billToAddress,
    setBillToAddress,
    shipToAddress,
    setShipToAddress,
    nameFocused,
    setNameFocused,
    codeFocused,
    setCodeFocused,
    warehouseFocused,
    setWarehouseFocused,
    salesEmployeeFocused,
    setSalesEmployeeFocused,
    findVendorByCode,
    findVendorByName,
    findWarehouseByCode,
    findWarehouseByName,
    effectiveWarehouseCode,
    nameSuggestions,
    codeSuggestions,
    warehouseSuggestions,
    salesEmployeeSuggestions,
    selectVendor,
    selectWarehouse,
    selectSalesEmployee,
    handleVendorNameChange,
    handleVendorCodeChange,
    handleWarehouseChange,
    handleSalesEmployeeChange,
  }
}
