import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Lock,
  Plus,
  RefreshCw,
  ChevronDown,
  Eye,
  CheckSquare,
  FileText,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  Table,
  Truck,
  StickyNote,
} from "lucide-react";
import { useState, useEffect, type ReactNode, isValidElement } from "react";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import { Popover } from "@/components/popover";
import { SearchAndImportMenu } from "./search-and-import-menu";
import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-linen-100 ${className}`} />;
}

const getTargetLabel = (target: string) => {
  switch (target) {
    case "PO":
      return "Purchase Order";
    case "GRPO":
      return "Goods Receipt PO";
    case "AP Invoice":
      return "A/P Invoice";
    case "AP Credit Memo":
      return "A/P Credit Memo";
    case "Sales Order":
      return "Sales Order";
    case "A/R Invoice":
      return "A/R Invoice";
    case "A/R Credit Note":
      return "A/R Credit Note";
    default:
      return target;
  }
};

const getTargetRoute = (target: string) => {
  switch (target) {
    case "PO":
      return "/purchase/create-order";
    case "GRPO":
      return "/purchase/create-grpo";
    case "AP Invoice":
      return "/purchase/create-ap-invoice";
    case "AP Credit Memo":
      return "/purchase/create-ap-credit-memo";
    default:
      return "/sales/create-quotation";
  }
};

const getTargetIcon = (target: string) => {
  switch (target) {
    case "PO":
    case "GRPO":
    case "Sales Order":
      return (
        <Truck className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600" />
      );
    case "AP Invoice":
    case "A/R Invoice":
      return (
        <StickyNote className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600" />
      );
    default:
      return (
        <FileText className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600" />
      );
  }
};

export function ActionsPopoverContent({
  onSubmit,
  onDownload,
  isSubmitting,
  submitDisabled,
  disabledReason,
  copyToTargets,
  copyToDocNum,
  copyToSourceDocType,
}: {
  onSubmit: () => void;
  onDownload?: ((type: "pdf" | "excel" | "word") => void) | undefined;
  isSubmitting?: boolean | undefined;
  submitDisabled?: boolean | undefined;
  disabledReason?: string | null | undefined;
  copyToTargets?: string[];
  copyToDocNum?: string;
  copyToSourceDocType?: string;
}) {
  const { setOpen } = Popover.usePopoverContext();
  const [menuView, setMenuView] = useState<"main" | "download" | "copy-to">("main");

  const effectiveTargets = copyToTargets || [];

  // Reset menuView when popover closes/unmounts
  useEffect(() => {
    return () => setMenuView("main");
  }, []);

  if (menuView === "download") {
    return (
      <div className="flex flex-col gap-0.5 p-1.5 w-[180px] bg-surface">
        <button
          type="button"
          onClick={() => setMenuView("main")}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-500 transition-all cursor-pointer border-none"
        >
          ← Back to Actions
        </button>
        <div className="border-t border-linen-100 my-1" />
        {onDownload && (
          <>
            <button
              type="button"
              onClick={() => {
                onDownload("pdf");
                setOpen(false);
              }}
              className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink-900 hover:text-teal-600 transition-all cursor-pointer border-none"
            >
              <FileText className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => {
                onDownload("excel");
                setOpen(false);
              }}
              className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink-900 hover:text-teal-600 transition-all cursor-pointer border-none"
            >
              <FileSpreadsheet className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600" />
              Download Excel
            </button>
            <button
              type="button"
              onClick={() => {
                onDownload("word");
                setOpen(false);
              }}
              className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink-900 hover:text-teal-600 transition-all cursor-pointer border-none"
            >
              <FileText className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600" />
              Download Word
            </button>
          </>
        )}
      </div>
    );
  }

  if (menuView === "copy-to") {
    return (
      <div className="flex flex-col gap-0.5 p-1.5 w-[180px] bg-surface">
        <button
          type="button"
          onClick={() => setMenuView("main")}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-500 transition-all cursor-pointer border-none"
        >
          ← Back to Actions
        </button>
        <div className="border-t border-linen-100 my-1" />
        {effectiveTargets.map((target) => (
          <Link
            key={target}
            to={getTargetRoute(target)}
            search={{ sourceDocNum: copyToDocNum, sourceDocType: copyToSourceDocType as any }}
            onClick={() => setOpen(false)}
            className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink-900 hover:text-teal-600 transition-all cursor-pointer border-none no-underline"
          >
            {getTargetIcon(target)}
            {getTargetLabel(target)}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 p-1.5 w-[180px] bg-surface">
      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
        Document Actions
      </div>
      <div className="border-t border-linen-100 my-1" />

      {/* Option 1: Update */}
      <button
        type="button"
        onClick={() => {
          onSubmit();
          setOpen(false);
        }}
        disabled={submitDisabled || Boolean(disabledReason) || isSubmitting}
        className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-900 hover:text-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none"
      >
        <span className="flex items-center gap-2.5">
          <RefreshCw
            className={`h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600 ${isSubmitting ? "animate-spin text-teal-600" : ""}`}
          />
          <span>Update</span>
        </span>
      </button>

      {/* Option 2: Download */}
      {onDownload && (
        <button
          type="button"
          onClick={() => setMenuView("download")}
          className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-900 hover:text-teal-600 transition-all cursor-pointer border-none"
        >
          <span className="flex items-center gap-2.5">
            <Download className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600" />
            <span>Download</span>
          </span>
          <span className="text-xs font-bold text-neutral-300 transition-all group-hover:text-teal-600">
            ➔
          </span>
        </button>
      )}

      {/* Option 3: Copy To */}
      {effectiveTargets.length > 0 && (
        <button
          type="button"
          onClick={() => setMenuView("copy-to")}
          className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-900 hover:text-teal-600 transition-all cursor-pointer border-none"
        >
          <span className="flex items-center gap-2.5">
            <Truck className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600" />
            <span>Copy To</span>
          </span>
          <span className="text-xs font-bold text-neutral-300 transition-all group-hover:text-teal-600">
            ➔
          </span>
        </button>
      )}
    </div>
  );
}

type SubmitSaveMode = "save-new" | "view" | "close" | "draft";

function AddPopoverContent({
  onSubmitMode,
  isSaved,
  onDownload,
  onReset,
  isSubmitting,
  onSelectAction,
  isDirty,
  disabledSaveModes = [],
}: {
  onSubmitMode?: ((mode: SubmitSaveMode) => void) | undefined;
  isSaved: boolean;
  onDownload?: ((type: "pdf" | "excel" | "word") => void) | undefined;
  onReset?: (() => void) | undefined;
  isSubmitting?: boolean | undefined;
  onSelectAction?: ((action: SubmitSaveMode) => void) | undefined;
  isDirty?: boolean | undefined;
  /** Modes that stay visible but cannot be clicked (e.g. PQ). */
  disabledSaveModes?: SubmitSaveMode[] | undefined;
}) {
  const { setOpen } = Popover.usePopoverContext();
  const [menuView, setMenuView] = useState<"main" | "download">("main");
  const router = useRouter();
  const isDraftConversion = Boolean((router.state.location.search as any)?.draftDocNum);
  const isModeDisabled = (mode: SubmitSaveMode) => disabledSaveModes.includes(mode);

  // Reset menuView when popover closes/unmounts
  useEffect(() => {
    return () => setMenuView("main");
  }, []);

  if (menuView === "download") {
    return (
      <div className="flex flex-col gap-0.5 p-1.5 w-52 bg-surface">
        <button
          type="button"
          onClick={() => setMenuView("main")}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-500 transition-all cursor-pointer border-none"
        >
          ← Back to Actions
        </button>
        <div className="border-t border-linen-100 my-1" />
        {onDownload && (
          <>
            <button
              type="button"
              onClick={() => {
                onDownload("pdf");
                setOpen(false);
              }}
              className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink-900 hover:text-teal-600 transition-all cursor-pointer border-none"
            >
              <FileText className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => {
                onDownload("excel");
                setOpen(false);
              }}
              className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink-900 hover:text-teal-600 transition-all cursor-pointer border-none"
            >
              <FileSpreadsheet className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600" />
              Download Excel
            </button>
            <button
              type="button"
              onClick={() => {
                onDownload("word");
                setOpen(false);
              }}
              className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink-900 hover:text-teal-600 transition-all cursor-pointer border-none"
            >
              <FileText className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600" />
              Download Word
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 p-1.5 w-52 bg-surface">
      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
        Document Actions
      </div>
      <div className="border-t border-linen-100 my-1" />

      {!isSaved ? (
        <>
          {/* Option 1: Save & New */}
          <button
            type="button"
            onClick={() => {
              if (isModeDisabled("save-new")) {
                return;
              }
              onSelectAction?.("save-new");
              onSubmitMode?.("save-new");
              setOpen(false);
            }}
            disabled={isSubmitting || isModeDisabled("save-new")}
            className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-900 hover:text-teal-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-ink-900 border-none"
          >
            <Plus className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600 group-disabled:group-hover:text-neutral-400" />
            <span>Save & New</span>
          </button>

          {/* Option 2: Save & View */}
          <button
            type="button"
            onClick={() => {
              if (isModeDisabled("view")) {
                return;
              }
              onSelectAction?.("view");
              onSubmitMode?.("view");
              setOpen(false);
            }}
            disabled={isSubmitting || isModeDisabled("view")}
            className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-900 hover:text-teal-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-ink-900 border-none"
          >
            <Eye className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600 group-disabled:group-hover:text-neutral-400" />
            <span>Save & View</span>
          </button>

          {/* Option 3: Save & Close */}
          <button
            type="button"
            onClick={() => {
              if (isModeDisabled("close")) {
                return;
              }
              onSelectAction?.("close");
              onSubmitMode?.("close");
              setOpen(false);
            }}
            disabled={isSubmitting || isModeDisabled("close")}
            className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-900 hover:text-teal-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-ink-900 border-none"
          >
            <CheckSquare className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600 group-disabled:group-hover:text-neutral-400" />
            <span>Save & Close</span>
          </button>

          {/* Option 4: Save & Draft */}
          <button
            type="button"
            onClick={() => {
              if (isModeDisabled("draft")) {
                return;
              }
              onSelectAction?.("draft");
              onSubmitMode?.("draft");
              setOpen(false);
            }}
            disabled={isSubmitting || isModeDisabled("draft") || (isDraftConversion && !isDirty)}
            className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-900 hover:text-teal-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
          >
            <FileText className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600" />
            <span>{isDraftConversion ? "Update & Draft" : "Save & Draft"}</span>
          </button>
        </>
      ) : (
        <>
          {/* Option 1: Download */}
          {onDownload && (
            <button
              type="button"
              onClick={() => setMenuView("download")}
              className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-900 hover:text-teal-600 transition-all cursor-pointer border-none"
            >
              <span className="flex items-center gap-2.5">
                <Download className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600" />
                <span>Download</span>
              </span>
              <span className="text-xs font-bold text-neutral-300 transition-all group-hover:text-teal-600">
                ➔
              </span>
            </button>
          )}

          {/* Option 2: Reset / New Document */}
          {onReset && (
            <button
              type="button"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-900 hover:text-teal-600 transition-all cursor-pointer border-none"
            >
              <RefreshCw className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-teal-600" />
              <span>New Document</span>
            </button>
          )}
        </>
      )}
    </div>
  );
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
  onSubmitMode?: ((mode: SubmitSaveMode) => void) | undefined;
  isSaved?: boolean | undefined;
  savedDocNum?: string | number | null | undefined;
  onDownload?: ((type: "pdf" | "excel" | "word") => void) | undefined;
  onReset?: (() => void) | undefined;
  /** Save menu modes that remain visible but disabled (PQ: new/view/close). */
  disabledSaveModes?: SubmitSaveMode[] | undefined;

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
  isDirty?: boolean | undefined;
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
  submitLabel = "Add",
  submitLoadingText = "Saving...",
  isSubmitting,
  onSubmit,
  onSubmitMode,
  isSaved = false,
  onDownload,
  onReset,
  disabledSaveModes = [],
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
  isDirty,
  customSearchAction,
  productRows,
  setProductRows,
  vendorName,
  vendorCode,
  defaultWarehouseCode,
}: BaseProductSectionProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const showBackPopover = true;
  const effectiveHideSearch = hideSearch || (isEditMode && !allowSearchInEditMode);

  const [activeAction, setActiveAction] = useState<"save-new" | "view" | "close" | "draft" | null>(
    null,
  );

  useEffect(() => {
    if (!isSubmitting) {
      setActiveAction(null);
    }
  }, [isSubmitting]);

  const getSubmitButtonLabel = () => {
    if (isSubmitting || activeAction) {
      const isDraftConversion = Boolean((router.state.location.search as any)?.draftDocNum);
      switch (activeAction) {
        case "save-new":
          return "Saving & New...";
        case "view":
          return "Saving & Viewing...";
        case "close":
          return "Saving & Closing...";
        case "draft":
          return isDraftConversion ? "Updating & Draft..." : "Saving & Draft...";
        default:
          return submitLoadingText;
      }
    }
    return submitLabel;
  };

  let copyToTargets: string[] = [];
  let copyToSourceDocType = "";
  let copyToDocNum = "";

  if (isValidElement(secondaryActions)) {
    const props = secondaryActions.props as Record<string, unknown>;
    if (props) {
      copyToTargets = (props.targets as string[]) || [];
      copyToSourceDocType = (props.sourceDocType as string) || "";
      copyToDocNum = (props.docNum as string) || "";
    }
  }

  const isPurchase =
    backToUrl.toLowerCase().includes("purchase") ||
    backToUrl.toLowerCase().includes("grpo") ||
    backToUrl.toLowerCase().includes("ap-");
  const transactionType = isPurchase ? "purchase" : "sales";

  // Show skeleton when loading (edit hydration)
  if (loading) {
    return (
      <section id={sectionId} className="mt-3 rounded-2xl border border-linen-200 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linen-100 px-4 py-3">
          <h3 className="whitespace-nowrap text-sm font-medium text-ink-900">
            <span className="inline-flex items-center gap-2">
              <span>{title}</span>
              {isReadOnly ? <Lock className="h-3 w-3 text-neutral-400" aria-hidden="true" /> : null}
            </span>
          </h3>
          {!effectiveHideSearch && <Pulse className="h-11 w-40 rounded-xl" />}
        </div>
        <div className="overflow-x-auto px-2 py-2">
          <table className="min-w-245 w-full text-left text-sm text-ink-900">
            <thead className="bg-linen-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
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
                <tr key={rowKey} className="border-b border-linen-100 last:border-b-0">
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
        <div className="border-t border-linen-100 px-4 py-3">
          <div className="ml-auto w-full max-w-sm">
            <div className="space-y-1">
              <div className="flex items-center justify-end gap-3 border-b border-linen-200/80 py-1">
                <Pulse className="h-3 w-16" />
                <Pulse className="h-3 w-10" />
                <Pulse className="h-4 w-20" />
              </div>
              <div className="flex items-center justify-end gap-3 border-b border-linen-200/80 py-1">
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
            <Pulse className="h-11 w-56 rounded-xl" />
            <div className="flex items-center gap-2">
              <Pulse className={`h-11 rounded-xl ${isEditMode ? "w-[180px]" : "w-52"}`} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={sectionId} className="mt-3 rounded-2xl border border-linen-200 bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linen-100 px-4 py-3">
        <h3 className="whitespace-nowrap text-sm font-medium text-ink-900">
          <span className="inline-flex items-center gap-2">
            <span>{title}</span>
            {isReadOnly ? <Lock className="h-3 w-3 text-neutral-400" aria-hidden="true" /> : null}
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
              <span className="inline-flex cursor-help items-center gap-2 rounded-full border border-linen-200 bg-surface px-3 py-1 text-xs font-medium text-neutral-500">
                <span>Required fields</span>
                <span
                  className="inline-block size-3 rounded-full border border-linen-200"
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
                  transactionType={transactionType}
                />
              ) : (
                <button
                  type="button"
                  onClick={onSearchProducts}
                  onMouseEnter={onPrefetchProducts}
                  onFocus={onPrefetchProducts}
                  className="group inline-flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-linen-200 bg-surface px-4 py-2 text-sm font-semibold text-ink-900 shadow-sm transition-all hover:bg-linen-50 hover:text-teal-600"
                >
                  <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  {searchLabel}
                </button>
              ))}
        </div>
      </div>

      <div>{children}</div>

      <div className="border-t border-linen-100 px-4 py-3">
        <div className="ml-auto w-full max-w-sm">
          <div className="space-y-1">
            <div className="flex items-center justify-end gap-3 border-b border-linen-200/80 py-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">
                Tax Total
              </span>
              {currencyLabel ? (
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-neutral-400">
                  {currencyLabel}
                </span>
              ) : null}
              <span className="min-w-20 text-right text-base font-semibold text-ink-900">
                {totals.taxTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-end gap-3 border-b border-linen-200/80 py-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">
                Net Total
              </span>
              {currencyLabel ? (
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-neutral-400">
                  {currencyLabel}
                </span>
              ) : null}
              <span className="min-w-20 text-right text-base font-semibold text-ink-900">
                {totals.netTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-end gap-3 py-1">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
                Grand Total
              </span>
              {currencyLabel ? (
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-neutral-500">
                  {currencyLabel}
                </span>
              ) : null}
              <span className="min-w-20 text-right text-lg font-bold text-ink-900">
                {totals.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        {createError ? (
          <p className="mt-2 text-right text-xs font-medium text-red-600">{createError}</p>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-2">
          {/* Left Side: Go Back Button (Same for both) */}
          <div className="flex items-center gap-2">
            {showBackPopover ? (
              <Popover.Root>
                <Popover.Trigger asChild>
                  <Button
                    type="button"
                    size="md"
                    variant="outline"
                    className="group h-11 w-56 rounded-xl border border-linen-200 bg-surface px-4 py-2 text-sm font-semibold text-ink-900 shadow-sm transition-all hover:bg-linen-50 hover:text-teal-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                    Go Back
                  </Button>
                </Popover.Trigger>
                <Popover.Content side="top" align="start" className="w-56 z-[1001]">
                  <div className="flex flex-col py-1">
                    <button
                      type="button"
                      onClick={() => {
                        void navigate({
                          to: "/dashboard",
                        });
                      }}
                      className="group flex w-full items-start gap-3 px-3 py-2.5 hover:bg-linen-50 transition-all text-left cursor-pointer"
                    >
                      <LayoutDashboard className="mt-0.5 h-4 w-4 text-neutral-400 group-hover:text-neutral-500 transition-colors" />
                      <span className="flex flex-col">
                        <span className="text-[13px] font-bold text-ink-900 group-hover:text-ink-900 transition-colors">
                          Back to Dashboard
                        </span>
                        <span className="text-[10px] text-neutral-400 mt-0.5">
                          Go to main dashboard
                        </span>
                      </span>
                    </button>
                    <div className="border-t border-linen-100" />
                    <button
                      type="button"
                      onClick={() => {
                        void navigate({
                          to: backToUrl,
                          search: { limit: 10, page: 1 },
                        });
                      }}
                      className="group flex w-full items-start gap-3 px-3 py-2.5 hover:bg-linen-50 transition-all text-left cursor-pointer"
                    >
                      <Table className="mt-0.5 h-4 w-4 text-neutral-400 group-hover:text-ink-900 transition-colors" />
                      <span className="flex flex-col">
                        <span className="text-[13px] font-bold text-ink-900 group-hover:text-ink-900 transition-colors">
                          Back to Table
                        </span>
                        <span className="text-[10px] text-neutral-400 mt-0.5">
                          Go to document table
                        </span>
                      </span>
                    </button>
                  </div>
                </Popover.Content>
              </Popover.Root>
            ) : (
              <Button
                type="button"
                size="md"
                variant="outline"
                onClick={() => navigate({ search: { limit: 10, page: 1 }, to: backToUrl })}
                className="group h-11 rounded-xl border border-linen-200 bg-surface px-4 py-2 text-sm font-semibold text-ink-900 shadow-sm transition-all hover:bg-linen-50 hover:text-teal-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none"
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                  {backToLabel}
                </span>
              </Button>
            )}
          </div>

          {/* Right Side: Different for Edit Mode vs. Create Mode */}
          <div className="flex items-center gap-2">
            {isEditMode ? (
              // EDIT MODE FOOTER
              <>
                {!isReadOnly && disabledReason && !isSubmitting && (
                  <Tooltip content={disabledReason} className="block w-auto max-w-none">
                    <span className="inline-flex cursor-help items-center gap-1.5 rounded-full border border-linen-200 bg-surface px-3 py-1 text-xs font-medium text-neutral-500 shadow-xs">
                      <span className="inline-block size-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>Validation Warning</span>
                    </span>
                  </Tooltip>
                )}

                <Popover.Root>
                  <Popover.Trigger asChild>
                    <Button
                      type="button"
                      size="md"
                      variant="outline"
                      className="group h-11 w-[180px] rounded-xl border border-linen-200 bg-surface px-4 py-2 text-sm font-semibold text-ink-900 shadow-sm transition-all hover:border-linen-200 hover:bg-linen-50 hover:text-ink-900 focus:outline-none flex items-center justify-between cursor-pointer normal-case tracking-normal"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 flex items-center justify-center text-neutral-400 group-hover:text-neutral-500 font-bold">
                          ⚙
                        </span>
                        <span>Actions</span>
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 text-neutral-400 group-hover:text-neutral-500 transition-transform duration-200" />
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content
                    side="top"
                    align="end"
                    unstyled
                    className="w-[180px] z-[1001] -translate-x-3"
                  >
                    <div className="overflow-hidden rounded-xl border border-linen-100 bg-surface text-ink-900 shadow-xl ring-1 ring-ink-900/5 min-w-50">
                      <ActionsPopoverContent
                        onSubmit={onSubmit}
                        onDownload={onDownload}
                        isSubmitting={isSubmitting}
                        submitDisabled={submitDisabled}
                        disabledReason={disabledReason}
                        copyToTargets={copyToTargets}
                        copyToDocNum={copyToDocNum}
                        copyToSourceDocType={copyToSourceDocType}
                      />
                    </div>
                  </Popover.Content>
                </Popover.Root>
              </>
            ) : (
              // CREATE MODE FOOTER (Original)
              <>
                {!isSaved && disabledReason && !isSubmitting ? (
                  showRequiredHints ? (
                    missingMandatoryFields.length > 0 && mandatoryFieldsTotal > 0 ? (
                      <Tooltip
                        content={`Required fields: ${missingMandatoryFields.map((field) => requiredFieldLabels[field] ?? field).join(", ")}`}
                        className="block w-auto max-w-none"
                      >
                        <span className="inline-flex cursor-help items-center gap-2 rounded-full border border-linen-200 bg-surface px-3 py-1 text-xs font-medium text-neutral-500">
                          <span>Required fields</span>
                          <span
                            className="inline-block size-3 rounded-full border border-linen-200"
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
                      <span className="inline-flex items-center gap-2 rounded-full border border-linen-200 bg-surface px-3 py-1 text-xs font-medium text-neutral-500">
                        <span className="inline-block size-2 rounded-full bg-amber-500" />
                        <span>Pick 1 product</span>
                      </span>
                    )
                  ) : null
                ) : null}
                {!isSaved && secondaryActions}
                {(isSaved || showSubmitButton) && (
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <Button
                        type="button"
                        size="md"
                        variant="outline"
                        isLoading={!isSaved && isSubmitting}
                        loadingText={getSubmitButtonLabel()}
                        disabled={!isSaved && (Boolean(disabledReason) || isSubmitting)}
                        className="group h-11 w-52 rounded-xl border border-linen-200 bg-surface px-4 py-2 text-sm font-semibold text-ink-900 shadow-sm transition-all hover:border-linen-200 hover:bg-linen-50 hover:text-ink-900 focus:outline-none flex items-center justify-between cursor-pointer normal-case tracking-normal"
                      >
                        <span className="inline-flex items-center gap-2">
                          {isSaved ? (
                            <>
                              <span className="h-4 w-4 flex items-center justify-center text-neutral-400 group-hover:text-neutral-500 font-bold">
                                ⚙
                              </span>
                              <span>Actions</span>
                            </>
                          ) : (
                            <span>{getSubmitButtonLabel()}</span>
                          )}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 text-neutral-400 group-hover:text-neutral-500 transition-transform duration-200" />
                      </Button>
                    </Popover.Trigger>
                    <Popover.Content
                      side="top"
                      align="end"
                      unstyled
                      className="w-52 z-[1001] translate-x-0"
                    >
                      <div className="overflow-hidden rounded-xl border border-linen-100 bg-surface text-ink-900 shadow-xl ring-1 ring-ink-900/5 min-w-50">
                        <AddPopoverContent
                          onSubmitMode={onSubmitMode}
                          isSaved={isSaved}
                          onDownload={onDownload}
                          onReset={onReset}
                          isSubmitting={isSubmitting}
                          onSelectAction={setActiveAction}
                          isDirty={isDirty}
                          disabledSaveModes={disabledSaveModes}
                        />
                      </div>
                    </Popover.Content>
                  </Popover.Root>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
