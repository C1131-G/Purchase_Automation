// SAP HANA Branded Types: Provides type safety for database column types in EntitySchemas.

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

// Utility to cast a string literal to a HANAColumnType safely.
export const asHana = (type: HANAColumnType) => type;
