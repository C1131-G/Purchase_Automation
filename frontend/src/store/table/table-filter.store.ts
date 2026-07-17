/** Re-export shim: filters live on the composed table store. */
export {
  useClearAllFiltersAction,
  useClearDateFilterDraftAction,
  useSetActiveFilterAction,
  useSetColumnFiltersAction,
  useSetDateFilterDraftAction,
  useTableActiveFilter,
  useTableColumnFilters,
  useTableDateFilterDraft,
  useTableStore as useTableFilterStore,
} from "@/store/table/table.store";
