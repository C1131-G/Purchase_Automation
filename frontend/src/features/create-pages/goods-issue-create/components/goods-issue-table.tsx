import { Plus, Trash2 } from "lucide-react";
import type { GoodsIssueRow } from "@/features/create-pages/goods-issue-create/types/goods-issue.types";

interface GoodsIssueTableProps {
  rows: GoodsIssueRow[];
  onRowsChange: (rows: GoodsIssueRow[]) => void;
}

const COLUMNS = [
  { key: "itemNo", label: "Item No.", width: "12%" },
  { key: "itemDescription", label: "Item Description", width: "24%" },
  { key: "uomCode", label: "UoM Code", width: "9%" },
  { key: "uomName", label: "UoM Name", width: "9%" },
  { key: "whse", label: "Whse", width: "7%" },
  { key: "quantity", label: "Quantity", width: "8%" },
  { key: "binLocationAllocation", label: "Bin Location Allocation", width: "12%" },
  { key: "accountCode", label: "Account Code", width: "9%" },
  { key: "itemCost", label: "Item Cost", width: "10%" },
];

export function GoodsIssueTable({ rows, onRowsChange }: GoodsIssueTableProps) {
  const handleAddRow = () => {
    const newRow: GoodsIssueRow = {
      id: String(Date.now()),
      itemNo: "",
      itemDescription: "",
      uomCode: "",
      uomName: "",
      whse: "",
      quantity: 1,
      binLocationAllocation: 0,
      accountCode: "",
      itemCost: "",
    };
    onRowsChange([...rows, newRow]);
  };

  const handleRemoveRow = (id: string) => {
    onRowsChange(rows.filter((r) => r.id !== id));
  };

  const updateRowField = (id: string, field: keyof GoodsIssueRow, value: any) => {
    const updated = rows.map((r) => (r.id === id ? { ...r, [field]: value } : r));
    onRowsChange(updated);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-xs text-zinc-700">
          <thead className="bg-zinc-50 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            <tr>
              <th className="w-[4%] px-2 py-3 text-center">#</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className="px-2 py-3 font-semibold text-zinc-500"
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
                <td colSpan={COLUMNS.length + 2} className="px-3 py-10">
                  <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center">
                    <div className="text-sm font-medium text-zinc-700">No items added yet</div>
                    <div className="text-xs text-zinc-500">Click the button below to add rows.</div>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-zinc-50/50 transition duration-150">
                  <td className="px-2 py-2 text-center font-medium text-zinc-400">{idx + 1}</td>

                  {/* Item No */}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      className="h-9 w-full rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                      value={row.itemNo}
                      onChange={(e) => updateRowField(row.id, "itemNo", e.target.value)}
                      placeholder="Item No."
                      aria-label={`Item No row ${idx + 1}`}
                    />
                  </td>

                  {/* Item Description */}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      className="h-9 w-full rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                      value={row.itemDescription}
                      onChange={(e) => updateRowField(row.id, "itemDescription", e.target.value)}
                      placeholder="Description"
                      aria-label={`Item Description row ${idx + 1}`}
                    />
                  </td>

                  {/* UoM Code */}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      className="h-9 w-full rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                      value={row.uomCode}
                      onChange={(e) => updateRowField(row.id, "uomCode", e.target.value)}
                      placeholder="UoM Code"
                      aria-label={`UoM Code row ${idx + 1}`}
                    />
                  </td>

                  {/* UoM Name */}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      className="h-9 w-full rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                      value={row.uomName}
                      onChange={(e) => updateRowField(row.id, "uomName", e.target.value)}
                      placeholder="UoM Name"
                      aria-label={`UoM Name row ${idx + 1}`}
                    />
                  </td>

                  {/* Whse */}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      className="h-9 w-full rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                      value={row.whse}
                      onChange={(e) => updateRowField(row.id, "whse", e.target.value)}
                      placeholder="Whse"
                      aria-label={`Warehouse row ${idx + 1}`}
                    />
                  </td>

                  {/* Quantity */}
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      className="h-9 w-full rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 text-right"
                      value={row.quantity}
                      min={0}
                      onChange={(e) =>
                        updateRowField(row.id, "quantity", parseFloat(e.target.value) || 0)
                      }
                      placeholder="Qty"
                      aria-label={`Quantity row ${idx + 1}`}
                    />
                  </td>

                  {/* Bin Location Allocation */}
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      className="h-9 w-full rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 text-center"
                      value={row.binLocationAllocation || ""}
                      onChange={(e) =>
                        updateRowField(
                          row.id,
                          "binLocationAllocation",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      placeholder="Bin"
                      aria-label={`Bin Location row ${idx + 1}`}
                    />
                  </td>

                  {/* Account Code */}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      className="h-9 w-full rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                      value={row.accountCode}
                      onChange={(e) => updateRowField(row.id, "accountCode", e.target.value)}
                      placeholder="Account"
                      aria-label={`Account Code row ${idx + 1}`}
                    />
                  </td>

                  {/* Item Cost */}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      className="h-9 w-full rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 text-right"
                      value={row.itemCost}
                      onChange={(e) => updateRowField(row.id, "itemCost", e.target.value)}
                      placeholder="Cost"
                      aria-label={`Item Cost row ${idx + 1}`}
                    />
                  </td>

                  {/* Action buttons */}
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600 transition"
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
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-zinc-300 bg-white hover:bg-zinc-50 hover:border-zinc-400 px-4 py-2 text-xs font-semibold text-zinc-700 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </button>
      </div>
    </div>
  );
}
