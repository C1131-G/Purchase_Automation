import { LRUCache } from "lru-cache";

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
  if (cache.has(key)) {
    return cache.get(key) as T;
  }

  if (inFlight.has(key)) {
    return inFlight.get(key) as Promise<T>;
  }

  const fetchPromise = fetcher().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, fetchPromise);

  const data = await fetchPromise;
  if (data !== undefined && data !== null) {
    cache.set(key, data, { ttl });
  }
  return data;
};

export const invalidateKey = (key: string): void => {
  cache.delete(key);
};

export const purgeCache = (pattern: string): void => {
  let count = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
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
