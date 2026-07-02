import { LRUCache } from "lru-cache";
import { dbContext } from "@/db/client";

import { logger } from "@/core/logger/pino-logger";

const options = {
  max: 5000,
  ttl: 1000 * 60 * 5,
  updateAgeOnGet: false,
} as const;

const cache = new LRUCache<string, object>(options);
const inFlight = new Map<string, Promise<unknown>>();

export const getCachedData = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number,
): Promise<T> => {
  const context = dbContext.getStore();
  const namespacedKey = context?.dbName ? `${context.dbName}:${key}` : key;

  if (cache.has(namespacedKey)) {
    return cache.get(namespacedKey) as T;
  }

  if (inFlight.has(namespacedKey)) {
    return inFlight.get(namespacedKey) as Promise<T>;
  }

  const fetchPromise = fetcher().finally(() => {
    inFlight.delete(namespacedKey);
  });

  inFlight.set(namespacedKey, fetchPromise);

  const data = await fetchPromise;
  if (data !== undefined && data !== null) {
    cache.set(namespacedKey, data, { ttl });
  }
  return data;
};

export const invalidateKey = (key: string): void => {
  const context = dbContext.getStore();
  const namespacedKey = context?.dbName ? `${context.dbName}:${key}` : key;
  cache.delete(namespacedKey);
};

export const purgeCache = (pattern: string): void => {
  const context = dbContext.getStore();
  const namespacedPattern = context?.dbName ? `${context.dbName}:${pattern}` : pattern;
  let count = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(namespacedPattern)) {
      cache.delete(key);
      count++;
    }
  }
  if (count > 0) {
    logger.info({ pattern, removedCount: count }, "Cache purged by pattern");
  }
};

export const getCacheStats = () => ({
  keys: Array.from(cache.keys()),
  max: cache.max,
  size: cache.size,
});
