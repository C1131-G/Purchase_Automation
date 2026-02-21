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
    return (headerWarehouseCode ?? '').trim()
  }, [warehouseInput, warehouses, headerWarehouseCode])

  // Selections
  const selectVendor = (vendor: LookupOption) => {
    const nextBillToAddress = vendor.billToAddress ?? ''
    const nextShipToAddress = vendor.shipToAddress ?? ''
    setHeader({ vendorCode: vendor.code, vendorName: vendor.name })
    setNameInput(vendor.name)
    setCodeInput(vendor.code)

    clearFieldError('vendorName')
    clearFieldError('vendorCode')
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
  }

  const handleVendorCodeChange = (value: string) => {
    setCodeInput(value)
    clearFieldError('vendorCode')
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
    setSalesEmployeeFocused(true)
  }

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
