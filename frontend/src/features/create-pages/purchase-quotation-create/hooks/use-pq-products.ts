import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createSharedQueries as purchaseQuotationCreateQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type {
  ProductLookupItem,
  ProductWarehouseStockItem,
} from "@/features/create-pages/create-shared/api/create-shared.types";
import type {
  ProductRow,
  ProductRowDraft,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  BROWSE_PRODUCT_LIMIT,
  QUICK_PRODUCT_LIMIT,
  rankProductsBySearchRelevance,
} from "@/features/create-pages/purchase-quotation-create/utils/pq-create.utils";
import type { ProductSearchFieldError } from "@/features/create-pages/purchase-quotation-create/utils/pq-create.utils";

interface usePqProductsProps {
  effectiveWarehouseCode: string | null;
  vendorLookupToken: string;
  /** Vendor CardCode — scopes product browse to OSCN ∩ OITM. */
  vendorCardCode?: string | undefined;
  productPopupOpen: boolean;
  setProductPopupOpen: (open: boolean) => void;
  productSearch: string;
  setProductSearch: (search: string) => void;
  stockPreviewProductCode: string | undefined;
  vendorSelected: boolean;
  /** Default line Required Date / Quoted Date when adding products (from header). */
  defaultLineRequiredDate?: string;
  defaultLineQuotedDate?: string;
}

export function usePqProducts({
  effectiveWarehouseCode,
  vendorLookupToken,
  vendorCardCode,
  productPopupOpen,
  setProductPopupOpen,
  productSearch,
  setProductSearch,
  stockPreviewProductCode,
  vendorSelected,
  defaultLineRequiredDate = "",
  defaultLineQuotedDate: _defaultLineQuotedDate = "",
}: usePqProductsProps) {
  const partnerCardCode = vendorCardCode?.trim() || undefined;
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

  const searchWarehouseCode = useMemo(() => {
    if (activeProductRowId) {
      const activeRow = productRows.find((r) => r.id === activeProductRowId);
      if (activeRow?.warehouseCode) {
        return activeRow.warehouseCode;
      }
    }
    return effectiveWarehouseCode || undefined;
  }, [activeProductRowId, productRows, effectiveWarehouseCode]);

  const productsQuery = useQuery({
    ...purchaseQuotationCreateQueries.products(
      undefined,
      normalizedProductSearch || undefined,
      normalizedProductSearch ? BROWSE_PRODUCT_LIMIT : productQueryLimit,
      "purchase",
      undefined,
      partnerCardCode,
    ),
    enabled: productPopupOpen && vendorSelected && Boolean(partnerCardCode),
  });

  const products = useMemo(
    () => rankProductsBySearchRelevance(productsQuery.data ?? [], normalizedProductSearch),
    [productsQuery.data, normalizedProductSearch],
  );

  const productWarehouseStocksQuery = useQuery({
    ...purchaseQuotationCreateQueries.productWarehouseStocks(stockPreviewProductCode),
    enabled: Boolean(stockPreviewProductCode),
  });

  const prefetchProducts = useCallback(() => {
    if (!vendorSelected || !partnerCardCode) {
      return;
    }
    void queryClient.prefetchQuery(
      purchaseQuotationCreateQueries.products(
        undefined,
        normalizedProductSearch || undefined,
        QUICK_PRODUCT_LIMIT,
        "purchase",
        undefined,
        partnerCardCode,
      ),
    );
  }, [vendorSelected, partnerCardCode, normalizedProductSearch, queryClient]);

  useEffect(() => {
    if (!vendorSelected || !partnerCardCode) {
      return;
    }
    prefetchProducts();
  }, [vendorLookupToken, vendorSelected, partnerCardCode, prefetchProducts]);

  useEffect(() => {
    if (!productPopupOpen || !vendorSelected || !partnerCardCode) {
      return;
    }
    if (normalizedProductSearch) {
      return;
    }
    if (productsQuery.isFetching || productsQuery.isError) {
      return;
    }
    if ((productsQuery.data?.length ?? 0) === 0) {
      return;
    }
    if (productQueryLimit >= BROWSE_PRODUCT_LIMIT) {
      return;
    }
    void queryClient.prefetchQuery(
      purchaseQuotationCreateQueries.products(
        undefined,
        undefined,
        BROWSE_PRODUCT_LIMIT,
        "purchase",
        undefined,
        partnerCardCode,
      ),
    );
  }, [
    productPopupOpen,
    vendorSelected,
    partnerCardCode,
    normalizedProductSearch,
    productsQuery.isFetching,
    productsQuery.isError,
    productsQuery.data,
    productQueryLimit,
    queryClient,
  ]);

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
        .querySelector("#purchase-quotation-product-section")
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
    if (productQueryLimit >= BROWSE_PRODUCT_LIMIT) {
      return;
    }
    // Single jump to warm page (prefetched after first paint) instead of 10→20→30 steps.
    setProductQueryLimit(BROWSE_PRODUCT_LIMIT);
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
      void queryClient.prefetchQuery(
        purchaseQuotationCreateQueries.productWarehouseStocks(product.code),
      );
    });

    if (activeProductRowId) {
      // If we were editing a specific row, only update that row with the first selected product.
      // Leave the row's user-chosen warehouse untouched.
      const product = products[0];
      if (product) {
        const activeRow = productRows.find((r) => r.id === activeProductRowId);
        const targetWhs = activeRow?.warehouseCode || effectiveWarehouseCode || "";
        const stocksData = queryClient.getQueryData<ProductWarehouseStockItem[]>(
          purchaseQuotationCreateQueries.productWarehouseStocks(product.code).queryKey,
        );
        const matchedStock = stocksData?.find(
          (s) => String(s.code).trim() === String(targetWhs).trim(),
        );
        const resolvedStock = matchedStock ? Number(matchedStock.stock ?? 0) : 0;

        updateProductRow(activeProductRowId, {
          currency: product.currency,
          discountAmount: 0,
          discountPercent: 0,
          // PQ: always start at 0; user can edit when line inputs are enabled.
          price: 0,
          productCode: product.code,
          productName: product.name,
          // Quoted qty/date stay empty until the vendor fills them.
          quantity: 0,
          quotedDate: "",
          requiredQuantity: 1,
          requiredDate: defaultLineRequiredDate || activeRow?.requiredDate || "",
          stock: resolvedStock,
          taxRate: product.taxRate,
          uomCode: product.purchaseUomCode || product.uomCode,
          uomEntry: product.purchaseUomEntry ?? product.uomEntry,
          uomList: product.uomList,
          purchaseUomCode: product.purchaseUomCode,
          purchaseUomEntry: product.purchaseUomEntry,
          salesUomCode: product.uomCode,
          salesUomEntry: product.uomEntry,
          vatGroup: product.vatGroup,
          warehouseCode: targetWhs,
        });
      }
    } else {
      // New row: force user to pick a warehouse explicitly.
      const newRows: ProductRow[] = products.map((product, index) => {
        const targetWhs = effectiveWarehouseCode || "";
        const stocksData = queryClient.getQueryData<ProductWarehouseStockItem[]>(
          purchaseQuotationCreateQueries.productWarehouseStocks(product.code).queryKey,
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
          // PQ: always start at 0; user can edit when line inputs are enabled.
          price: 0,
          productCode: product.code,
          productName: product.name,
          // Quoted qty/date stay empty until the vendor fills them.
          quantity: 0,
          quotedDate: "",
          requiredQuantity: 1,
          requiredDate: defaultLineRequiredDate || "",
          selected: false,
          stock: resolvedStock,
          taxRate: product.taxRate,
          uomCode: product.purchaseUomCode || product.uomCode,
          uomEntry: product.purchaseUomEntry ?? product.uomEntry,
          uomList: product.uomList,
          purchaseUomCode: product.purchaseUomCode,
          purchaseUomEntry: product.purchaseUomEntry,
          salesUomCode: product.uomCode,
          salesUomEntry: product.uomEntry,
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
