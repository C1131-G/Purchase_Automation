import { LRUCache } from "lru-cache";

const cache = new LRUCache<string, unknown>({
  max: 500,
  ttl: 1000 * 60 * 5,
});

export const getCachedData = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  _ttl?: number,
): Promise<T> => {
  const cached = cache.get(key) as T | undefined;
  if (cached !== undefined) {
    return cached;
  }
  const data = await fetcher();
  cache.set(key, data);
  return data;
};

export const purgeCache = (prefix: string): void => {
  const keys = cache.keys();
  for (const key of keys) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

export const cacheService = {
  get: getCachedData,
  purge: purgeCache,
};
