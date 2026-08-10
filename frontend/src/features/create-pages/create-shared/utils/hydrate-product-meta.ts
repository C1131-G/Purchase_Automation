/**
 * Fast product resolution for edit / draft / copy-from hydrate.
 *
 * Never loads a full warehouse product catalog (FULL_PRODUCT_LIMIT).
 * Prefers one batch master-data call for all line item codes (Phase 2).
 * Requires partner cardCode so only OSCN ∩ OITM items resolve.
 * Warehouse stock is optional and must not block first paint (batch stocks).
 */
import type { QueryClient } from "@tanstack/react-query";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";

const DEFAULT_CONCURRENCY = 8;
/** Server and client cap for batch codes (must match backend MAX_MASTER_DATA_BATCH_CODES). */
const BATCH_CODE_CHUNK = 100;

export type ProductItemType = "purchase" | "sales";

export const uniqueHydrateItemCodes = (codes: Iterable<string | null | undefined>): string[] => [
  ...new Set([...codes].map((code) => String(code ?? "").trim()).filter(Boolean)),
];

const matchProductForCode = (
  products: ProductLookupItem[],
  itemCode: string,
): ProductLookupItem | undefined =>
  products.find((product) => String(product.code).trim() === itemCode) ?? products[0];

const chunkCodes = (codes: string[], size: number): string[][] => {
  if (codes.length === 0) {
    return [];
  }
  const chunks: string[][] = [];
  for (let index = 0; index < codes.length; index += size) {
    chunks.push(codes.slice(index, index + size));
  }
  return chunks;
};

/**
 * Seed limit-1 product cache entries so later UoM/popup lookups hit cache.
 */
const seedPerCodeProductCache = (
  queryClient: QueryClient,
  productByCode: Map<string, ProductLookupItem>,
  type: ProductItemType,
  cardCode?: string,
): void => {
  const partnerCode = cardCode?.trim() || undefined;
  for (const [itemCode, product] of productByCode) {
    const singleOptions = createSharedQueries.products(
      undefined,
      itemCode,
      1,
      type,
      undefined,
      partnerCode,
    );
    if (!queryClient.getQueryData(singleOptions.queryKey)) {
      queryClient.setQueryData(singleOptions.queryKey, [product]);
    }
  }
};

/**
 * Resolve product master for hydrate without FULL warehouse browse.
 * Uses batch products-by-codes (O(1) network per chunk of 100).
 * Falls back to concurrent limit-1 searches if batch fails.
 * Optional cardCode attaches BP catalog (OSCN) scope — required for non-empty results.
 */
export async function resolveHydrateProductMeta(
  queryClient: QueryClient,
  itemCodes: Iterable<string | null | undefined>,
  type: ProductItemType = "purchase",
  options?: { concurrency?: number | undefined; cardCode?: string | undefined },
): Promise<Map<string, ProductLookupItem>> {
  const productByCode = new Map<string, ProductLookupItem>();
  const codes = uniqueHydrateItemCodes(itemCodes);
  const partnerCode = options?.cardCode?.trim() || undefined;
  if (codes.length === 0 || !partnerCode) {
    return productByCode;
  }

  // Satisfy from existing limit-1 cache first.
  const missing: string[] = [];
  for (const itemCode of codes) {
    const singleOptions = createSharedQueries.products(
      undefined,
      itemCode,
      1,
      type,
      undefined,
      partnerCode,
    );
    const cached = queryClient.getQueryData<ProductLookupItem[]>(singleOptions.queryKey);
    if (cached?.length) {
      const matched = matchProductForCode(cached, itemCode);
      if (matched) {
        productByCode.set(itemCode, matched);
        continue;
      }
    }
    missing.push(itemCode);
  }

  if (missing.length === 0) {
    return productByCode;
  }

  const applyProducts = (products: ProductLookupItem[]) => {
    for (const product of products) {
      const code = String(product.code).trim();
      if (code && !productByCode.has(code)) {
        productByCode.set(code, product);
      }
    }
    for (const itemCode of missing) {
      if (productByCode.has(itemCode)) {
        continue;
      }
      const matched = matchProductForCode(products, itemCode);
      if (matched) {
        productByCode.set(itemCode, matched);
      }
    }
  };

  try {
    for (const chunk of chunkCodes(missing, BATCH_CODE_CHUNK)) {
      const products = await queryClient.fetchQuery(
        createSharedQueries.productsByCodes(chunk, type, undefined, undefined, partnerCode),
      );
      applyProducts(products);
    }
    seedPerCodeProductCache(queryClient, productByCode, type, partnerCode);
    return productByCode;
  } catch {
    const concurrency = Math.max(1, options?.concurrency ?? DEFAULT_CONCURRENCY);
    let nextIndex = 0;
    const stillMissing = missing.filter((code) => !productByCode.has(code));

    const runOne = async (itemCode: string) => {
      const queryOptions = createSharedQueries.products(
        undefined,
        itemCode,
        1,
        type,
        undefined,
        partnerCode,
      );
      const products = await queryClient
        .fetchQuery(queryOptions)
        .catch((): ProductLookupItem[] => []);
      const matched = matchProductForCode(products, itemCode);
      if (matched) {
        productByCode.set(itemCode, matched);
      }
    };

    const worker = async () => {
      while (nextIndex < stillMissing.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        const itemCode = stillMissing[currentIndex];
        if (!itemCode) {
          continue;
        }
        await runOne(itemCode);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, stillMissing.length) }, () => worker()),
    );
    seedPerCodeProductCache(queryClient, productByCode, type, partnerCode);
    return productByCode;
  }
}

/**
 * Resolve stock for many item codes after first paint (fire-and-forget).
 * Uses batch stocks endpoint (one call per 100 codes). Callers must not await.
 */
export function scheduleHydrateWarehouseStocks(
  queryClient: QueryClient,
  itemCodes: Iterable<string | null | undefined>,
  warehouseCode: string | undefined,
  onStocks: (stockByItemCode: Map<string, number>) => void,
): void {
  const codes = uniqueHydrateItemCodes(itemCodes);
  if (codes.length === 0) {
    return;
  }

  const normalizedWarehouse = String(warehouseCode ?? "").trim();

  void (async () => {
    const stockByItemCode = new Map<string, number>();

    const applyBatchRows = (rows: Array<{ itemCode: string; code: string; stock?: number }>) => {
      const sums = new Map<string, number>();
      for (const row of rows) {
        const itemCode = String(row.itemCode ?? "").trim();
        if (!itemCode) {
          continue;
        }
        if (normalizedWarehouse && String(row.code).trim() !== normalizedWarehouse) {
          continue;
        }
        sums.set(itemCode, (sums.get(itemCode) ?? 0) + Number(row.stock ?? 0));
      }
      for (const [itemCode, stock] of sums) {
        stockByItemCode.set(itemCode, stock);
      }
    };

    try {
      for (const chunk of chunkCodes(codes, BATCH_CODE_CHUNK)) {
        const rows = await queryClient.fetchQuery(
          createSharedQueries.productWarehouseStocksBatch(chunk, normalizedWarehouse || undefined),
        );
        applyBatchRows(rows);

        for (const itemCode of chunk) {
          const perItem = rows
            .filter((row) => String(row.itemCode).trim() === itemCode)
            .map((row) => ({
              code: row.code,
              name: (row as { name?: string }).name ?? row.code,
              stock: Number(row.stock ?? 0),
            }));
          if (perItem.length > 0) {
            const singleOptions = createSharedQueries.productWarehouseStocks(itemCode);
            if (!queryClient.getQueryData(singleOptions.queryKey)) {
              queryClient.setQueryData(singleOptions.queryKey, perItem);
            }
          }
        }
      }
    } catch {
      await Promise.all(
        codes.map(async (itemCode) => {
          const warehouseStocks = await queryClient
            .fetchQuery(createSharedQueries.productWarehouseStocks(itemCode))
            .catch(() => []);

          const resolvedStock = normalizedWarehouse
            ? Number(
                warehouseStocks.find((stock) => String(stock.code).trim() === normalizedWarehouse)
                  ?.stock ?? 0,
              )
            : warehouseStocks.reduce((sum, stock) => sum + Number(stock.stock ?? 0), 0);

          stockByItemCode.set(itemCode, resolvedStock);
        }),
      );
    }

    for (const itemCode of codes) {
      if (!stockByItemCode.has(itemCode)) {
        stockByItemCode.set(itemCode, 0);
      }
    }

    onStocks(stockByItemCode);
  })();
}

/**
 * Build a tax-rate map from already-resolved product meta (avoids a second product fetch).
 */
export function taxRatesFromProductMeta(
  productByCode: Map<string, ProductLookupItem>,
): Map<string, number> {
  const taxRateByItemCode = new Map<string, number>();
  for (const [itemCode, product] of productByCode) {
    const taxRate = Number(product.taxRate ?? 0);
    taxRateByItemCode.set(itemCode, Number.isFinite(taxRate) ? taxRate : 0);
  }
  return taxRateByItemCode;
}
