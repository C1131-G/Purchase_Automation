/**
 * Header branch field: free switch; suggest from warehouse BPLid when WH changes.
 * Empty when no branch (no fake "auto" text).
 */
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import {
  branchIdFromWarehouse,
  formatBranchDisplay,
  shouldShowDocumentBranch,
  toPositiveBranchId,
  type BranchLookupItem,
  type WarehouseWithBranch,
} from "@/features/create-pages/create-shared/utils/document-branch";
import { rankAndLimitLookupOptions } from "@/features/create-pages/create-shared/utils/rank-lookup-options";
import {
  filterLocationLookupOptions,
  findBranchSelection,
} from "@/features/create-pages/create-shared/utils/location-lookup";

type UseDocumentBranchFieldArgs = {
  warehouses: WarehouseWithBranch[];
  warehouseCode: string | null | undefined;
  /** Controlled header branch id (store). */
  branchId: number | null | undefined;
  setBranchId: (branchId: number | null) => void;
  /** When false, skip OBPL fetch. */
  enabled?: boolean;
  disabled?: boolean;
};

export function useDocumentBranchField({
  warehouses,
  warehouseCode,
  branchId,
  setBranchId,
  enabled = true,
  disabled = false,
}: UseDocumentBranchFieldArgs) {
  const branchesQuery = useQuery({
    ...createSharedQueries.branches(),
    enabled,
  });

  const branches = useMemo(
    () => (branchesQuery.data ?? []) as BranchLookupItem[],
    [branchesQuery.data],
  );

  // Always show (Ajax + RCM); empty until warehouse auto-fill or user select.
  const showBranch = shouldShowDocumentBranch(branches, warehouses);

  const [branchInput, setBranchInput] = useState("");
  const [branchFocused, setBranchFocused] = useState(false);
  /** Last warehouse code we auto-applied from — reset override when WH changes. */
  const lastAutoWhRef = useRef<string>("");
  const userOverrideRef = useRef(false);

  const displayForId = useCallback(
    (id: number) => {
      const matched = branches.find((b) => toPositiveBranchId(b.branchId ?? b.code) === id);
      return matched
        ? formatBranchDisplay(matched.name, matched.code)
        : formatBranchDisplay(`Branch ${id}`, id);
    },
    [branches],
  );

  const applyBranch = useCallback(
    (id: number | null) => {
      setBranchId(id);
      if (id == null) {
        setBranchInput("");
        return;
      }
      setBranchInput(displayForId(id));
    },
    [displayForId, setBranchId],
  );

  const selectBranch = useCallback(
    (item: { code: string; name: string }) => {
      const id = toPositiveBranchId(item.code);
      userOverrideRef.current = true;
      setBranchId(id);
      setBranchInput(formatBranchDisplay(item.name, item.code));
      setBranchFocused(false);
    },
    [setBranchId],
  );

  const findBranch = useCallback(
    (value: string) => {
      return findBranchSelection(branches, value);
    },
    [branches],
  );

  const handleBranchChange = useCallback(
    (value: string) => {
      setBranchInput(value);
      userOverrideRef.current = true;
      if (!value.trim()) {
        setBranchId(null);
        setBranchFocused(true);
        return;
      }
      const matched = findBranch(value);
      if (matched) {
        selectBranch(matched);
        return;
      }
      // Keep the edited text visible, but detach the stale selected branch
      // until the user chooses a matching suggestion.
      setBranchId(null);
      setBranchFocused(true);
    },
    [findBranch, selectBranch, setBranchId],
  );

  // When warehouse changes, fill branch from WH BPLid (or clear if WH has none).
  // User can freely change branch afterward until the next warehouse change.
  useEffect(() => {
    const wh = String(warehouseCode ?? "").trim();
    if (wh !== lastAutoWhRef.current) {
      lastAutoWhRef.current = wh;
      userOverrideRef.current = false;
    }

    if (userOverrideRef.current) {
      return;
    }

    // No warehouse selected → leave branch empty / user-cleared; do not invent a value.
    if (!wh) {
      const current = toPositiveBranchId(branchId);
      if (current != null || branchInput !== "") {
        applyBranch(null);
      }
      return;
    }

    // Warehouses not loaded yet, or WH not in list — do not wipe an existing branch.
    if (warehouses.length === 0) {
      return;
    }
    const whKnown = warehouses.some((w) => String(w.code).trim() === wh);
    if (!whKnown) {
      return;
    }

    const fromWh = branchIdFromWarehouse(warehouses, wh);
    const current = toPositiveBranchId(branchId);

    // Warehouse known but has no BPLid → show empty branch field.
    if (fromWh == null) {
      if (current != null || branchInput !== "") {
        applyBranch(null);
      }
      return;
    }

    if (fromWh === current) {
      if (!branchFocused) {
        const display = displayForId(fromWh);
        if (branchInput !== display) {
          setBranchInput(display);
        }
      }
      return;
    }
    applyBranch(fromWh);
  }, [warehouseCode, warehouses, branchId, branchFocused, branchInput, displayForId, applyBranch]);

  // Refresh label when OBPL list loads for current branchId.
  useEffect(() => {
    const id = toPositiveBranchId(branchId);
    if (id == null || branchFocused || branches.length === 0) {
      return;
    }
    const display = displayForId(id);
    if (branchInput !== display) {
      setBranchInput(display);
    }
  }, [branches, branchId, branchFocused, branchInput, displayForId]);

  const branchSuggestions = useMemo(
    () =>
      rankAndLimitLookupOptions(filterLocationLookupOptions(branches, branchInput), branchInput),
    [branches, branchInput],
  );

  const branchesLoaded = !branchesQuery.isLoading && !branchesQuery.isFetching;
  /** No OBPL rows (or still empty after load) — user cannot set a branch. */
  const noBranchAvailable = branchesLoaded && branches.length === 0;
  const branchPlaceholder = "No Branch";

  return {
    showBranch,
    branchInput,
    setBranchInput,
    branchFocused,
    setBranchFocused,
    branchSuggestions: noBranchAvailable ? [] : branchSuggestions,
    branches,
    branchesQuery,
    selectBranch,
    handleBranchChange,
    branchPlaceholder,
    /** Disabled when form locked or company has no branches to pick. */
    branchDisabled: disabled || noBranchAvailable,
    effectiveBranchId: toPositiveBranchId(branchId),
  };
}
