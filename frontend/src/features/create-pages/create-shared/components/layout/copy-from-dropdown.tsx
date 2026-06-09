import { ChevronRight, ClipboardList, FileText, Lock, RotateCcw, StickyNote } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/button";
import { Popover } from "@/components/popover";
import { cn } from "@/shared/utils/cn";

export type SourceDocType =
  | "PurchaseOrder"
  | "GoodsReceiptPO"
  | "APInvoice"
  | "APCreditMemo"
  | "PurchaseQuotation"
  | "SalesOrder"
  | "SalesQuotation"
  | "ARInvoice";
type SourceFamily =
  | "PurchaseOrder"
  | "GoodsReceiptPO"
  | "PurchaseQuotation"
  | "SalesOrder"
  | "SalesQuotation"
  | "ARInvoice";

interface CopyFromSourceOption {
  label: string;
  code: SourceDocType;
  icon: React.ReactNode;
  meta: string;
  disabled?: boolean | undefined;
}

interface CopyFromDropdownProps {
  vendorCode?: string | undefined;
  vendorName?: string | undefined;
  disabled?: boolean;
  onSelectSource?: (sourceType: SourceDocType) => void;
  className?: string | undefined;
  sourceDocTypes?: SourceDocType[];
  /** When set, this source family is disabled (visible but non-selectable). */
  lockedSourceFamily?: SourceFamily | null | undefined;
  /** Called when user clicks a disabled/locked source option. */
  onLockedFamilyClick?: () => void | undefined;
  onReset?: (() => void) | undefined;
}

const sourceIcon = (code: string) => {
  switch (code) {
    case "PurchaseOrder": {
      return <FileText className="h-4 w-4" />;
    }
    case "GoodsReceiptPO": {
      return <StickyNote className="h-4 w-4" />;
    }
    case "APInvoice": {
      return <FileText className="h-4 w-4" />;
    }
    case "APCreditMemo": {
      return <FileText className="h-4 w-4" />;
    }
    case "PurchaseQuotation": {
      return <FileText className="h-4 w-4" />;
    }
    case "SalesOrder": {
      return <FileText className="h-4 w-4" />;
    }
    case "SalesQuotation": {
      return <ClipboardList className="h-4 w-4" />;
    }
    case "ARInvoice": {
      return <FileText className="h-4 w-4" />;
    }
    default: {
      return <ClipboardList className="h-4 w-4" />;
    }
  }
};

const sourceMeta = (code: string) => {
  switch (code) {
    case "PurchaseOrder": {
      return "Copy from Purchase Order";
    }
    case "GoodsReceiptPO": {
      return "Copy from GRPO";
    }
    case "APInvoice": {
      return "Copy from A/P Invoice";
    }
    case "APCreditMemo": {
      return "Copy from A/P Credit Memo";
    }
    case "PurchaseQuotation": {
      return "Copy from Purchase Quotation";
    }
    case "SalesOrder": {
      return "Copy from Sales Order";
    }
    case "SalesQuotation": {
      return "Copy from Sales Quotation";
    }
    case "ARInvoice": {
      return "Copy from A/R Invoice";
    }
    default: {
      return "";
    }
  }
};

function CopyFromPanel({
  options,
  panelWidth,
  onSelect,
  onDisabledClick,
  onReset,
}: {
  options: CopyFromSourceOption[];
  panelWidth: number | null;
  onSelect: (code: SourceDocType) => void;
  onDisabledClick?: (code: SourceDocType) => void;
  onReset?: (() => void) | undefined;
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg ring-1 ring-black/[0.04]"
      style={{
        animation: "popover-enter 180ms ease-in-out both",
        width: panelWidth ?? undefined,
      }}
    >
      <div className="flex flex-col py-1">
        {options.map((option, index) => (
          <button
            key={option.code}
            type="button"
            aria-disabled={option.disabled}
            onClick={() => {
              if (option.disabled) {
                onDisabledClick?.(option.code);
              } else {
                onSelect(option.code);
              }
            }}
            className={cn(
              "group/row relative flex w-full items-start gap-2.5 px-2.5 py-2 text-left transition-all duration-150",
              option.disabled
                ? "cursor-not-allowed opacity-50 pointer-events-auto"
                : "hover:bg-zinc-50",
              "focus-visible:outline-none focus-visible:bg-zinc-50 focus-visible:ring-1 focus-visible:ring-zinc-300",
              index === 0 ? "mt-0" : "-mt-px border-t border-zinc-100/80",
            )}
          >
            <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-50 text-zinc-400 ring-1 ring-zinc-100 transition-all duration-150 group-hover/row:bg-zinc-100 group-hover/row:text-zinc-600">
              {option.icon}
            </span>
            <span className="flex min-w-0 flex-col justify-center">
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-700 transition-colors group-hover/row:text-zinc-900">
                {option.label}
                {option.disabled && <Lock className="h-3 w-3 text-zinc-400" />}
              </span>
            </span>
          </button>
        ))}
      </div>
      {onReset && (
        <div className="border-t border-zinc-100 bg-zinc-50/50">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50/30 transition-all active:scale-[0.98] cursor-pointer"
          >
            <RotateCcw className="size-3" />
            <span>Reset to Default</span>
          </button>
        </div>
      )}
    </div>
  );
}

function CopyFromDropdownInner({
  vendorCode,
  vendorName,
  disabled = false,
  onSelectSource,
  className,
  sourceDocTypes,
  lockedSourceFamily,
  onLockedFamilyClick,
  onReset,
}: {
  vendorCode?: string | undefined;
  vendorName?: string | undefined;
  disabled?: boolean;
  onSelectSource?: (sourceType: SourceDocType) => void;
  className?: string | undefined;
  sourceDocTypes: SourceDocType[];
  lockedSourceFamily?: SourceFamily | null | undefined;
  onLockedFamilyClick?: () => void | undefined;
  onReset?: (() => void) | undefined;
}) {
  const { open, setOpen } = Popover.usePopoverContext();
  const [panelWidth, setPanelWidth] = useState<number | null>(null);
  const isVendorSelected = Boolean(vendorCode?.trim() && vendorName?.trim());
  const isDisabled = disabled || !isVendorSelected;
  const triggerNodeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPanelWidth(null);
      return;
    }
    const el = triggerNodeRef.current;
    if (!el) {
      return;
    }

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setPanelWidth(Math.round(rect.width));
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  const options: CopyFromSourceOption[] = useMemo(
    () =>
      sourceDocTypes.map((code) => {
        const isLocked = lockedSourceFamily != null && code === lockedSourceFamily;
        const option: CopyFromSourceOption = {
          code,
          icon: sourceIcon(code),
          label:
            code === "PurchaseOrder"
              ? "Purchase Order"
              : code === "GoodsReceiptPO"
                ? "GRPO"
                : code === "APInvoice"
                  ? "A/P Invoice"
                  : code === "APCreditMemo"
                    ? "A/P Credit Memo"
                    : code === "PurchaseQuotation"
                      ? "Purchase Quotation"
                      : code === "SalesOrder"
                        ? "Sales Order"
                        : code === "SalesQuotation"
                          ? "Sales Quotation"
                          : "A/R Invoice",
          meta: sourceMeta(code),
        };
        if (isLocked) {
          option.disabled = true;
        }
        return option;
      }),
    [sourceDocTypes, lockedSourceFamily],
  );

  const handleSelect = (code: SourceDocType) => {
    onSelectSource?.(code);
    setOpen(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDisabledClick = (_code: SourceDocType) => {
    onLockedFamilyClick?.();
  };

  const handleTriggerClick = useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  return (
    <>
      <Button
        ref={triggerNodeRef}
        type="button"
        size="md"
        variant="outline"
        disabled={isDisabled}
        onClick={handleTriggerClick}
        className={cn(
          "group h-8 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-sm transition-all duration-200 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none disabled:cursor-not-allowed disabled:opacity-50",
          open
            ? "border-zinc-300 bg-zinc-50 text-zinc-900 ring-1 ring-zinc-200"
            : "hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900",
          className,
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-500 transition-colors" />
          <span>Copy From</span>
        </span>
        <span className="mx-1.5 h-3.5 w-px bg-zinc-200" />
        <span className="flex items-center gap-1 transition-colors duration-200">
          <span className="text-xs text-zinc-400 group-hover:text-zinc-600 transition-colors">
            Choose source
          </span>
          <ChevronRight
            className={cn(
              "h-3 w-3 text-zinc-400 transition-transform duration-200",
              open && "translate-x-0.5",
            )}
          />
        </span>
      </Button>
      <Popover.Content side="bottom" align="end" unstyled className="z-[1001]">
        <CopyFromPanel
          options={options}
          panelWidth={panelWidth}
          onSelect={handleSelect}
          onDisabledClick={handleDisabledClick}
          onReset={onReset}
        />
      </Popover.Content>
    </>
  );
}

export function CopyFromDropdown({
  vendorCode,
  vendorName,
  disabled = false,
  onSelectSource,
  className,
  sourceDocTypes,
  lockedSourceFamily,
  onLockedFamilyClick,
  onReset,
}: CopyFromDropdownProps) {
  const defaultSourceTypes: SourceDocType[] = sourceDocTypes ?? ["PurchaseOrder"];

  return (
    <Popover.Root>
      <CopyFromDropdownInner
        vendorCode={vendorCode}
        vendorName={vendorName}
        disabled={disabled}
        {...(onSelectSource ? { onSelectSource } : {})}
        className={className}
        sourceDocTypes={defaultSourceTypes}
        {...(lockedSourceFamily !== undefined ? { lockedSourceFamily } : {})}
        {...(onLockedFamilyClick ? { onLockedFamilyClick } : {})}
        onReset={onReset}
      />
    </Popover.Root>
  );
}
