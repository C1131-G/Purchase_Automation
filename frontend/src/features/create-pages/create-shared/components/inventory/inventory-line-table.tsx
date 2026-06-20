import { Plus, Trash2 } from "lucide-react";

type ColumnAlign = "left" | "right" | "center";

export interface TableRow {
  id: string;
  [key: string]: any;
}

interface BaseInventoryColumn<T extends TableRow> {
  key: keyof T;
  label: string;
  width: string;
  align?: ColumnAlign;
}

interface EditableInventoryColumn<T extends TableRow> extends BaseInventoryColumn<T> {
  type: "text" | "number";
  placeholder?: string;
}

interface ComputedInventoryColumn<T extends TableRow> extends BaseInventoryColumn<T> {
  type: "computed";
  compute: (row: T) => string;
}

export type InventoryColumn<T extends TableRow> =
  | EditableInventoryColumn<T>
  | ComputedInventoryColumn<T>;

interface InventoryLineTableProps<T extends TableRow> {
  rows: T[];
  onRowsChange: (rows: T[]) => void;
  defaultRow: T;
  columns: InventoryColumn<T>[];
  showGrandTotal?: boolean;
  getGrandTotal?: (rows: T[]) => number;
  minWidth?: string;
}

export function InventoryLineTable<T extends TableRow>({
  rows,
  onRowsChange,
  defaultRow,
  columns,
  showGrandTotal = false,
  getGrandTotal,
  minWidth = "1000px",
}: InventoryLineTableProps<T>) {
  const computedColumns = columns.filter(
    (col): col is ComputedInventoryColumn<T> => col.type === "computed",
  );

  const recomputeRow = (row: T): T => {
    if (computedColumns.length === 0) return row;
    const updated = { ...row } as Record<string, unknown>;
    for (const col of computedColumns) {
      updated[col.key as string] = col.compute(row);
    }
    return updated as T;
  };

  const handleAddRow = () => {
    onRowsChange([...rows, recomputeRow(defaultRow)]);
  };

  const handleRemoveRow = (id: string) => {
    onRowsChange(rows.filter((r) => r.id !== id));
  };

  const updateRowField = (id: string, field: keyof T, value: unknown) => {
    const updated = rows.map((row) => {
      if (row.id !== id) return row;
      const changed = { ...row, [field]: value } as T;
      return recomputeRow(changed);
    });
    onRowsChange(updated);
  };

  const grandTotal = showGrandTotal && getGrandTotal ? getGrandTotal(rows) : 0;

  const alignClass = (align?: ColumnAlign) => {
    switch (align) {
      case "right":
        return "text-right";
      case "center":
        return "text-center";
      default:
        return "text-left";
    }
  };

  const colSpan = columns.length + 2;

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-700" style={{ minWidth }}>
          <thead className="bg-zinc-50 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            <tr>
              <th className="w-[4%] px-2 py-3 text-center">#</th>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{ width: col.width }}
                  className={`px-2 py-3 font-semibold text-zinc-500 ${alignClass(col.align)}`}
                >
                  {col.label}
                </th>
              ))}
              <th className="w-[5%] px-2 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-10">
                  <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center">
                    <div className="text-sm font-medium text-zinc-700">No items added yet</div>
                    <div className="text-xs text-zinc-500">Click the button below to add rows.</div>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} className="transition duration-150 hover:bg-zinc-50/50">
                  <td className="px-2 py-2 text-center font-medium text-zinc-400">{idx + 1}</td>
                  {columns.map((col) => {
                    if (col.type === "computed") {
                      return (
                        <td
                          key={String(col.key)}
                          className={`px-2 py-2 font-medium text-zinc-900 ${alignClass(col.align)}`}
                        >
                          {col.compute(row)}
                        </td>
                      );
                    }

                    const value = row[col.key];
                    const isNumber = col.type === "number";

                    return (
                      <td key={String(col.key)} className="px-2 py-2">
                        <input
                          type={isNumber ? "number" : "text"}
                          className={`h-9 w-full rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 ${alignClass(col.align)}`}
                          value={
                            isNumber && (value === 0 || value === undefined)
                              ? ""
                              : (value as string | number)
                          }
                          min={isNumber ? 0 : undefined}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const parsed = isNumber ? parseFloat(raw) || 0 : raw;
                            updateRowField(row.id, col.key, parsed);
                          }}
                          placeholder={col.placeholder}
                          aria-label={`${col.label} row ${idx + 1}`}
                        />
                      </td>
                    );
                  })}

                  {/* Action buttons */}
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove row ${idx + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleAddRow}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </button>

        {showGrandTotal && (
          <div className="pr-4 text-right">
            <span className="mr-2 text-xs font-medium text-zinc-500">Grand Total:</span>
            <span className="text-sm font-bold text-zinc-900">FJD {grandTotal.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
