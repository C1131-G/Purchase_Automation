import type { Table } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

interface TableColumnVisibilityProps {
  table: Table<unknown>;
}

export function TableColumnVisibility({ table }: TableColumnVisibilityProps) {
  const [searchValue, setSearchValue] = useState("");

  const columns = table
    .getAllLeafColumns()
    .filter((column) => typeof column.columnDef.header === "string" || !!column.columnDef.header);

  const filteredColumns = useMemo(
    () =>
      columns.filter((column) => {
        const { header } = column.columnDef;
        const title = typeof header === "string" ? header : column.id;
        return title.toLowerCase().includes(searchValue.toLowerCase());
      }),
    [columns, searchValue],
  );

  return (
    <div className="flex flex-col">
      <div className="p-3 border-b border-linen-100 relative group">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search columns..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            autoComplete="off"
            className="w-full pl-9 pr-3 py-2 text-sm bg-linen-50 border border-linen-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchValue("");
                e.stopPropagation();
              }
            }}
          />
        </div>
      </div>

      <div className="max-h-50 overflow-y-auto p-1.5 space-y-0.5 no-scrollbar">
        {filteredColumns.map((column) => {
          const { header } = column.columnDef;
          const displayName = typeof header === "string" ? header : column.id;

          return (
            <label
              key={column.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-linen-50 cursor-pointer group transition-colors"
            >
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={(e) => column.toggleVisibility(e.target.checked)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      column.toggleVisibility(!column.getIsVisible());
                      e.preventDefault();
                    }
                  }}
                  className="peer h-4 w-4 shrink-0 rounded border-linen-200 text-teal-600 focus:ring-teal-500/20 transition-all cursor-pointer"
                />
              </div>
              <span className="text-sm text-neutral-600 group-hover:text-ink-900 transition-colors uppercase font-medium tracking-wider">
                {displayName}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
