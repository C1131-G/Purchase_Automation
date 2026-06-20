import { createColumnHelper } from "@tanstack/react-table";
import { Tooltip } from "@/components/tooltip";
import type { ItemMasterListItem } from "@/features/table-pages/item-master/api/item-master.service";
import { TableColumnSort } from "@/features/table-pages/table-shared/components/core/table-column-sort";

const columnHelper = createColumnHelper<ItemMasterListItem>();

export const createItemMasterColumns = () => {
  return [
    columnHelper.accessor("ItemCode", {
      cell: (info) => info.getValue(),
      enableSorting: true,
      filterFn: "includesString",
      header: ({ column, table }) => (
        <TableColumnSort column={column} sortingState={table.getState().sorting} title="Item No" />
      ),
      id: "ItemCode",
      meta: { filterType: "text" },
      minSize: 12,
      size: 15,
    }),
    columnHelper.accessor("ItemName", {
      cell: (info) => {
        const display = info.getValue() ?? "";
        return (
          <Tooltip content={String(display)} className="block w-full max-w-full truncate">
            {display}
          </Tooltip>
        );
      },
      enableSorting: true,
      filterFn: "includesString",
      header: ({ column, table }) => (
        <TableColumnSort
          column={column}
          sortingState={table.getState().sorting}
          title="Description"
        />
      ),
      id: "ItemName",
      meta: { filterType: "text" },
      minSize: 20,
      size: 25,
    }),
    columnHelper.accessor("InvntItem", {
      cell: (info) => (info.getValue() === "Y" ? "Yes" : "No"),
      header: ({ column, table }) => (
        <TableColumnSort
          column={column}
          sortingState={table.getState().sorting}
          title="Stock Item"
        />
      ),
      id: "InvntItem",
      meta: {
        filterOptions: [
          { label: "Yes", value: "Y" },
          { label: "No", value: "N" },
        ],
        filterType: "select",
      },
      minSize: 10,
      size: 12,
    }),
    columnHelper.accessor("ItmsGrpCod", {
      cell: (info) => info.getValue() ?? "-",
      header: ({ column, table }) => (
        <TableColumnSort column={column} sortingState={table.getState().sorting} title="Group" />
      ),
      id: "ItmsGrpCod",
      meta: { filterType: "text" },
      minSize: 10,
      size: 12,
    }),
    columnHelper.accessor("InvntryUom", {
      cell: (info) => info.getValue() || "-",
      enableSorting: true,
      filterFn: "includesString",
      header: ({ column, table }) => (
        <TableColumnSort column={column} sortingState={table.getState().sorting} title="UoM" />
      ),
      id: "InvntryUom",
      meta: { filterType: "text" },
      minSize: 10,
      size: 12,
    }),
    columnHelper.accessor("CodeBars", {
      cell: (info) => info.getValue() || "-",
      enableSorting: true,
      filterFn: "includesString",
      header: ({ column, table }) => (
        <TableColumnSort column={column} sortingState={table.getState().sorting} title="Bar Code" />
      ),
      id: "CodeBars",
      meta: { filterType: "text" },
      minSize: 12,
      size: 15,
    }),
  ];
};
