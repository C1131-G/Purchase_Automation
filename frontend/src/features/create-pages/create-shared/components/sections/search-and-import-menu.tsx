import { useState, useRef, useEffect } from "react";
import {
  Plus,
  ChevronDown,
  Search,
  FileSpreadsheet,
  Download,
  UploadCloud,
  ArrowLeft,
} from "lucide-react";

import { useExcelImport } from "@/features/create-pages/create-shared/hooks/use-excel-import";
import { AnimatedModalShell } from "@/features/create-pages/create-shared/components/core/animated-modal-shell";
import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";

interface SearchAndImportMenuProps {
  onSearchProducts: () => void;
  onPrefetchProducts?: (() => void) | undefined;
  productRows: ProductRow[];
  setProductRows: (rows: ProductRow[] | ((prev: ProductRow[]) => ProductRow[])) => void;
  defaultWarehouseCode?: string | undefined;
  vendorName?: string | undefined;
  vendorCode?: string | undefined;
  transactionType?: "sales" | "purchase";
}

export function SearchAndImportMenu({
  onSearchProducts,
  onPrefetchProducts,
  productRows,
  setProductRows,
  defaultWarehouseCode = "",
  vendorName = "",
  vendorCode = "",
  transactionType = "purchase",
}: SearchAndImportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuView, setMenuView] = useState<"main" | "upload">("main");

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset menu view when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setMenuView("main");
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSearchClick = () => {
    setIsOpen(false);
    onSearchProducts();
  };

  const {
    isSimulatingUpload,
    validationErrors,
    isErrorModalOpen,
    setIsErrorModalOpen,
    handleDownloadTemplate,
    handleUploadClick,
    handleFileChange,
  } = useExcelImport({
    productRows,
    setProductRows,
    defaultWarehouseCode,
    vendorName,
    vendorCode,
    transactionType,
    onSearchProducts,
    closeMenu: () => setIsOpen(false),
  });

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => !isSimulatingUpload && setIsOpen(!isOpen)}
        onMouseEnter={onPrefetchProducts}
        onFocus={onPrefetchProducts}
        disabled={isSimulatingUpload}
        className="group flex h-11 w-64 cursor-pointer items-center justify-between rounded-xl border border-linen-200 bg-surface px-4 py-2 text-sm font-semibold text-ink-900 shadow-sm transition-all hover:bg-linen-50 hover:text-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          <span>{isSimulatingUpload ? "Importing..." : "Add Product"}</span>
        </span>
        <ChevronDown
          className="h-4 w-4 text-neutral-400 group-hover:text-teal-600 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .xml, .csv"
        className="hidden"
      />

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl border border-linen-200/80 bg-surface/95 p-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.15)] backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-top-2">
          {menuView === "main" ? (
            <div className="flex flex-col gap-1 animate-in fade-in duration-200">
              <div className="px-2.5 py-1 text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
                Add Options
              </div>
              <button
                type="button"
                onClick={handleSearchClick}
                className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-linen-50 group cursor-pointer"
              >
                <div className="mt-0.5 rounded-lg bg-teal-50 p-1 text-teal-600 group-hover:bg-teal-100/80 transition-colors">
                  <Search className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink-900 group-hover:text-teal-600 transition-colors">
                    Search & Select
                  </p>
                  <p className="text-[10px] text-neutral-500 font-medium">
                    Search items from catalog
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMenuView("upload")}
                className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-linen-50 group cursor-pointer"
              >
                <div className="mt-0.5 rounded-lg bg-linen-100 p-1 text-neutral-500 group-hover:bg-linen-100/80 transition-colors">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink-900 group-hover:text-teal-600 transition-colors">
                    Upload Excel
                  </p>
                  <p className="text-[10px] text-neutral-500 font-medium">
                    Import items from spreadsheet
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => setMenuView("main")}
                className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-[9px] font-bold text-neutral-400 hover:text-neutral-500 transition-colors cursor-pointer mb-0.5 uppercase tracking-wider"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Options
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-linen-50 group cursor-pointer"
              >
                <div className="mt-0.5 rounded-lg bg-emerald-50 p-1 text-emerald-600 group-hover:bg-emerald-100/80 transition-colors">
                  <Download className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink-900 group-hover:text-emerald-600 transition-colors">
                    Download Template
                  </p>
                  <p className="text-[10px] text-neutral-500 font-medium">
                    Get empty CSV spreadsheet (.csv)
                  </p>
                </div>
              </button>

              <div className="border-t border-linen-100 my-0.5" />

              <button
                type="button"
                onClick={() => handleUploadClick(fileInputRef)}
                className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-linen-50 group cursor-pointer bg-amber-50/50"
              >
                <div className="mt-0.5 rounded-lg bg-amber-50 p-1 text-amber-600 group-hover:bg-amber-100/80 transition-colors">
                  <UploadCloud className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink-900 group-hover:text-amber-600 transition-colors">
                    Upload Spreadsheet
                  </p>
                  <p className="text-[10px] text-neutral-500 font-medium">
                    Import filled spreadsheet
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Validation Error Modal */}
      {isErrorModalOpen && (
        <AnimatedModalShell
          open={isErrorModalOpen}
          onClose={() => setIsErrorModalOpen(false)}
          panelClassName="max-w-xl bg-surface rounded-2xl shadow-xl border border-linen-200 overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-linen-200 px-5 py-4 bg-linen-50">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </span>
              <h3 className="text-base font-bold text-ink-900">Import Validation Failed</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsErrorModalOpen(false)}
              className="rounded-lg p-1 text-neutral-400 hover:bg-linen-100 hover:text-ink-900 transition cursor-pointer"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3">
            <p className="text-sm text-neutral-500 font-medium">
              We found the following issues in the spreadsheet. Please correct them and re-upload
              the file:
            </p>
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 font-mono text-xs text-red-700 leading-relaxed space-y-2">
              {validationErrors.map((err, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-red-400 select-none">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-linen-100 px-5 py-3.5 bg-linen-50">
            <button
              type="button"
              onClick={() => setIsErrorModalOpen(false)}
              className="rounded-xl border border-linen-200 bg-surface px-4 py-2 text-sm font-semibold text-ink-900 shadow-sm transition hover:bg-linen-50 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </AnimatedModalShell>
      )}
    </div>
  );
}
