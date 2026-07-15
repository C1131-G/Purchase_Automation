/**
 * Loose Drizzle handles used where the same function accepts both
 * `getDb()` and transaction clients. Call sites use these aliases
 * instead of writing `any`.
 */
/* oxlint-disable typescript/no-explicit-any */
export type LooseDb = any;
export type LooseTable = any;
export type LooseColumn = any;
export type LooseWhere = any;
export type LooseOrderBy = any;
export type LooseValues = any;
/* oxlint-enable typescript/no-explicit-any */
