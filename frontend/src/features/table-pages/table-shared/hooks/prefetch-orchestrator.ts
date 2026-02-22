import { type FetchQueryOptions, type QueryClient, type QueryKey } from '@tanstack/react-query'

const PREFETCH_RECENT_MS = 15000
const PREFETCH_WASTE_WINDOW_MS = 120000
const PREFETCH_CHANNEL = 'table-prefetch'

type PrefetchMetrics = {
  attempts: number
  success: number
  failed: number
  skippedFresh: number
  skippedInFlight: number
  skippedRecentLocal: number
  skippedRecentCrossTab: number
  consumed: number
  wasted: number
  totalLatencyMs: number
}

const metrics: PrefetchMetrics = {
  attempts: 0,
  success: 0,
  failed: 0,
  skippedFresh: 0,
  skippedInFlight: 0,
  skippedRecentLocal: 0,
  skippedRecentCrossTab: 0,
  consumed: 0,
  wasted: 0,
  totalLatencyMs: 0,
}

const localRecentPrefetch = new Map<string, number>()
const crossTabRecentPrefetch = new Map<string, number>()
const prefetchedButUnconsumed = new Map<string, number>()
const consumedKeys = new Set<string>()

let hasAttachedCacheObserver = false
let prefetchChannel: BroadcastChannel | null = null

const normalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, normalizeValue(v)]),
    )
  }
  return value
}

const getSerializedKey = (queryKey: QueryKey | undefined): string | null => {
  if (!queryKey) return null
  return JSON.stringify(normalizeValue(queryKey))
}

const getStaleTime = (options: FetchQueryOptions<unknown, unknown, unknown, QueryKey>): number => {
  return typeof options.staleTime === 'number' ? options.staleTime : 0
}

const sweepRecent = (now: number) => {
  for (const [key, ts] of localRecentPrefetch) {
    if (now - ts > PREFETCH_RECENT_MS) localRecentPrefetch.delete(key)
  }
  for (const [key, ts] of crossTabRecentPrefetch) {
    if (now - ts > PREFETCH_RECENT_MS) crossTabRecentPrefetch.delete(key)
  }
}

const sweepWasted = (now: number) => {
  for (const [key, ts] of prefetchedButUnconsumed) {
    if (consumedKeys.has(key)) {
      prefetchedButUnconsumed.delete(key)
      continue
    }
    if (now - ts > PREFETCH_WASTE_WINDOW_MS) {
      metrics.wasted += 1
      prefetchedButUnconsumed.delete(key)
    }
  }
}

const ensureCrossTabChannel = () => {
  if (prefetchChannel || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return
  }

  prefetchChannel = new BroadcastChannel(PREFETCH_CHANNEL)
  prefetchChannel.onmessage = (event: MessageEvent<{ key: string; at: number }>) => {
    if (!event.data?.key) return
    crossTabRecentPrefetch.set(event.data.key, event.data.at)
  }
}

const publishCrossTabPrefetch = (serializedKey: string, at: number) => {
  ensureCrossTabChannel()
  prefetchChannel?.postMessage({ key: serializedKey, at })
}

const exposeMetrics = () => {
  if (typeof window === 'undefined') return
  const target = window as Window & {
    __TABLE_PREFETCH_METRICS__?: () => PrefetchMetrics & { hitRate: number; wasteRate: number }
  }
  target.__TABLE_PREFETCH_METRICS__ = () => {
    const hits = metrics.consumed
    const successes = Math.max(metrics.success, 1)
    return {
      ...metrics,
      hitRate: Number((hits / successes).toFixed(4)),
      wasteRate: Number((metrics.wasted / successes).toFixed(4)),
    }
  }
}

const ensureQueryCacheObserver = (queryClient: QueryClient) => {
  if (hasAttachedCacheObserver) return
  hasAttachedCacheObserver = true

  queryClient.getQueryCache().subscribe((event) => {
    if (!event || event.type !== 'observerAdded') return
    const serializedKey = getSerializedKey(event.query.queryKey)
    if (!serializedKey) return
    if (!prefetchedButUnconsumed.has(serializedKey) || consumedKeys.has(serializedKey)) return

    consumedKeys.add(serializedKey)
    prefetchedButUnconsumed.delete(serializedKey)
    metrics.consumed += 1
  })
}

export const runSmartPrefetch = async <
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryClient: QueryClient,
  options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
) => {
  ensureQueryCacheObserver(queryClient)
  ensureCrossTabChannel()
  exposeMetrics()

  metrics.attempts += 1
  const now = Date.now()
  sweepRecent(now)
  sweepWasted(now)

  const serializedKey = getSerializedKey(options.queryKey as QueryKey | undefined)
  if (!serializedKey) return

  const localRecentAt = localRecentPrefetch.get(serializedKey)
  if (localRecentAt && now - localRecentAt < PREFETCH_RECENT_MS) {
    metrics.skippedRecentLocal += 1
    return
  }

  const crossTabRecentAt = crossTabRecentPrefetch.get(serializedKey)
  if (crossTabRecentAt && now - crossTabRecentAt < PREFETCH_RECENT_MS) {
    metrics.skippedRecentCrossTab += 1
    return
  }

  const queryKey = options.queryKey as QueryKey
  const isInFlight = queryClient.isFetching({ queryKey }) > 0
  if (isInFlight) {
    metrics.skippedInFlight += 1
    return
  }

  const queryState = queryClient.getQueryState(queryKey)
  const staleTime = getStaleTime(options as FetchQueryOptions<unknown, unknown, unknown, QueryKey>)
  const isFresh =
    staleTime > 0 &&
    !!queryState?.dataUpdatedAt &&
    now - queryState.dataUpdatedAt < staleTime &&
    !queryState.isInvalidated

  if (isFresh) {
    metrics.skippedFresh += 1
    return
  }

  localRecentPrefetch.set(serializedKey, now)
  publishCrossTabPrefetch(serializedKey, now)

  const startedAt = performance.now()
  try {
    await queryClient.prefetchQuery(options)
    metrics.success += 1
    metrics.totalLatencyMs += performance.now() - startedAt
    prefetchedButUnconsumed.set(serializedKey, Date.now())
    consumedKeys.delete(serializedKey)
  } catch {
    metrics.failed += 1
  }
}
