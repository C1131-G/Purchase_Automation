import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createSharedQueries as salesOrderCreateQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type {
  ProductLookupItem,
  ProductWarehouseStockItem,
} from "@/features/create-pages/create-shared/api/create-shared.types";
import type {
  ProductRow,
  ProductRowDraft,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  QUICK_PRODUCT_LIMIT,
  rankProductsBySearchRelevance,
} from "@/features/create-pages/sales-order-create/utils/so-create.utils";
import type { ProductSearchFieldError } from "@/features/create-pages/sales-order-create/utils/so-create.utils";

interface UseSoProductsProps {
  effectiveWarehouseCode: string | null;
  customerLookupToken: string;
  productPopupOpen: boolean;
  setProductPopupOpen: (open: boolean) => void;
  productSearch: string;
  setProductSearch: (search: string) => void;
  stockPreviewProductCode: string | undefined;
  customerSelected: boolean;
}

export function useSoProducts({
  effectiveWarehouseCode,
  customerLookupToken,
  productPopupOpen,
  setProductPopupOpen,
  productSearch,
  setProductSearch,
  stockPreviewProductCode,
  customerSelected,
}: UseSoProductsProps) {
  const queryClient = useQueryClient();
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [productRowDrafts, setProductRowDrafts] = useState<Record<string, ProductRowDraft>>({});
  const [activeProductRowId, setActiveProductRowId] = useState<string | null>(null);
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [productQueryLimit, setProductQueryLimit] = useState(QUICK_PRODUCT_LIMIT);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [productSearch]);

  const normalizedProductSearch = debouncedProductSearch.trim();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProductQueryLimit(QUICK_PRODUCT_LIMIT);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [normalizedProductSearch, customerSelected, productPopupOpen]);

  const searchWarehouseCode = useMemo(() => {
    if (activeProductRowId) {
      const activeRow = productRows.find((r) => r.id === activeProductRowId);
      if (activeRow?.warehouseCode) {
        return activeRow.warehouseCode;
      }
    }
    return effectiveWarehouseCode || undefined;
  }, [activeProductRowId, productRows, effectiveWarehouseCode]);

  // Product Discovery Query: Reactively fetches products based on search term and warehouse context.
  // Enabled as soon as a customer is selected to allow background prefetching.
  const productsQuery = useQuery({
    ...salesOrderCreateQueries.products(
      undefined, // Pass undefined to keep search warehouse-agnostic
      normalizedProductSearch || undefined,
      normalizedProductSearch ? undefined : productQueryLimit,
      "sales",
    ),
    enabled: customerSelected,
  });

  // Prefetch products whenever the customer selection (token) changes.
  const prefetchProducts = useCallback(() => {
    if (!customerSelected) {
      return;
    }
    void queryClient.prefetchQuery(
      salesOrderCreateQueries.products(
        undefined, // Pass undefined to keep search warehouse-agnostic
        normalizedProductSearch || undefined,
        QUICK_PRODUCT_LIMIT,
        "sales",
      ),
    );
  }, [customerSelected, normalizedProductSearch, queryClient]);

  useEffect(() => {
    if (!customerSelected) {
      return;
    }
    prefetchProducts();
  }, [customerLookupToken, customerSelected, prefetchProducts]);

  const products = useMemo(
    () => rankProductsBySearchRelevance(productsQuery.data ?? [], normalizedProductSearch),
    [productsQuery.data, normalizedProductSearch],
  );

  const productWarehouseStocksQuery = useQuery({
    ...salesOrderCreateQueries.productWarehouseStocks(stockPreviewProductCode),
    enabled: Boolean(stockPreviewProductCode),
  });

  const openProductPopup = (
    rowId: string | null,
    initialSearch: string,
    callbacks: {
      onValidateBeforeOpen: () => ProductSearchFieldError;
      onValidationFailed: (errors: ProductSearchFieldError) => void;
    },
  ) => {
    const errors = callbacks.onValidateBeforeOpen();
    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) {
      callbacks.onValidationFailed(errors);
      return;
    }

    const nextSearch = rowId || initialSearch.trim().length > 0 ? initialSearch : productSearch;
    setProductSearch(nextSearch);
    setDebouncedProductSearch(nextSearch);
    setProductQueryLimit(QUICK_PRODUCT_LIMIT);
    setActiveProductRowId(rowId);
    setProductPopupOpen(true);
    window.requestAnimationFrame(() => {
      document
        .querySelector("#sales-order-product-section")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const loadMoreProducts = () => {
    if (!productPopupOpen) {
      return;
    }
    if (productsQuery.isFetching) {
      return;
    }
    const currentCount = productsQuery.data?.length ?? 0;
    if (currentCount < productQueryLimit) {
      return;
    }
    const isSearchMode = normalizedProductSearch.length > 0;
    if (isSearchMode) {
      return;
    }
    if (productQueryLimit >= 50) {
      return;
    }
    setProductQueryLimit((prev) => Math.min(prev + 10, 50));
  };

  const updateProductRow = (id: string, patch: Partial<ProductRow>) => {
    setProductRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeProductRow = (id: string) => {
    setProductRows((prev) => prev.filter((row) => row.id !== id));
    setProductRowDrafts((prev) => {
      if (!prev[id]) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const setProductRowDraft = (id: string, field: keyof ProductRowDraft, value: string) => {
    setProductRowDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const clearProductRowDraft = (id: string, field: keyof ProductRowDraft) => {
    setProductRowDrafts((prev) => {
      const rowDraft = prev[id];
      if (!rowDraft || rowDraft[field] === undefined) {
        return prev;
      }
      const nextRowDraft = { ...rowDraft };
      delete nextRowDraft[field];
      if (Object.keys(nextRowDraft).length === 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: nextRowDraft };
    });
  };

  const applyProductsToRows = (
    products: ProductLookupItem[],
    callbacks: { closeProductPopup: () => void },
  ) => {
    products.forEach((product) => {
      void queryClient.prefetchQuery(salesOrderCreateQueries.productWarehouseStocks(product.code));
    });

    if (activeProductRowId) {
      // If we were editing a specific row, only update that row with the first selected product
      const product = products[0];
      if (product) {
        const activeRow = productRows.find((r) => r.id === activeProductRowId);
        const targetWhs = activeRow?.warehouseCode || effectiveWarehouseCode || "";
        const stocksData = queryClient.getQueryData<ProductWarehouseStockItem[]>(
          salesOrderCreateQueries.productWarehouseStocks(product.code).queryKey,
        );
        const matchedStock = stocksData?.find(
          (s) => String(s.code).trim() === String(targetWhs).trim(),
        );
        const resolvedStock = matchedStock ? Number(matchedStock.stock ?? 0) : 0;

        updateProductRow(activeProductRowId, {
          currency: product.currency,
          discountAmount: 0,
          discountPercent: 0,
          price: product.price,
          productCode: product.code,
          productName: product.name,
          quantity: 1,
          stock: resolvedStock,
          taxRate: product.taxRate,
          uomCode: product.uomCode,
          uomEntry: product.uomEntry,
          vatGroup: product.vatGroup,
          warehouseCode: targetWhs,
        });
      }
    } else {
      // Add all selected products as new rows
      const newRows: ProductRow[] = products.map((product, index) => {
        const targetWhs = effectiveWarehouseCode || "";
        const stocksData = queryClient.getQueryData<ProductWarehouseStockItem[]>(
          salesOrderCreateQueries.productWarehouseStocks(product.code).queryKey,
        );
        const matchedStock = stocksData?.find(
          (s) => String(s.code).trim() === String(targetWhs).trim(),
        );
        const resolvedStock = matchedStock ? Number(matchedStock.stock ?? 0) : 0;

        return {
          comment: "",
          currency: product.currency,
          discountAmount: 0,
          discountPercent: 0,
          id: `row-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          price: product.price,
          productCode: product.code,
          productName: product.name,
          quantity: 1,
          selected: false,
          stock: resolvedStock,
          taxRate: product.taxRate,
          uomCode: product.uomCode,
          uomEntry: product.uomEntry,
          vatGroup: product.vatGroup,
          warehouseCode: targetWhs,
        };
      });
      setProductRows((prev) => [...prev, ...newRows]);
    }
    callbacks.closeProductPopup();
    setActiveProductRowId(null);
  };

  const applyProductToRow = (
    product: ProductLookupItem,
    callbacks: { closeProductPopup: () => void },
  ) => {
    applyProductsToRows([product], callbacks);
  };

  return {
    activeProductRowId,
    applyProductToRow,
    applyProductsToRows,
    clearProductRowDraft,
    debouncedProductSearch,
    loadMoreProducts,
    openProductPopup,
    prefetchProducts,
    productRowDrafts,
    productRows,
    productWarehouseStocksQuery,
    products,
    productsQuery,
    removeProductRow,
    searchWarehouseCode,
    setActiveProductRowId,
    setDebouncedProductSearch,
    setProductRowDraft,
    setProductRowDrafts,
    setProductRows,
    updateProductRow,
  };
}
