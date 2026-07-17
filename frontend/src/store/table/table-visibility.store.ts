/** Re-export shim: column visibility lives on the composed table store. */
export {
  useSetVisibilityAction,
  useTableStore as useTableVisibilityStore,
} from "@/store/table/table.store";
