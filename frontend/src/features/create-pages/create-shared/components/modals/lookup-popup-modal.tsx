/** LookupPopupModal: Generic searchable dialog for high-volume master data selection. */
import type { ComponentProps } from "react";

import { LookupPopup } from "@/components/lookup/lookup-popup";
import type { LookupPopupMode } from "@/components/lookup/lookup-popup";
import type { AnimatedModalShell } from "@/features/create-pages/create-shared/components/core/animated-modal-shell";
import type {
  LookupOption,
  PopupMode,
} from "@/features/create-pages/create-shared/utils/create-order.types";

interface LookupPopupModalProps {
  open: ComponentProps<typeof AnimatedModalShell>["open"];
  mode: PopupMode;
  search: string;
  results: LookupOption[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onSearchChange: (value: string) => void;
  onSearchSync?: (mode: PopupMode, value: string) => void;
  onClose: ComponentProps<typeof AnimatedModalShell>["onClose"];
  onSelect: (vendor: LookupOption) => void;
}

export function LookupPopupModal({
  open,
  mode,
  search,
  results,
  loading,
  error,
  onRetry,
  onSearchChange,
  onSearchSync,
  onClose,
  onSelect,
}: LookupPopupModalProps) {
  const modeMap: Record<PopupMode, LookupPopupMode> = {
    branch: "branch",
    series: "series",
    "sales-employee": "sales-employee",
    "vendor-code": "vendor-code",
    "vendor-name": "vendor-name",
    warehouse: "warehouse",
  };

  return (
    <LookupPopup
      open={open}
      mode={modeMap[mode]}
      showBothColumns={mode === "vendor-name" || mode === "vendor-code"}
      search={search}
      results={results}
      loading={loading}
      error={error}
      {...(onRetry ? { onRetry } : {})}
      onSearchChange={(value) => {
        onSearchChange(value);
        onSearchSync?.(mode, value);
      }}
      onClose={onClose}
      onSelect={onSelect}
    />
  );
}
