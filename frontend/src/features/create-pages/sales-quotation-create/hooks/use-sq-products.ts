import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createSharedQueries as salesQuotationCreateQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
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
  rankProductsBySearchRelevance,
} from "@/features/create-pages/sales-quotation-create/utils/sq-create.utils";
import type { ProductSearchFieldError } from "@/features/create-pages/sales-quotation-create/utils/sq-create.utils";

interface useSQProductsProps {
  effectiveWarehouseCode: string | null;
  customerLookupToken: string;
  /** Customer CardCode — scopes product browse to OSCN ∩ OITM. */
  customerCardCode?: string | undefined;
  productPopupOpen: boolean;
  setProductPopupOpen: (open: boolean) => void;
  productSearch: string;
  setProductSearch: (search: string) => void;
  stockPreviewProductCode: string | undefined;
  customerSelected: boolean;
}

export function useSqProducts({
  effectiveWarehouseCode,
  customerLookupToken,
  customerCardCode,
  productPopupOpen,
  setProductPopupOpen,
  productSearch,
  setProductSearch,
  stockPreviewProductCode,
  customerSelected,
}: useSQProductsProps) {
  const partnerCardCode = customerCardCode?.trim() || undefined;
  const queryClient = useQueryClient();
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [productRowDrafts, setProductRowDrafts] = useState<Record<string, ProductRowDraft>>({});
  const [activeProductRowId, setActiveProductRowId] = useState<string | null>(null);
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");

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

  // Product Discovery Query: OSCN ∩ OITM for selected customer only.
  const productsQuery = useQuery({
    ...salesQuotationCreateQueries.products(
      undefined,
      normalizedProductSearch || undefined,
      BROWSE_PRODUCT_LIMIT,
      "sales",
      undefined,
      partnerCardCode,
      "sales-quotation",
    ),
    enabled: productPopupOpen && customerSelected && Boolean(partnerCardCode),
  });

  const products = useMemo(
    () => rankProductsBySearchRelevance(productsQuery.data ?? [], normalizedProductSearch),
    [productsQuery.data, normalizedProductSearch],
  );

  const productWarehouseStocksQuery = useQuery({
    ...salesQuotationCreateQueries.productWarehouseStocks(stockPreviewProductCode),
    enabled: Boolean(stockPreviewProductCode),
  });

  const prefetchProducts = useCallback(() => {
    if (!customerSelected || !partnerCardCode) {
      return;
    }
    void queryClient.prefetchQuery(
      salesQuotationCreateQueries.products(
        undefined,
        undefined,
        BROWSE_PRODUCT_LIMIT,
        "sales",
        undefined,
        partnerCardCode,
        "sales-quotation",
      ),
    );
  }, [customerSelected, partnerCardCode, queryClient]);

  useEffect(() => {
    if (!customerSelected || !partnerCardCode) {
      return;
    }
    prefetchProducts();
  }, [customerLookupToken, customerSelected, partnerCardCode, prefetchProducts]);

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
    setActiveProductRowId(rowId);
    setProductPopupOpen(true);
    window.requestAnimationFrame(() => {
      document
        .querySelector("#sales-quotation-product-section")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const loadMoreProducts = () => {
    // Browse is a single cached page (BROWSE_PRODUCT_LIMIT). Virtual scroll only windows it.
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
        salesQuotationCreateQueries.productWarehouseStocks(product.code),
      );
    });

    if (activeProductRowId) {
      // If we were editing a specific row, only update that row with the first selected product
      const product = products[0];
      if (product) {
        const activeRow = productRows.find((r) => r.id === activeProductRowId);
        const targetWhs = activeRow?.warehouseCode || effectiveWarehouseCode || "";
        const stocksData = queryClient.getQueryData<ProductWarehouseStockItem[]>(
          salesQuotationCreateQueries.productWarehouseStocks(product.code).queryKey,
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
          salesQuotationCreateQueries.productWarehouseStocks(product.code).queryKey,
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
