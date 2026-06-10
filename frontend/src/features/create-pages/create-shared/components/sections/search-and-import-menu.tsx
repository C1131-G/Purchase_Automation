import { useState, useRef, useEffect, type ChangeEvent } from "react";
import {
  Plus,
  ChevronDown,
  Search,
  FileSpreadsheet,
  Download,
  UploadCloud,
  ArrowLeft,
} from "lucide-react";
import { goeyToast } from "goey-toast";

import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";

interface SearchAndImportMenuProps {
  onSearchProducts: () => void;
  onPrefetchProducts?: (() => void) | undefined;
  productRows: ProductRow[];
  setProductRows: (rows: ProductRow[] | ((prev: ProductRow[]) => ProductRow[])) => void;
  defaultWarehouseCode?: string | undefined;
  vendorName?: string | undefined;
  vendorCode?: string | undefined;
}

export function SearchAndImportMenu({
  onSearchProducts,
  onPrefetchProducts,
  setProductRows,
  defaultWarehouseCode = "",
  vendorName = "",
  vendorCode = "",
}: SearchAndImportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuView, setMenuView] = useState<"main" | "upload">("main");
  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);
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

  const handleDownloadTemplate = () => {
    try {
      const headers = [
        "ItemCode",
        "Quantity",
        "UnitPrice",
        "DiscountPercent",
        "WarehouseCode",
        "Comments",
      ];
      const rows = [
        ["A00001", "12", "75.00", "5", defaultWarehouseCode || "W001", "First sample item"],
        ["A00002", "25", "20.00", "0", defaultWarehouseCode || "W001", "Second sample item"],
      ];

      // Format as Excel-compatible tab-separated values (.xls)
      const tsvContent = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
      const blob = new Blob([tsvContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "purchase_quotation_template.xls");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      goeyToast.success("Excel template downloaded successfully!");
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      goeyToast.error("Failed to download template.");
    }
  };

  const handleUploadClick = () => {
    // Check if vendor is selected
    const hasVendor = vendorName.trim() && vendorCode.trim();
    if (!hasVendor) {
      onSearchProducts(); // Trigger native validation
      goeyToast.error("Please select a Vendor first before uploading products.");
      setIsOpen(false);
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check extension
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "xls" && extension !== "xlsx") {
      goeyToast.error("Invalid file format. Please upload an Excel (.xls or .xlsx) file.");
      e.target.value = "";
      return;
    }

    setIsSimulatingUpload(true);
    setIsOpen(false);

    // Simulate upload delay
    goeyToast(`Importing products from ${file.name}...`, { duration: 2000 });

    setTimeout(() => {
      // Create 2 mock rows based on the schema
      const importedRows: ProductRow[] = [
        {
          id: `row-imported-1-${Date.now()}`,
          productCode: "A00001",
          productName: "Hard Drive 1TB (Excel Import)",
          quantity: 12,
          price: 75.0,
          discountPercent: 5,
          discountAmount: 45.0,
          warehouseCode: defaultWarehouseCode || "W001",
          comment: "Imported from template",
          stock: 250,
          taxRate: 18,
          vatGroup: "GST18",
          currency: "INR",
          uomCode: "Pcs",
          selected: false,
        },
        {
          id: `row-imported-2-${Date.now()}`,
          productCode: "A00002",
          productName: "Wireless Mouse (Excel Import)",
          quantity: 25,
          price: 20.0,
          discountPercent: 0,
          discountAmount: 0,
          warehouseCode: defaultWarehouseCode || "W001",
          comment: "Imported from template",
          stock: 500,
          taxRate: 18,
          vatGroup: "GST18",
          currency: "INR",
          uomCode: "Pcs",
          selected: false,
        },
      ];

      setProductRows((prev) => [...prev, ...importedRows]);
      goeyToast.success(`Successfully imported 2 items from ${file.name}!`);
      setIsSimulatingUpload(false);
    }, 1500);

    e.target.value = "";
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => !isSimulatingUpload && setIsOpen(!isOpen)}
        onMouseEnter={onPrefetchProducts}
        onFocus={onPrefetchProducts}
        disabled={isSimulatingUpload}
        className="group flex h-11 w-64 cursor-pointer items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          <span>{isSimulatingUpload ? "Importing..." : "Search & Import"}</span>
        </span>
        <ChevronDown
          className="h-4 w-4 text-zinc-400 group-hover:text-blue-600 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls"
        className="hidden"
      />

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl border border-zinc-200/80 bg-white/95 p-1.5 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.15)] backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-top-2 overflow-hidden">
          <div
            className="transition-transform duration-300 flex"
            style={{
              transform: menuView === "upload" ? "translateX(-50%)" : "translateX(0%)",
              width: "200%",
            }}
          >
            {/* Main Menu View */}
            <div className="w-1/2 flex flex-col gap-2 pr-1">
              <div className="px-3 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Add Options
              </div>
              <button
                type="button"
                onClick={handleSearchClick}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-zinc-50 group cursor-pointer"
              >
                <div className="mt-0.5 rounded-lg bg-blue-50 p-1.5 text-blue-600 group-hover:bg-blue-100/80 transition-colors">
                  <Search className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 group-hover:text-blue-600 transition-colors">
                    Search & Select
                  </p>
                  <p className="text-[11px] text-zinc-500 font-medium">Search items from catalog</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMenuView("upload")}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-zinc-50 group cursor-pointer"
              >
                <div className="mt-0.5 rounded-lg bg-zinc-100 p-1.5 text-zinc-600 group-hover:bg-zinc-200/80 transition-colors">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 group-hover:text-blue-600 transition-colors">
                    Upload Document
                  </p>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    Import items from spreadsheet
                  </p>
                </div>
              </button>
            </div>

            {/* Submenu View */}
            <div className="w-1/2 flex flex-col gap-2 pl-1">
              <button
                type="button"
                onClick={() => setMenuView("main")}
                className="flex items-center gap-2 rounded-xl px-3 py-1 text-xs font-semibold text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer mb-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Options
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-zinc-50 group cursor-pointer"
              >
                <div className="mt-0.5 rounded-lg bg-emerald-50 p-1.5 text-emerald-600 group-hover:bg-emerald-100/80 transition-colors">
                  <Download className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 group-hover:text-emerald-600 transition-colors">
                    Download Template
                  </p>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    Get empty Excel spreadsheet
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleUploadClick}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-zinc-50 group cursor-pointer"
              >
                <div className="mt-0.5 rounded-lg bg-amber-50 p-1.5 text-amber-600 group-hover:bg-amber-100/80 transition-colors">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 group-hover:text-amber-600 transition-colors">
                    Upload Template
                  </p>
                  <p className="text-[11px] text-zinc-500 font-medium">Import filled Excel file</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
