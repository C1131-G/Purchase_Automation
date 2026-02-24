import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import {
  createSharedKeys,
  createSharedQueries as salesOrderCreateQueries,
} from '@/features/create-pages/create-shared/api/create-shared.queries'
import { type ProductLookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import {
  type ProductRow,
  type ProductRowDraft,
} from '@/features/create-pages/create-shared/utils/create-order.types'
import {
  FULL_PRODUCT_LIMIT,
  type ProductSearchFieldError,
  QUICK_PRODUCT_LIMIT,
  rankProductsBySearchRelevance,
} from '@/features/create-pages/sales-order-create/utils/so-create.utils'

interface UseSoProductsProps {
  effectiveWarehouseCode: string | null
  productPopupOpen: boolean
  setProductPopupOpen: (open: boolean) => void
  productSearch: string
  setProductSearch: (search: string) => void
  stockPreviewProductCode: string | undefined
}

export function useSoProducts({
  effectiveWarehouseCode,
  productPopupOpen,
  setProductPopupOpen,
  productSearch,
  setProductSearch,
  stockPreviewProductCode,
}: UseSoProductsProps) {
  const queryClient = useQueryClient()
  const [productRows, setProductRows] = useState<ProductRow[]>([])
  const [productRowDrafts, setProductRowDrafts] = useState<Record<string, ProductRowDraft>>({})
  const [activeProductRowId, setActiveProductRowId] = useState<string | null>(null)
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')
  const [productQueryLimit, setProductQueryLimit] = useState(QUICK_PRODUCT_LIMIT)

  useEffect(() => {
    void queryClient.cancelQueries({ queryKey: createSharedKeys.products() })
    const timer = window.setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim())
    }, 180)
    return () => window.clearTimeout(timer)
  }, [productSearch, queryClient])

  const normalizedProductSearch = debouncedProductSearch.trim()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProductQueryLimit(QUICK_PRODUCT_LIMIT)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [normalizedProductSearch, effectiveWarehouseCode, productPopupOpen])

  // Product Discovery Query: Reactively fetches products based on search term and warehouse context.
  // Enabled only when the popup is open and a warehouse is selected to minimize redundant traffic.
  const productsQuery = useQuery({
    ...salesOrderCreateQueries.products(
      effectiveWarehouseCode || undefined,
      normalizedProductSearch || undefined,
      productQueryLimit,
    ),
    enabled: productPopupOpen && Boolean(effectiveWarehouseCode),
  })

  const products = useMemo(
    () => rankProductsBySearchRelevance(productsQuery.data ?? [], normalizedProductSearch),
    [productsQuery.data, normalizedProductSearch],
  )

  const productWarehouseStocksQuery = useQuery({
    ...salesOrderCreateQueries.productWarehouseStocks(stockPreviewProductCode),
    enabled: Boolean(stockPreviewProductCode),
  })

  const prefetchProducts = () => {
    if (!effectiveWarehouseCode) return
    void queryClient.prefetchQuery(
      salesOrderCreateQueries.products(
        effectiveWarehouseCode,
        normalizedProductSearch || undefined,
        QUICK_PRODUCT_LIMIT,
      ),
    )
  }

  const openProductPopup = (
    rowId: string | null,
    initialSearch: string,
    callbacks: {
      onValidateBeforeOpen: () => ProductSearchFieldError
      onValidationFailed: (errors: ProductSearchFieldError) => void
    },
  ) => {
    const errors = callbacks.onValidateBeforeOpen()
    const hasErrors = Object.values(errors).some(Boolean)
    if (hasErrors) {
      callbacks.onValidationFailed(errors)
      return
    }

    const nextSearch = rowId || initialSearch.trim().length > 0 ? initialSearch : productSearch
    setProductSearch(nextSearch)
    setDebouncedProductSearch(nextSearch)
    setProductQueryLimit(QUICK_PRODUCT_LIMIT)
    setActiveProductRowId(rowId)
    setProductPopupOpen(true)
    window.requestAnimationFrame(() => {
      document
        .getElementById('sales-order-product-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const loadMoreProducts = () => {
    if (!productPopupOpen) return
    if (productsQuery.isFetching) return
    const currentCount = productsQuery.data?.length ?? 0
    if (currentCount < productQueryLimit) return
    const isSearchMode = normalizedProductSearch.length > 0
    if (!isSearchMode && productQueryLimit >= FULL_PRODUCT_LIMIT) return
    setProductQueryLimit((prev) => prev + 1)
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

  const applyProductToRow = (
    product: ProductLookupItem,
    callbacks: { closeProductPopup: () => void },
  ) => {
    void queryClient.prefetchQuery(salesOrderCreateQueries.productWarehouseStocks(product.code))

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
    callbacks.closeProductPopup()
    setActiveProductRowId(null)
  }

  return {
    productRows,
    setProductRows,
    productRowDrafts,
    setProductRowDrafts,
    activeProductRowId,
    setActiveProductRowId,
    updateProductRow,
    removeProductRow,
    setProductRowDraft,
    clearProductRowDraft,
    applyProductToRow,

    productsQuery,
    products,
    productWarehouseStocksQuery,
    prefetchProducts,
    openProductPopup,
    loadMoreProducts,
    debouncedProductSearch,
    setDebouncedProductSearch,
  }
}
