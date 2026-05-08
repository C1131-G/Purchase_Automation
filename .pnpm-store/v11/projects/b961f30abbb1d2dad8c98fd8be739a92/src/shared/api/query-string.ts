/** toQueryString: Transforms flat object parameters into a URL-encoded query string, omitting nil values. */
export const toQueryString = <T extends object>(params: T) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    query.set(key, String(value));
  }
  return query.toString();
};
