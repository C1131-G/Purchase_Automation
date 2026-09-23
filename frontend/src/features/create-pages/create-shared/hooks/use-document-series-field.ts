/**
 * Header numbering series: suggest the series whose Remarks equals the warehouse's
 * SAP location AND whose branch equals the document branch; user can switch via lookup.
 * No series matching both → empty (SAP default series). Edit mode shows the assigned series (locked).
 */
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import {
  formatSeriesDisplay,
  suggestSeries,
  toPositiveSeries,
  type SeriesLookupItem,
} from "@/features/create-pages/create-shared/utils/document-series";
import { rankAndLimitLookupOptions } from "@/features/create-pages/create-shared/utils/rank-lookup-options";

type UseDocumentSeriesFieldArgs = {
  objectCode: string;
  /** SAP location of the document warehouse (OWHS.Location → OLCT.Location). */
  location?: string | null | undefined;
  warehouseCode?: string | null | undefined;
  warehouseName?: string | null | undefined;
  /** Document branch (header branch field → warehouse BPLid). */
  branchId?: number | null | undefined;
  series: number | null | undefined;
  setSeries: (series: number | null) => void;
  enabled?: boolean;
  disabled?: boolean;
  /** When true, do not auto-pick (edit hydrate owns the value). */
  lockSuggestion?: boolean;
  /** Edit: show this document's number next to the series name (not SAP next unused). */
  documentNumber?: number | string | null | undefined;
};

export function useDocumentSeriesField({
  objectCode,
  location,
  warehouseCode,
  warehouseName,
  branchId,
  series,
  setSeries,
  enabled = true,
  disabled = false,
  lockSuggestion = false,
  documentNumber,
}: UseDocumentSeriesFieldArgs) {
  const seriesQuery = useQuery({
    ...createSharedQueries.series(objectCode),
    enabled: enabled && Boolean(objectCode),
  });

  const seriesList = useMemo(
    () => (seriesQuery.data ?? []) as SeriesLookupItem[],
    [seriesQuery.data],
  );

  const [seriesInput, setSeriesInput] = useState("");
  const [seriesFocused, setSeriesFocused] = useState(false);
  const lastContextRef = useRef<string | null>(null);
  const userOverrideRef = useRef(false);

  const displayForSeries = useCallback(
    (id: number) => {
      const matched = seriesList.find((item) => toPositiveSeries(item.code) === id);
      // Create: next unused. Edit: this document's number, never SAP's next unused.
      const numberForDisplay = disabled ? toPositiveSeries(documentNumber) : matched?.nextNumber;
      return formatSeriesDisplay(matched?.name ?? "", numberForDisplay, id);
    },
    [disabled, documentNumber, seriesList],
  );

  const applySeries = useCallback(
    (id: number | null) => {
      setSeries(id);
      if (id == null) {
        setSeriesInput("");
        return;
      }
      setSeriesInput(displayForSeries(id));
    },
    [displayForSeries, setSeries],
  );

  const selectSeries = useCallback(
    (item: { code: string; name: string; nextNumber?: number | null | undefined }) => {
      const id = toPositiveSeries(item.code);
      userOverrideRef.current = true;
      setSeries(id);
      setSeriesInput(formatSeriesDisplay(item.name, item.nextNumber, item.code));
      setSeriesFocused(false);
    },
    [setSeries],
  );

  const handleSeriesChange = useCallback(
    (value: string) => {
      setSeriesInput(value);
      userOverrideRef.current = true;
      if (!value.trim()) {
        setSeries(null);
        setSeriesFocused(true);
        return;
      }
      // Typing is search-only. A series is committed only by selecting a suggestion
      // or a lookup-popup row.
      setSeries(null);
      setSeriesFocused(true);
    },
    [selectSeries, seriesList, setSeries],
  );

  // Auto-suggest the series for warehouse location + branch. User can switch afterward.
  useEffect(() => {
    const warehouseLocation = String(location ?? "").trim() || null;
    const branch = toPositiveSeries(branchId);
    const context = `${warehouseLocation ?? ""}|${warehouseCode ?? ""}|${warehouseName ?? ""}|${branch ?? ""}`;
    if (lastContextRef.current !== context) {
      lastContextRef.current = context;
      if (!lockSuggestion) {
        userOverrideRef.current = false;
      }
    }

    if (lockSuggestion || userOverrideRef.current || disabled) {
      return;
    }

    if (seriesList.length === 0) {
      return;
    }

    const suggested = suggestSeries(
      seriesList,
      warehouseLocation,
      branch,
      warehouseCode,
      warehouseName,
    );
    const suggestedId = suggested ? toPositiveSeries(suggested.code) : null;
    const current = toPositiveSeries(series);

    // No series for this location + branch → leave empty so SAP applies its default series.
    if (suggestedId == null) {
      if (current != null) {
        applySeries(null);
      }
      return;
    }
    if (suggestedId === current) {
      if (!seriesFocused) {
        const display = displayForSeries(suggestedId);
        if (seriesInput !== display) {
          setSeriesInput(display);
        }
      }
      return;
    }
    applySeries(suggestedId);
  }, [
    applySeries,
    branchId,
    disabled,
    location,
    warehouseCode,
    warehouseName,
    displayForSeries,
    lockSuggestion,
    series,
    seriesFocused,
    seriesInput,
    seriesList,
  ]);

  // Refresh label when series id is known (edit hydrate). Show "Series {id}"
  // immediately; upgrade to the NNM1 name once the lookup list loads.
  useEffect(() => {
    const id = toPositiveSeries(series);
    if (id == null || seriesFocused) {
      return;
    }
    const display = displayForSeries(id);
    if (seriesInput !== display) {
      setSeriesInput(display);
    }
  }, [displayForSeries, series, seriesFocused, seriesInput]);

  const seriesSuggestions = useMemo(
    () =>
      rankAndLimitLookupOptions(
        seriesList.map((item) => ({
          ...item,
          name: formatSeriesDisplay(item.name, item.nextNumber, item.code),
        })),
        seriesInput,
      ),
    [seriesList, seriesInput],
  );

  const selected = seriesList.find(
    (item) => toPositiveSeries(item.code) === toPositiveSeries(series),
  );
  const seriesNextNumber = toPositiveSeries(selected?.nextNumber);
  const seriesLoaded = !seriesQuery.isLoading && !seriesQuery.isFetching;
  const noSeriesAvailable = seriesLoaded && seriesList.length === 0;

  return {
    seriesInput,
    setSeriesInput,
    seriesFocused,
    setSeriesFocused,
    seriesSuggestions: noSeriesAvailable ? [] : seriesSuggestions,
    seriesList,
    seriesQuery,
    selectSeries,
    handleSeriesChange,
    seriesPlaceholder: noSeriesAvailable ? "No series" : "Select series",
    seriesDisabled: disabled || noSeriesAvailable,
    seriesNextNumber,
    effectiveSeries: toPositiveSeries(series),
    showSeries: true,
    seriesGridProps: {
      showSeries: true as const,
      seriesDisabled: disabled || noSeriesAvailable,
      seriesFocused: disabled ? false : seriesFocused,
      seriesInput,
      seriesLoading: seriesQuery.isLoading,
      seriesPlaceholder: noSeriesAvailable ? "No series" : "Select series",
      seriesSuggestions: disabled || noSeriesAvailable ? [] : seriesSuggestions,
      onSeriesBlur: () => {
        if (toPositiveSeries(series) == null && seriesInput.trim()) {
          setSeriesInput("");
        }
        setSeriesFocused(false);
      },
      onSeriesChange: disabled ? () => {} : handleSeriesChange,
      onSeriesFocus: disabled ? () => {} : () => setSeriesFocused(true),
      onSelectSeries: disabled ? () => {} : selectSeries,
    },
  };
}
