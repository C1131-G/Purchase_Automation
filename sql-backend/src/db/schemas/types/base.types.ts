// SQL Server Branded Types: Provides type safety for database column types in EntitySchemas.

export type SQLColumnType =
  | "nvarchar"
  | "varchar"
  | "int"
  | "decimal"
  | "date"
  | "datetime"
  | "bit"
  | "float"
  | "text";

export const asSql = (type: SQLColumnType) => type;
