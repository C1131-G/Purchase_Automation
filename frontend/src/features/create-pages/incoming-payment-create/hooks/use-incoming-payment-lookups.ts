import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { type ProductLookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { type LookupOption } from '@/features/create-pages/create-shared/utils/create-order.types'

export function useIncomingPaymentLookups() {
  const vendorsQuery = useQuery(createSharedQueries.customers())

  const [nameInput, setNameInput] = useState('')
  const [codeInput, setCodeInput] = useState('')

  const [nameFocused, setNameFocused] = useState(false)
  const [codeFocused, setCodeFocused] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'vendor-name' | 'vendor-code'>('vendor-code')

  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data])

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

  const findVendorByCode = (value: string) =>
    (vendors as ProductLookupItem[]).find(
      (vendor) => vendor.code.toLowerCase() === value.trim().toLowerCase(),
    )
  const findVendorByName = (value: string) =>
    (vendors as ProductLookupItem[]).find(
      (vendor) => vendor.name.toLowerCase() === value.trim().toLowerCase(),
    )

  const selectVendor = (vendor: LookupOption) => {
    setNameInput(vendor.name)
    setCodeInput(vendor.code)
    setNameFocused(false)
    setCodeFocused(false)
    setModalOpen(false)
  }

  const handleVendorNameChange = (value: string) => {
    setNameInput(value)
    if (value.trim() === '') {
      setNameFocused(true)
      setCodeInput('')
      return
    }
    const matched = findVendorByName(value)
    if (matched) {
      selectVendor(matched)
      return
    }
    setNameFocused(true)
    setCodeInput('')
  }

  const handleVendorCodeChange = (value: string) => {
    setCodeInput(value)
    if (value.trim() === '') {
      setCodeFocused(true)
      setNameInput('')
      return
    }
    const matched = findVendorByCode(value)
    if (matched) {
      selectVendor(matched)
      return
    }
    setCodeFocused(true)
    setNameInput('')
  }

  const nameSuggestions = useMemo(() => {
    return rankLookupOptions(vendors as ProductLookupItem[], nameInput)
  }, [vendors, nameInput])

  const codeSuggestions = useMemo(() => {
    return rankLookupOptions(vendors as ProductLookupItem[], codeInput)
  }, [vendors, codeInput])

  const openPopup = (mode: 'vendor-name' | 'vendor-code') => {
    setModalMode(mode)
    setModalOpen(true)
  }

  return {
    vendorsQuery,
    vendors,
    nameInput,
    setNameInput,
    codeInput,
    setCodeInput,
    nameFocused,
    setNameFocused,
    codeFocused,
    setCodeFocused,
    nameSuggestions,
    codeSuggestions,
    selectVendor,
    handleVendorNameChange,
    handleVendorCodeChange,
    openPopup,
    modalOpen,
    setModalOpen,
    modalMode,
  }
}
