import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";

interface LotBinCellProps {
  binAbsEntry?: number | undefined;
  binCode?: string | undefined;
  disabled?: boolean;
  onChange: (bin: { binAbsEntry: number; binCode: string }) => void;
  warehouseCode: string;
}

export function LotBinCell({
  binAbsEntry,
  binCode,
  disabled = false,
  onChange,
  warehouseCode,
}: LotBinCellProps) {
  const [open, setOpen] = useState(false);
  const binsQuery = useQuery({
    ...createSharedQueries.warehouseBins(warehouseCode),
    enabled: Boolean(warehouseCode) && (open || Boolean(binAbsEntry)),
  });
  const options = binsQuery.data ?? [];
  const selectedLabel = useMemo(() => {
    if (binCode) {
      return binCode;
    }
    const match = options.find((item) => Number(item.code) === Number(binAbsEntry));
    return match?.name || "";
  }, [binAbsEntry, binCode, options]);

  return (
    <label className="block">
      <span className="sr-only">Bin location</span>
      <select
        className="h-8 w-full rounded-md border border-linen-200 bg-surface px-1.5 text-xs text-ink-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
        disabled={disabled || !warehouseCode}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          const absEntry = Number(event.target.value);
          const match = options.find((item) => Number(item.code) === absEntry);
          if (!match) {
            return;
          }
          onChange({ binAbsEntry: absEntry, binCode: match.name });
        }}
        onFocus={() => setOpen(true)}
        value={binAbsEntry ? String(binAbsEntry) : ""}
      >
        <option value="">{selectedLabel || "Select bin"}</option>
        {options.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}
