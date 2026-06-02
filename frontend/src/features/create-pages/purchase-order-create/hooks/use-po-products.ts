/** usePoProducts: Complex state logic for PO product lines and stock validation. */
/** usePoProducts: Complex state logic for PO product lines and stock validation. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  createSharedKeys,
  createSharedQueries as purchaseOrderCreateQueries,
} from "@/features/create-pages/create-shared/api/create-shared.queries";
import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import type {
  ProductRow,
  ProductRowDraft,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  FULL_PRODUCT_LIMIT,
  QUICK_PRODUCT_LIMIT,
  rankProductsBySearchRelevance,
} from "@/features/create-pages/purchase-order-create/utils/po-create.utils";
import type { ProductSearchFieldError } from "@/features/create-pages/purchase-order-create/utils/po-create.utils";

interface UsePoProductsProps {
  effectiveWarehouseCode: string | null;
  vendorLookupToken: string;
  productPopupOpen: boolean;
  setProductPopupOpen: (open: boolean) => void;
  productSearch: string;
  setProductSearch: (search: string) => void;
  stockPreviewProductCode: string | undefined;
  vendorSelected: boolean;
  isEditMode?: boolean;
}

export function usePoProducts({
  effectiveWarehouseCode,
  vendorLookupToken,
  productPopupOpen,
  setProductPopupOpen,
  productSearch,
  setProductSearch,
  stockPreviewProductCode,
  vendorSelected,
  isEditMode = false,
}: UsePoProductsProps) {
  const queryClient = useQueryClient();
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [productRowDrafts, setProductRowDrafts] = useState<Record<string, ProductRowDraft>>({});
  const [activeProductRowId, setActiveProductRowId] = useState<string | null>(null);
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [productQueryLimit, setProductQueryLimit] = useState(QUICK_PRODUCT_LIMIT);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim());
    }, 180);
    return () => window.clearTimeout(timer);
  }, [productSearch]);

  const normalizedProductSearch = debouncedProductSearch.trim();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProductQueryLimit(QUICK_PRODUCT_LIMIT);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [normalizedProductSearch, vendorSelected, productPopupOpen]);

  // Product Discovery Query: Reactively fetches products based on search term and warehouse context.
  // Enabled only when the popup is open and a warehouse is selected to minimize redundant traffic.
  // In edit mode, fetch products WITHOUT warehouse filter to show total stock across all warehouses.
  const productsQuery = useQuery({
    ...purchaseOrderCreateQueries.products(
      isEditMode ? undefined : effectiveWarehouseCode || undefined,
      normalizedProductSearch || undefined,
      productQueryLimit,
      "purchase",
    ),
    enabled: productPopupOpen && vendorSelected,
  });

  useEffect(() => {
    if (!productPopupOpen || !vendorSelected) {
      return;
    }
    void queryClient.invalidateQueries({
      queryKey: createSharedKeys.products(),
    });
  }, [productPopupOpen, queryClient, vendorLookupToken, vendorSelected]);

  const products = useMemo(
    () => rankProductsBySearchRelevance(productsQuery.data ?? [], normalizedProductSearch),
    [productsQuery.data, normalizedProductSearch],
  );

  const productWarehouseStocksQuery = useQuery({
    ...purchaseOrderCreateQueries.productWarehouseStocks(stockPreviewProductCode),
    enabled: Boolean(stockPreviewProductCode),
  });

  const prefetchProducts = () => {
    if (!vendorSelected) {
      return;
    }
    void queryClient.prefetchQuery(
      purchaseOrderCreateQueries.products(
        isEditMode ? undefined : effectiveWarehouseCode || undefined,
        normalizedProductSearch || undefined,
        QUICK_PRODUCT_LIMIT,
        "purchase",
      ),
    );
  };

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
        .querySelector("#purchase-order-product-section")
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
    if (!isSearchMode && productQueryLimit >= FULL_PRODUCT_LIMIT) {
      return;
    }
    setProductQueryLimit((prev) => Math.min(prev + 10, FULL_PRODUCT_LIMIT));
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

  const applyProductToRow = (
    product: ProductLookupItem,
    callbacks: { closeProductPopup: () => void },
  ) => {
    void queryClient.prefetchQuery(purchaseOrderCreateQueries.productWarehouseStocks(product.code));

    if (activeProductRowId) {
      // Updating an existing row: leave the user-chosen warehouse untouched.
      updateProductRow(activeProductRowId, {
        currency: product.currency,
        discountAmount: 0,
        discountPercent: 0,
        price: product.price,
        productCode: product.code,
        productName: product.name,
        quantity: 1,
        stock: product.stock,
        taxRate: product.taxRate,
        uomCode: product.purchaseUomCode || product.uomCode,
        uomEntry: product.purchaseUomEntry ?? product.uomEntry,
        vatGroup: product.vatGroup,
      });
    } else {
      // New row: force user to pick a warehouse explicitly.
      setProductRows((prev) => [
        ...prev,
        {
          comment: "",
          currency: product.currency,
          discountAmount: 0,
          discountPercent: 0,
          id: `row - ${Date.now()} -${Math.random().toString(36).slice(2, 8)} `,
          price: product.price,
          productCode: product.code,
          productName: product.name,
          quantity: 1,
          selected: false,
          stock: product.stock,
          taxRate: product.taxRate,
          uomCode: product.purchaseUomCode || product.uomCode,
          uomEntry: product.purchaseUomEntry ?? product.uomEntry,
          vatGroup: product.vatGroup,
          warehouseCode: "",
        },
      ]);
    }
    callbacks.closeProductPopup();
    setActiveProductRowId(null);
  };

  const applyProductsToRows = (
    products: ProductLookupItem[],
    callbacks: { closeProductPopup: () => void },
  ) => {
    const nextRows: ProductRow[] = products.map((product) => {
      // New row: force user to pick a warehouse explicitly.
      return {
        comment: "",
        currency: product.currency,
        discountAmount: 0,
        discountPercent: 0,
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        price: product.price,
        productCode: product.code,
        productName: product.name,
        quantity: 1,
        selected: false,
        stock: product.stock,
        taxRate: product.taxRate,
        uomCode: product.purchaseUomCode || product.uomCode,
        uomEntry: product.purchaseUomEntry ?? product.uomEntry,
        vatGroup: product.vatGroup,
        warehouseCode: "",
      };
    });

    setProductRows((prev) => [...prev, ...nextRows]);
    callbacks.closeProductPopup();
    setActiveProductRowId(null);
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
    setActiveProductRowId,
    setDebouncedProductSearch,
    setProductRowDraft,
    setProductRowDrafts,
    setProductRows,
    updateProductRow,
  };
}
