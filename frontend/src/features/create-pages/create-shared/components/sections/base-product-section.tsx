import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Lock,
  Plus,
  RefreshCw,
  Save,
  ChevronUp,
  Eye,
  CheckSquare,
  FileText,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { useState, useRef, useEffect, type ReactNode } from "react";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import { SearchAndImportMenu } from "./search-and-import-menu";
import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-zinc-100 ${className}`} />;
}

interface BaseProductSectionProps {
  sectionId?: string | undefined;
  title?: string | undefined;

  // Search Action
  onSearchProducts: () => void;
  onPrefetchProducts?: (() => void) | undefined;
  searchLabel?: string | undefined;
  hideSearch?: boolean | undefined;
  allowSearchInEditMode?: boolean | undefined;

  // Validation Hints (Search)
  showRequiredHints?: boolean | undefined;
  missingSearchFields?: string[] | undefined;
  searchCompletionPercent?: number | undefined;
  searchFieldsTotal?: number | undefined;
  requiredFieldLabels?: Record<string, string> | undefined;

  // Main Table Area
  children: ReactNode;

  // Loading state for edit hydration
  loading?: boolean | undefined;

  // Totals
  totals: {
    taxTotal: number;
    netTotal: number;
    grandTotal: number;
  };
  currencyLabel?: string | null | undefined;
  createError?: string | null | undefined;

  // Footer Actions
  backToUrl: string;
  backToLabel?: string | undefined;
  submitLabel: string;
  submitLoadingText: string;
  isSubmitting: boolean;
  onSubmit: () => void;
  onSubmitMode?: ((mode: "save-new" | "view" | "close" | "draft") => void) | undefined;
  isSaved?: boolean | undefined;
  savedDocNum?: string | number | null | undefined;
  onDownload?: ((type: "pdf" | "excel" | "word") => void) | undefined;
  onReset?: (() => void) | undefined;

  // Validation Hints (Submit)
  disabledReason?: string | null | undefined;
  missingMandatoryFields?: string[] | undefined;
  mandatoryCompletionPercent?: number | undefined;
  mandatoryFieldsTotal?: number | undefined;
  isEditMode?: boolean | undefined;
  secondaryActions?: ReactNode | undefined;
  showSubmitButton?: boolean | undefined;
  isReadOnly?: boolean | undefined;
  submitDisabled?: boolean | undefined;
  customSearchAction?: ReactNode | undefined;
  productRows?: ProductRow[] | undefined;
  setProductRows?:
    | ((rows: ProductRow[] | ((prev: ProductRow[]) => ProductRow[])) => void)
    | undefined;
  vendorName?: string | undefined;
  vendorCode?: string | undefined;
  defaultWarehouseCode?: string | undefined;
}

/**
 * BaseProductSection: Shared container for Entity Product tables.
 * Centralizes header actions, totals display, and footer navigation/submission.
 */
export function BaseProductSection({
  sectionId,
  title = "Product Details",
  onSearchProducts,
  onPrefetchProducts,
  searchLabel = "Search Products",
  showRequiredHints = true,
  missingSearchFields = [],
  searchCompletionPercent = 0,
  searchFieldsTotal = 0,
  requiredFieldLabels = {},
  children,
  loading = false,
  totals,
  currencyLabel,
  createError,
  backToUrl,
  backToLabel = "Back to Table",
  submitLabel,
  submitLoadingText,
  isSubmitting,
  onSubmit,
  onSubmitMode,
  isSaved = false,
  savedDocNum = null,
  onDownload,
  onReset,
  disabledReason,
  missingMandatoryFields = [],
  mandatoryCompletionPercent = 0,
  mandatoryFieldsTotal = 0,
  secondaryActions,
  showSubmitButton = true,
  isEditMode = false,
  hideSearch = false,
  submitDisabled = false,
  allowSearchInEditMode = false,
  isReadOnly = false,
  customSearchAction,
  productRows,
  setProductRows,
  vendorName,
  vendorCode,
  defaultWarehouseCode,
}: BaseProductSectionProps) {
  const navigate = useNavigate();
  const effectiveHideSearch = hideSearch || (isEditMode && !allowSearchInEditMode);
  const isUpdateAction = submitLabel.toLowerCase().includes("update");
  const SubmitIcon = isUpdateAction ? RefreshCw : Save;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(target)) {
        setDownloadDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show skeleton when loading (edit hydration)
  if (loading) {
    return (
      <section id={sectionId} className="mt-3 rounded-2xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
          <h3 className="whitespace-nowrap text-sm font-medium text-zinc-800">
            <span className="inline-flex items-center gap-2">
              <span>{title}</span>
              {isReadOnly ? <Lock className="h-3 w-3 text-zinc-400" aria-hidden="true" /> : null}
            </span>
          </h3>
          {!effectiveHideSearch && <Pulse className="h-11 w-40 rounded-xl" />}
        </div>
        <div className="overflow-x-auto px-2 py-2">
          <table className="min-w-245 w-full text-left text-sm text-zinc-700">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                {[
                  "Product",
                  "Qty",
                  "Price",
                  "Disc %",
                  "Disc Amt",
                  "Net",
                  "Total",
                  "Comments",
                  "Actions",
                ].map((key) => (
                  <th key={key} className="whitespace-nowrap px-3 py-2">
                    <Pulse className="h-3 w-14" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["row-1", "row-2", "row-3"].map((rowKey) => (
                <tr key={rowKey} className="border-b border-zinc-100 last:border-b-0">
                  <td className="px-3 py-2">
                    <Pulse className="h-4 w-56" />
                  </td>
                  <td className="px-3 py-2">
                    <Pulse className="h-9 w-16 rounded-lg" />
                  </td>
                  <td className="px-3 py-2">
                    <Pulse className="h-4 w-16" />
                  </td>
                  <td className="px-3 py-2">
                    <Pulse className="h-9 w-16 rounded-lg" />
                  </td>
                  <td className="px-3 py-2">
                    <Pulse className="h-9 w-20 rounded-lg" />
                  </td>
                  <td className="px-3 py-2">
                    <Pulse className="h-4 w-16" />
                  </td>
                  <td className="px-3 py-2">
                    <Pulse className="h-4 w-20" />
                  </td>
                  <td className="px-3 py-2">
                    <Pulse className="h-9 w-36 rounded-lg" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Pulse className="ml-auto h-9 w-20 rounded-lg" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-zinc-100 px-4 py-3">
          <div className="ml-auto w-full max-w-sm">
            <div className="space-y-1">
              <div className="flex items-center justify-end gap-3 border-b border-zinc-200/80 py-1">
                <Pulse className="h-3 w-16" />
                <Pulse className="h-3 w-10" />
                <Pulse className="h-4 w-20" />
              </div>
              <div className="flex items-center justify-end gap-3 border-b border-zinc-200/80 py-1">
                <Pulse className="h-3 w-16" />
                <Pulse className="h-3 w-10" />
                <Pulse className="h-4 w-20" />
              </div>
              <div className="flex items-center justify-end gap-3 py-1">
                <Pulse className="h-3 w-20" />
                <Pulse className="h-3 w-10" />
                <Pulse className="h-5 w-20" />
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Pulse className="h-11 w-36 rounded-xl" />
            <div className="flex items-center gap-2">
              <Pulse className="h-11 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={sectionId} className="mt-3 rounded-2xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <h3 className="whitespace-nowrap text-sm font-medium text-zinc-800">
          <span className="inline-flex items-center gap-2">
            <span>{title}</span>
            {isReadOnly ? <Lock className="h-3 w-3 text-zinc-400" aria-hidden="true" /> : null}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {showRequiredHints &&
          !effectiveHideSearch &&
          missingSearchFields.length > 0 &&
          searchFieldsTotal > 0 ? (
            <Tooltip
              content={`Required fields: ${missingSearchFields.map((field) => requiredFieldLabels[field] ?? field).join(", ")}`}
              className="block w-auto max-w-none"
            >
              <span className="inline-flex cursor-help items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                <span>Required fields</span>
                <span
                  className="inline-block size-3 rounded-full border border-zinc-300"
                  style={{
                    background: `conic-gradient(#2563eb ${searchCompletionPercent}%, #e4e4e7 ${searchCompletionPercent}% 100%)`,
                  }}
                />
                <span>
                  {searchFieldsTotal - missingSearchFields.length}/{searchFieldsTotal}
                </span>
              </span>
            </Tooltip>
          ) : null}
          {customSearchAction
            ? customSearchAction
            : !effectiveHideSearch &&
              (productRows && setProductRows ? (
                <SearchAndImportMenu
                  onSearchProducts={onSearchProducts}
                  onPrefetchProducts={onPrefetchProducts}
                  productRows={productRows}
                  setProductRows={setProductRows}
                  defaultWarehouseCode={defaultWarehouseCode}
                  vendorName={vendorName}
                  vendorCode={vendorCode}
                />
              ) : (
                <button
                  type="button"
                  onClick={onSearchProducts}
                  onMouseEnter={onPrefetchProducts}
                  onFocus={onPrefetchProducts}
                  className="group inline-flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600"
                >
                  <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  {searchLabel}
                </button>
              ))}
        </div>
      </div>

      <div>{children}</div>

      <div className="border-t border-zinc-100 px-4 py-3">
        <div className="ml-auto w-full max-w-sm">
          <div className="space-y-1">
            <div className="flex items-center justify-end gap-3 border-b border-zinc-200/80 py-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Tax Total
              </span>
              {currencyLabel ? (
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-400">
                  {currencyLabel}
                </span>
              ) : null}
              <span className="min-w-20 text-right text-base font-semibold text-zinc-800">
                {totals.taxTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-end gap-3 border-b border-zinc-200/80 py-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Net Total
              </span>
              {currencyLabel ? (
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-400">
                  {currencyLabel}
                </span>
              ) : null}
              <span className="min-w-20 text-right text-base font-semibold text-zinc-800">
                {totals.netTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-end gap-3 py-1">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">
                Grand Total
              </span>
              {currencyLabel ? (
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  {currencyLabel}
                </span>
              ) : null}
              <span className="min-w-20 text-right text-lg font-bold text-zinc-900">
                {totals.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        {createError ? (
          <p className="mt-2 text-right text-xs font-medium text-red-600">{createError}</p>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            size="md"
            variant="outline"
            onClick={() => navigate({ search: { limit: 10, page: 1 }, to: backToUrl })}
            className="group h-11 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none"
          >
            <span className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              {backToLabel}
            </span>
          </Button>
          <div className="flex items-center gap-2">
            {disabledReason && !isSubmitting ? (
              showRequiredHints ? (
                missingMandatoryFields.length > 0 && mandatoryFieldsTotal > 0 ? (
                  <Tooltip
                    content={`Required fields: ${missingMandatoryFields.map((field) => requiredFieldLabels[field] ?? field).join(", ")}`}
                    className="block w-auto max-w-none"
                  >
                    <span className="inline-flex cursor-help items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                      <span>Required fields</span>
                      <span
                        className="inline-block size-3 rounded-full border border-zinc-300"
                        style={{
                          background: `conic-gradient(#2563eb ${mandatoryCompletionPercent}%, #e4e4e7 ${mandatoryCompletionPercent}% 100%)`,
                        }}
                      />
                      <span>
                        {mandatoryFieldsTotal - missingMandatoryFields.length}/
                        {mandatoryFieldsTotal}
                      </span>
                    </span>
                  </Tooltip>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                    <span className="inline-block size-2 rounded-full bg-amber-500" />
                    <span>Pick 1 product</span>
                  </span>
                )
              ) : null
            ) : null}
            {secondaryActions}
            {isSaved && savedDocNum && onDownload && (
              <div className="flex items-center gap-2">
                {onReset && (
                  <Button
                    type="button"
                    size="md"
                    variant="outline"
                    onClick={onReset}
                    className="group h-11 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none cursor-pointer flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4 text-blue-600 transition-transform duration-300 group-hover:rotate-180" />
                    Reset to Default
                  </Button>
                )}
                <div className="relative inline-block" ref={downloadDropdownRef}>
                  <Button
                    type="button"
                    size="md"
                    variant="outline"
                    onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
                    className="group h-11 w-40 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none flex items-center justify-between cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Download className="h-4 w-4 text-blue-600" />
                      Download
                    </span>
                    <ChevronUp
                      className="h-4 w-4 text-zinc-400 group-hover:text-blue-600 transition-transform duration-200"
                      style={{ transform: downloadDropdownOpen ? "rotate(180deg)" : "none" }}
                    />
                  </Button>

                  {downloadDropdownOpen && (
                    <div className="absolute bottom-full left-0 mb-2 z-50 w-40 rounded-2xl border border-zinc-200/80 bg-white/95 p-1.5 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.15)] backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDownloadDropdownOpen(false);
                          onDownload("pdf");
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-blue-600 cursor-pointer"
                      >
                        <FileText className="h-4 w-4 text-zinc-400" />
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDownloadDropdownOpen(false);
                          onDownload("excel");
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-blue-600 cursor-pointer"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-zinc-400" />
                        Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDownloadDropdownOpen(false);
                          onDownload("word");
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-blue-600 cursor-pointer"
                      >
                        <FileText className="h-4 w-4 text-zinc-400" />
                        Word
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {showSubmitButton &&
              (isEditMode ? (
                <Button
                  type="button"
                  size="md"
                  variant="outline"
                  isLoading={isSubmitting}
                  loadingText={submitLoadingText}
                  onClick={onSubmit}
                  disabled={submitDisabled || Boolean(disabledReason)}
                  className="group h-11 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <SubmitIcon
                      className={
                        isUpdateAction
                          ? "h-4 w-4 transition-all duration-300 group-hover:rotate-180 group-hover:text-blue-600"
                          : "h-4 w-4 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:text-blue-600"
                      }
                    />
                    {submitLabel}
                  </span>
                </Button>
              ) : (
                <div className="relative inline-block" ref={dropdownRef}>
                  <Button
                    type="button"
                    size="md"
                    variant="outline"
                    isLoading={isSubmitting}
                    loadingText="Adding..."
                    onClick={() => !isSubmitting && setDropdownOpen(!dropdownOpen)}
                    disabled={Boolean(disabledReason)}
                    className="group h-11 w-52 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none flex items-center justify-between cursor-pointer"
                  >
                    <span>Add</span>
                    <ChevronUp
                      className="h-4 w-4 text-zinc-400 group-hover:text-blue-600 transition-transform duration-200"
                      style={{ transform: dropdownOpen ? "rotate(180deg)" : "none" }}
                    />
                  </Button>

                  {dropdownOpen && (
                    <div className="absolute bottom-full right-0 mb-2 z-50 w-52 rounded-2xl border border-zinc-200/80 bg-white/95 p-1.5 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.15)] backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onSubmitMode?.("save-new");
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-blue-600 cursor-pointer"
                      >
                        <Plus className="h-4 w-4 text-zinc-400" />
                        Save New
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onSubmitMode?.("view");
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-blue-600 cursor-pointer"
                      >
                        <Eye className="h-4 w-4 text-zinc-400" />
                        Save View
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onSubmitMode?.("close");
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-blue-600 cursor-pointer"
                      >
                        <CheckSquare className="h-4 w-4 text-zinc-400" />
                        Save Close
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onSubmitMode?.("draft");
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-blue-600 cursor-pointer"
                      >
                        <FileText className="h-4 w-4 text-zinc-400" />
                        Save Draft
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
