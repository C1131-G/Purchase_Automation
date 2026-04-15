import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  FULL_PRODUCT_LIMIT,
  type ProductSearchFieldError,
  QUICK_PRODUCT_LIMIT,
  rankProductsBySearchRelevance,
} from '@/features/create-pages/ar-invoice-create/utils/ar-invoice-create.utils'
import { createSharedQueries as arInvoiceCreateQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { type ProductLookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import {
  type ProductRow,
  type ProductRowDraft,
} from '@/features/create-pages/create-shared/utils/create-order.types'

interface UseArProductsProps {
  effectiveWarehouseCode: string | null
  customerLookupToken: string
  productPopupOpen: boolean
  setProductPopupOpen: (open: boolean) => void
  productSearch: string
  setProductSearch: (search: string) => void
  stockPreviewProductCode: string | undefined
  customerSelected: boolean
}

export function useArProducts({
  effectiveWarehouseCode,
  customerLookupToken,
  productPopupOpen,
  setProductPopupOpen,
  productSearch,
  setProductSearch,
  stockPreviewProductCode,
  customerSelected,
}: UseArProductsProps) {
  const queryClient = useQueryClient()
  const [productRows, setProductRows] = useState<ProductRow[]>([])
  const [productRowDrafts, setProductRowDrafts] = useState<Record<string, ProductRowDraft>>({})
  const [activeProductRowId, setActiveProductRowId] = useState<string | null>(null)
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')
  const [productQueryLimit, setProductQueryLimit] = useState(QUICK_PRODUCT_LIMIT)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim())
    }, 180)
    return () => window.clearTimeout(timer)
  }, [productSearch])

  const normalizedProductSearch = debouncedProductSearch.trim()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProductQueryLimit(QUICK_PRODUCT_LIMIT)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [normalizedProductSearch, customerSelected, productPopupOpen])

  const productsQuery = useQuery({
    ...arInvoiceCreateQueries.products(
      effectiveWarehouseCode || undefined,
      normalizedProductSearch || undefined,
      productQueryLimit,
      'sales',
    ),
    enabled: customerSelected,
  })

  const prefetchProducts = useCallback(() => {
    if (!customerSelected) return
    void queryClient.prefetchQuery(
      arInvoiceCreateQueries.products(
        effectiveWarehouseCode || undefined,
        normalizedProductSearch || undefined,
        QUICK_PRODUCT_LIMIT,
        'sales',
      ),
    )
  }, [customerSelected, effectiveWarehouseCode, normalizedProductSearch, queryClient])

  useEffect(() => {
    if (!customerSelected) return
    prefetchProducts()
  }, [customerLookupToken, customerSelected, prefetchProducts])

  const products = useMemo(
    () => rankProductsBySearchRelevance(productsQuery.data ?? [], normalizedProductSearch),
    [productsQuery.data, normalizedProductSearch],
  )

  const productWarehouseStocksQuery = useQuery({
    ...arInvoiceCreateQueries.productWarehouseStocks(stockPreviewProductCode),
    enabled: Boolean(stockPreviewProductCode),
  })

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
        .getElementById('ar-invoice-product-section')
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
    setProductQueryLimit((prev) => Math.min(prev + 10, FULL_PRODUCT_LIMIT))
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

  const applyProductsToRows = (
    products: ProductLookupItem[],
    callbacks: { closeProductPopup: () => void },
  ) => {
    products.forEach((product) => {
      void queryClient.prefetchQuery(arInvoiceCreateQueries.productWarehouseStocks(product.code))
    })

    if (activeProductRowId) {
      // If we were editing a specific row, only update that row with the first selected product
      const product = products[0]
      if (product) {
        updateProductRow(activeProductRowId, {
          productCode: product.code,
          productName: product.name,
          stock: product.stock,
          price: product.price,
          currency: product.currency,
          vatGroup: product.vatGroup,
          taxRate: product.taxRate,
          uomCode: product.uomCode,
          uomEntry: product.uomEntry,
          quantity: 1,
          discountPercent: 0,
          discountAmount: 0,
          warehouseCode: effectiveWarehouseCode || '',
        })
      }
    } else {
      // Add all selected products as new rows
      const newRows: ProductRow[] = products.map((product, index) => ({
        id: `row-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        productCode: product.code,
        productName: product.name,
        stock: product.stock,
        price: product.price,
        currency: product.currency,
        vatGroup: product.vatGroup,
        taxRate: product.taxRate,
        uomCode: product.uomCode,
        uomEntry: product.uomEntry,
        quantity: 1,
        discountPercent: 0,
        discountAmount: 0,
        comment: '',
        warehouseCode: effectiveWarehouseCode || '',
      }))
      setProductRows((prev) => [...prev, ...newRows])
    }
    callbacks.closeProductPopup()
    setActiveProductRowId(null)
  }

  const applyProductToRow = (
    product: ProductLookupItem,
    callbacks: { closeProductPopup: () => void },
  ) => {
    applyProductsToRows([product], callbacks)
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
    applyProductsToRows,
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
