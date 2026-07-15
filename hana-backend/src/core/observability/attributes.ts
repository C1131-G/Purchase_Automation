/** Low-cardinality attribute helpers for metrics and spans. */

/** Strip ids from SAP Service Layer paths: `/b1s/v1/Orders(123)` → `Orders`. */
export function normalizeEndpointGroup(endpoint: string): string {
  if (!endpoint) {
    return "unknown";
  }
  const path = endpoint.split("?")[0] ?? endpoint;
  const cleaned = path
    .replace(/^\/b1s\/v\d+\//i, "")
    .replace(/^\//, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\/\d+/g, "")
    .split("/")
    .filter(Boolean)[0];
  return cleaned && cleaned.length > 0 ? cleaned.slice(0, 64) : "unknown";
}

/** Prefer Express route template over raw URL to avoid series explosion. */
export function routeLabel(
  baseUrl: string | undefined,
  routePath: string | undefined,
  fallback = "unmatched",
): string {
  if (routePath) {
    const base = baseUrl && baseUrl !== "/" ? baseUrl : "";
    return `${base}${routePath}`.slice(0, 128) || fallback;
  }
  return fallback;
}

export function truncateSql(sql: string, max = 120): string {
  const oneLine = sql.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}
