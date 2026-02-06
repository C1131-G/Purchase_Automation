/**
 * SAP HANA Branded Types
 *
 * Provides type safety for database column types used in EntitySchemas,
 * eliminating the need for 'as any' casts.
 */

export type HANAColumnType =
  | "nvarchar"
  | "int"
  | "decimal"
  | "date"
  | "double"
  | "varbinary"
  | "timestamp"
  | "clob"
  | "blob";

/**
 * Utility to cast a string literal to a HANAColumnType safely
 */
export const asHana = (type: HANAColumnType) => type;
