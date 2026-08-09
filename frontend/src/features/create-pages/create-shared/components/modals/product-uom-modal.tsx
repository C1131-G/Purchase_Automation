// ProductUomModal: Displays available units of measure for selection.
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";

import { AnimatedModalShell } from "@/features/create-pages/create-shared/components/core/animated-modal-shell";
import { SuggestionList } from "@/features/create-pages/create-shared/components/core/suggestion-list";
import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";

interface ProductUomModalProps {
  open: ComponentProps<typeof AnimatedModalShell>["open"];
  product: { code: string; name: string } | null;
  uoms: CreateLookupOption[];
  onClose: ComponentProps<typeof AnimatedModalShell>["onClose"];
  onAfterClose?: ComponentProps<typeof AnimatedModalShell>["onAfterClose"];
  onSelect: (item: CreateLookupOption) => void;
  initialSearch?: string;
  onSearchChange?: (value: string) => void;
}

export function ProductUomModal({
  open,
  product,
  uoms,
  onClose,
  onAfterClose,
  onSelect,
  initialSearch = "",
  onSearchChange,
}: ProductUomModalProps) {
  const [uomSearch, setUomSearch] = useState(initialSearch);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setUomSearch(initialSearch);
    }
    wasOpenRef.current = open;
  }, [open, initialSearch]);

  const safeUoms = useMemo(() => (Array.isArray(uoms) ? uoms : []), [uoms]);

  const filteredUoms = useMemo(() => {
    const term = uomSearch.trim().toLowerCase();
    if (!term) {
      return safeUoms;
    }
    return safeUoms.filter((uomItem) => uomItem.code.toLowerCase().includes(term));
  }, [safeUoms, uomSearch]);

  const suggestionItems = useMemo(
    () =>
      filteredUoms.map((uomItem) => ({
        code: uomItem.code,
        name: uomItem.name,
        uomEntry: uomItem.uomEntry,
      })),
    [filteredUoms],
  );

  return (
    <AnimatedModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-xl"
      onAfterClose={onAfterClose}
    >
      <div className="flex items-center justify-between border-b border-linen-100 px-4 py-3">
        <div className="min-w-0 flex-1 pr-4">
          <h3 className="truncate text-sm font-semibold text-ink-900">Select Unit of Measure</h3>
          <p className="truncate text-xs text-neutral-500">
            {product ? `${product.code} - ${product.name}` : "-"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 cursor-pointer rounded-full border border-linen-200 px-3 py-1 text-xs font-medium text-neutral-500 transition hover:bg-linen-100"
        >
          Close
        </button>
      </div>

      <div className="p-4">
        <input
          className="mb-3 h-10 w-full rounded-xl border border-linen-200 bg-linen-50 px-3 text-sm outline-none transition focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
          placeholder="Search UoM code"
          value={uomSearch}
          onChange={(event) => {
            const { value } = event.target;
            setUomSearch(value);
            onSearchChange?.(value);
          }}
          autoComplete="off"
        />

        <div className="mt-3">
          <SuggestionList
            items={suggestionItems}
            onSelect={(item) => {
              const matchedOrig = filteredUoms.find((u) => u.code === item.code);
              if (matchedOrig) {
                onSelect(matchedOrig);
              }
            }}
            emptyText={
              uomSearch.trim()
                ? `No UoM matches "${uomSearch.trim()}".`
                : "No UoM data available for this product."
            }
            showCode={false}
            codeOnly={true}
            codeLabel="UoM"
            floating={false}
            maxHeight="max-h-[300px]"
            query={uomSearch}
          />
        </div>
      </div>
    </AnimatedModalShell>
  );
}
