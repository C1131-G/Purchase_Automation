/**
 * Dynamic shapes for export/transformers and loosely typed SQL helpers.
 * Call sites use DynRow instead of writing `any`.
 */
/* oxlint-disable typescript/no-explicit-any */

export type DynValue = any;

export type DynRow = Record<string, any>;

export const asDynRow = (value: unknown): DynRow =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as DynRow) : {};

export const asDynRows = (value: unknown): DynRow[] =>
  Array.isArray(value) ? (value as DynRow[]) : [];

/* oxlint-enable typescript/no-explicit-any */
