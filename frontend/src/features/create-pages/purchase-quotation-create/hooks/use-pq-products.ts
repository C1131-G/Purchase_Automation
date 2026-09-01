import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

export interface PqProductPricingInput {
  currency: string;
  lastPurchaseCurrency?: string | undefined;
  lastPurchasePrice?: number | undefined;
  price: number;
}

export const resolvePqProductPricing = ({
  currency,
  lastPurchaseCurrency,
  lastPurchasePrice,
  price,
}: PqProductPricingInput) => {
  const resolvedLastPurchasePrice = Number(lastPurchasePrice ?? 0);
  const hasLastPurchasePrice =
    Number.isFinite(resolvedLastPurchasePrice) && resolvedLastPurchasePrice > 0;

  return {
    currency:
      hasLastPurchasePrice && lastPurchaseCurrency?.trim() ? lastPurchaseCurrency : currency,
    discountAmount: 0,
    discountPercent: 0,
    price: hasLastPurchasePrice ? resolvedLastPurchasePrice : price,
  };
};

export const repricePqRows = (rows: ProductRow[], products: ProductLookupItem[]) => {
  const productsByCode = new Map(products.map((product) => [product.code.trim(), product]));
  const nextRows: ProductRow[] = [];
  let repricedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const product = productsByCode.get(row.productCode.trim());
    if (!product) {
      nextRows.push(row);
      skippedCount += 1;
      continue;
    }
    const lastPurchasePrice = Number(product.lastPurchasePrice ?? 0);
    if (!Number.isFinite(lastPurchasePrice) || lastPurchasePrice <= 0) {
      nextRows.push(row);
      skippedCount += 1;
      continue;
    }
    const pricing = resolvePqProductPricing(product);
    nextRows.push({ ...row, price: pricing.price, currency: pricing.currency });
    repricedCount += 1;
  }

  return {
    removedCount: 0,
    repricedCount,
    skippedCount,
    rows: nextRows,
  };
};

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
  const repriceRequestRef = useRef(0);

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
      BROWSE_PRODUCT_LIMIT,
      "purchase",
      undefined,
      partnerCardCode,
      "purchase-quotation",
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
        undefined,
        BROWSE_PRODUCT_LIMIT,
        "purchase",
        undefined,
        partnerCardCode,
        "purchase-quotation",
      ),
    );
  }, [vendorSelected, partnerCardCode, queryClient]);

  const repriceRowsForVendor = useCallback(
    async (cardCode: string) => {
      const previousRows = productRows;
      if (!cardCode.trim() || previousRows.length === 0) {
        return {
          previousRows,
          removedCount: 0,
          repricedCount: 0,
          skippedCount: previousRows.length,
          rows: previousRows,
        };
      }

      const requestId = repriceRequestRef.current + 1;
      repriceRequestRef.current = requestId;
      const itemCodes = previousRows.map((row) => row.productCode).filter(Boolean);
      const products = await queryClient.fetchQuery(
        purchaseQuotationCreateQueries.productsByCodes(
          itemCodes,
          "purchase",
          undefined,
          effectiveWarehouseCode || undefined,
          cardCode,
          "purchase-quotation",
        ),
      );

      if (requestId !== repriceRequestRef.current) {
        return {
          previousRows,
          removedCount: 0,
          repricedCount: 0,
          skippedCount: previousRows.length,
          rows: previousRows,
          stale: true,
        };
      }

      const result = repricePqRows(previousRows, products);
      setProductRows(result.rows);
      return { ...result, previousRows, stale: false };
    },
    [effectiveWarehouseCode, productRows, queryClient],
  );

  useEffect(() => {
    if (!vendorSelected || !partnerCardCode) {
      return;
    }
    prefetchProducts();
  }, [vendorLookupToken, vendorSelected, partnerCardCode, prefetchProducts]);

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
        .querySelector("#purchase-quotation-product-section")
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
        purchaseQuotationCreateQueries.productWarehouseStocks(product.code),
      );
    });

    if (activeProductRowId) {
      // If we were editing a specific row, only update that row with the first selected product.
      // Leave the row's user-chosen warehouse untouched.
      const product = products[0];
      if (product) {
        const pricing = resolvePqProductPricing(product);
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
          ...pricing,
          productCode: product.code,
          foreignName: product.foreignName,
          productName: product.name,
          // Quoted qty/date stay empty until the vendor fills them.
          quantity: 0,
          quotedDate: activeRow?.quotedDate || "",
          requiredQuantity: 1,
          requiredDate: defaultLineRequiredDate || activeRow?.requiredDate || "",
          stock: resolvedStock,
          taxRate: product.taxRate,
          uomCode: product.purchaseUomCode || "",
          uomEntry: product.purchaseUomEntry,
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
        const pricing = resolvePqProductPricing(product);
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
          ...pricing,
          id: `row-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          productCode: product.code,
          foreignName: product.foreignName,
          productName: product.name,
          // Quoted qty/date stay empty until the vendor fills them.
          quantity: 0,
          quotedDate: "",
          requiredQuantity: 1,
          requiredDate: defaultLineRequiredDate || "",
          selected: false,
          stock: resolvedStock,
          taxRate: product.taxRate,
          uomCode: product.purchaseUomCode || "",
          uomEntry: product.purchaseUomEntry,
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
    repriceRowsForVendor,
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
