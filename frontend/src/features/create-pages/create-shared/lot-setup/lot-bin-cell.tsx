import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

import { Select } from "@/components/select/select";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";

const NONE_VALUE = "__none__";

interface LotBinCellProps {
  binAbsEntry?: number | undefined;
  binCode?: string | undefined;
  disabled?: boolean;
  onChange: (bin: { binAbsEntry?: number | undefined; binCode?: string | undefined }) => void;
  warehouseCode: string;
}

export function LotBinCell({
  binAbsEntry,
  binCode,
  disabled = false,
  onChange,
  warehouseCode,
}: LotBinCellProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const binsQuery = useQuery({
    ...createSharedQueries.warehouseBins(warehouseCode),
    enabled: Boolean(warehouseCode),
  });
  const options = binsQuery.data ?? [];
  const selectedValue = binAbsEntry ? String(binAbsEntry) : NONE_VALUE;
  const selectedLabel = useMemo(() => {
    if (binCode) {
      return binCode;
    }
    const match = options.find((item) => Number(item.code) === Number(binAbsEntry));
    return match?.name || "";
  }, [binAbsEntry, binCode, options]);
  const labelMap = useMemo(() => {
    const next: Record<string, string> = { [NONE_VALUE]: selectedLabel || "Select bin" };
    for (const item of options) {
      next[String(item.code)] = item.name;
    }
    if (binAbsEntry && selectedLabel) {
      next[String(binAbsEntry)] = selectedLabel;
    }
    return next;
  }, [binAbsEntry, options, selectedLabel]);

  const updateMenuPosition = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const width = Math.max(rect.width, 176);
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    setMenuStyle({
      left: Math.max(8, left),
      position: "fixed",
      top: rect.bottom + 4,
      width,
      zIndex: 80,
    });
  };

  useLayoutEffect(() => {
    updateMenuPosition();
  }, [options.length, selectedValue]);

  return (
    <div ref={wrapRef} onClick={updateMenuPosition}>
      <Select
        disabled={disabled || !warehouseCode}
        onValueChange={(next) => {
          if (next === NONE_VALUE) {
            onChange({ binAbsEntry: undefined, binCode: undefined });
            return;
          }
          const match = options.find((item) => String(item.code) === next);
          if (!match) {
            return;
          }
          onChange({ binAbsEntry: Number(match.code), binCode: match.name });
        }}
        value={selectedValue}
      >
        <Select.Trigger aria-label="Bin location" className="h-8 rounded-md px-2 py-0 text-xs">
          <Select.Value labelMap={labelMap} placeholder="Select bin" />
          <Select.Icon rotate={180}>
            <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
          </Select.Icon>
        </Select.Trigger>
        {typeof document !== "undefined"
          ? createPortal(
              <div style={menuStyle}>
                <Select.Positioner className="relative top-auto mt-0 w-full">
                  <Select.Popup className="border border-linen-200/80 bg-surface p-1 shadow-lg">
                    <Select.List className="max-h-48 space-y-0.5 p-0">
                      <Select.Item label="Select bin" value={NONE_VALUE}>
                        <span className="text-xs text-neutral-400">Select bin</span>
                      </Select.Item>
                      {options.map((item) => (
                        <Select.Item key={item.code} label={item.name} value={String(item.code)}>
                          <span className="text-xs text-ink-900">{item.name}</span>
                        </Select.Item>
                      ))}
                    </Select.List>
                  </Select.Popup>
                </Select.Positioner>
              </div>,
              document.body,
            )
          : null}
      </Select>
    </div>
  );
}
