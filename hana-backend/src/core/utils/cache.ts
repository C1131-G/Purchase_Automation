// LRU Cache Utility: Provides a performance-optimized, in-memory store to reduce redundant database queries and SAP Service Layer roundtrips.

import { LRUCache } from "lru-cache";

import { logger } from "@/core/logger/pino-logger";

const options = {
  // Supports up to 5000 distinct entries, allowing the application to scale across multiple tenants and datasets.
  max: 5000,
  // Keys expire after 5 minutes by default, striking a balance between data freshness and load reduction.
  ttl: 1000 * 60 * 5,
  // Optimization: Do not reset the TTL clock on successful reads. This ensures predictable expiration windows.
  updateAgeOnGet: false,
} as const;

const cache = new LRUCache<string, object>(options);
// Thundering Herd Protection: Tracks active fetch promises to prevent parallel source-level requests for the same missing key.
const inFlight = new Map<string, Promise<unknown>>();

// Retrieves a value from the cache. If it is a miss, it executes the provided 'fetcher' function and stores the result.
export const getCachedData = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number,
): Promise<T> => {
  // 1. Primary path: Memory hit.
  if (cache.has(key)) {
    logger.debug({ key, msg: "Cache HIT" });
    return cache.get(key) as T;
  }

  // 2. Secondary path: Deduplication. If another request is currently fetching this key, await its result instead of starting a new fetch.
  if (inFlight.has(key)) {
    logger.debug({ key, msg: "Cache WAIT (In-flight)" });
    return inFlight.get(key) as Promise<T>;
  }

  logger.debug({ key, msg: "Cache MISS" });

  // 3. Execute Source Fetch: Wraps the fetcher in a promise that cleans up after itself in the inFlight map.
  const fetchPromise = fetcher().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, fetchPromise);

  const data = await fetchPromise;
  // Standard policy: Do not cache null/undefined values to avoid 'empty data' staleness.
  if (data !== undefined && data !== null) {
    cache.set(key, data, { ttl });
  }
  return data;
};

// Immediately removes a specific key (e.g., after an update operation).
export const invalidateKey = (key: string): void => {
  cache.delete(key);
  logger.debug({ key, msg: "Cache invalidated by key" });
};

// Batch Invalidation: Loops through the cache keys and purges anything matching the provided prefix.
// Frequently used to invalidate entire dashboard segments after a document update.
export const purgeCache = (pattern: string): void => {
  let count = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key);
      count++;
    }
  }
  if (count > 0) {
    logger.info({
      msg: "Cache purged by pattern",
      pattern,
      removedCount: count,
    });
  }
};

// Diagnostics: Returns the current utilization and occupancy of the cache pool.
export const getCacheStats = () => ({
  keys: Array.from(cache.keys()),
  max: cache.max,
  size: cache.size,
});
