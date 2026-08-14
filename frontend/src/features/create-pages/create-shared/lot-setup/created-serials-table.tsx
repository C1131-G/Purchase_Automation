import { LotBinCell } from "@/features/create-pages/create-shared/lot-setup/lot-bin-cell";
import type {
  ProductRow,
  ProductSerialAllocation,
} from "@/features/create-pages/create-shared/utils/create-order.types";

interface CreatedSerialsTableProps {
  binRequired: boolean;
  onChange: (index: number, patch: Partial<ProductSerialAllocation>) => void;
  row: ProductRow | null;
}

export function CreatedSerialsTable({ binRequired, onChange, row }: CreatedSerialsTableProps) {
  const serials = row?.serialNumbers ?? [];

  return (
    <div className="overflow-auto rounded-xl border border-linen-200">
      <table className="w-full min-w-[820px] table-fixed text-left text-xs text-ink-900">
        <caption className="sr-only">Created serial numbers</caption>
        <thead className="bg-linen-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="w-10 px-2 py-2">#</th>
            <th className="w-[28%] px-2 py-2">Serial Number</th>
            <th className="w-[10%] px-2 py-2">Qty</th>
            {binRequired ? <th className="w-[22%] px-2 py-2">Bin Location</th> : null}
            <th className="w-[18%] px-2 py-2">Expiration Date</th>
          </tr>
        </thead>
        <tbody>
          {serials.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-center text-neutral-500" colSpan={binRequired ? 5 : 4}>
                Select a document row to create serial numbers.
              </td>
            </tr>
          ) : null}
          {serials.map((serial, index) => (
            <tr key={`serial-${index}`} className="border-t border-linen-100">
              <td className="px-2 py-1.5">{index + 1}</td>
              <td className="px-2 py-1.5">
                <input
                  aria-label={`Serial number ${index + 1}`}
                  className="h-8 w-full rounded-md border border-linen-200 bg-field-silver px-2 text-xs outline-none focus:border-teal-400 focus:bg-surface"
                  maxLength={36}
                  onChange={(event) =>
                    onChange(index, { internalSerialNumber: event.target.value })
                  }
                  value={serial.internalSerialNumber}
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  aria-label={`Serial quantity ${index + 1}`}
                  className="h-8 w-full rounded-md border border-linen-200 bg-linen-50 px-2 text-xs text-neutral-600"
                  disabled
                  readOnly
                  type="number"
                  value={1}
                />
              </td>
              {binRequired ? (
                <td className="px-2 py-1.5">
                  <LotBinCell
                    binAbsEntry={serial.binAbsEntry}
                    binCode={serial.binCode}
                    onChange={(bin) => onChange(index, bin)}
                    warehouseCode={row?.warehouseCode ?? ""}
                  />
                </td>
              ) : null}
              <td className="px-2 py-1.5">
                <input
                  aria-label={`Serial expiry ${index + 1}`}
                  className="h-8 w-full rounded-md border border-linen-200 bg-field-silver px-2 text-xs outline-none focus:border-teal-400 focus:bg-surface"
                  onChange={(event) =>
                    onChange(index, { expiryDate: event.target.value || undefined })
                  }
                  type="date"
                  value={serial.expiryDate ?? ""}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
