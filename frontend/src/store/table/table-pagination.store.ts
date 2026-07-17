/** Re-export shim: pagination lives on the composed table store. */
export type { TablePagination } from "@/store/table/table.store";
export {
  useSetPaginationAction,
  useTablePagination,
  useTableStore as useTablePaginationStore,
} from "@/store/table/table.store";
