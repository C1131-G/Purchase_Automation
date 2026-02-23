import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

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
  productPopupOpen: boolean
  setProductPopupOpen: (open: boolean) => void
  productSearch: string
  setProductSearch: (search: string) => void
  stockPreviewProductCode: string | undefined
}

export function useArProducts({
  effectiveWarehouseCode,
  productPopupOpen,
  setProductPopupOpen,
  productSearch,
  setProductSearch,
  stockPreviewProductCode,
}: UseArProductsProps) {
  const queryClient = useQueryClient()
  const [productRows, setProductRows] = useState<ProductRow[]>([])
  const [productRowDrafts, setProductRowDrafts] = useState<Record<string, ProductRowDraft>>({})
  const [activeProductRowId, setActiveProductRowId] = useState<string | null>(null)
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [productSearch])

  const normalizedProductSearch = debouncedProductSearch.trim()
  const productQueryLimit = normalizedProductSearch ? undefined : QUICK_PRODUCT_LIMIT

  const productsQuery = useQuery({
    ...arInvoiceCreateQueries.products(
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
    ...arInvoiceCreateQueries.productWarehouseStocks(stockPreviewProductCode),
    enabled: Boolean(stockPreviewProductCode),
  })

  const prefetchProducts = () => {
    if (!effectiveWarehouseCode) return
    void queryClient.prefetchQuery(
      arInvoiceCreateQueries.products(
        effectiveWarehouseCode,
        normalizedProductSearch || undefined,
        productQueryLimit,
      ),
    )
    if (!normalizedProductSearch) {
      void queryClient.prefetchQuery(
        arInvoiceCreateQueries.products(effectiveWarehouseCode, undefined, FULL_PRODUCT_LIMIT),
      )
    }
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

    setProductSearch(initialSearch)
    setDebouncedProductSearch(initialSearch)

    if (effectiveWarehouseCode) {
      void queryClient.fetchQuery(
        arInvoiceCreateQueries.products(
          effectiveWarehouseCode,
          initialSearch || undefined,
          initialSearch.trim() ? undefined : QUICK_PRODUCT_LIMIT,
        ),
      )
      void queryClient.prefetchQuery(
        arInvoiceCreateQueries.products(
          effectiveWarehouseCode,
          initialSearch || undefined,
          FULL_PRODUCT_LIMIT,
        ),
      )
    }
    setActiveProductRowId(rowId)
    setProductPopupOpen(true)
    window.requestAnimationFrame(() => {
      document
        .getElementById('ar-invoice-product-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
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
    void queryClient.prefetchQuery(arInvoiceCreateQueries.productWarehouseStocks(product.code))

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
    debouncedProductSearch,
    setDebouncedProductSearch,
  }
}
