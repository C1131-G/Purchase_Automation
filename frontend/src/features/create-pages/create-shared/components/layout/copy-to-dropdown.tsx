import { Link } from "@tanstack/react-router";
import { ChevronRight, ClipboardList, FileText, StickyNote, Truck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/button";
import { Popover } from "@/components/popover";
import { cn } from "@/shared/utils/cn";

interface CopyToOption {
  label: string;
  meta: string;
  to: string;
  icon: React.ReactNode;
}

type SourceDocType =
  | "PurchaseOrder"
  | "GoodsReceiptPO"
  | "APInvoice"
  | "PurchaseQuotation"
  | "SalesQuotation"
  | "SalesOrder"
  | "ARInvoice";

type TargetType =
  | "PO"
  | "GRPO"
  | "AP Invoice"
  | "AP Credit Memo"
  | "Sales Order"
  | "A/R Invoice"
  | "A/R Credit Note";

interface CopyToDropdownProps {
  docNum: string;
  sourceDocType: SourceDocType;
  targets: TargetType[];
  className?: string;
}

const targetIcon = (target: string) => {
  switch (target) {
    case "PO":
    case "GRPO":
    case "Sales Order": {
      return <Truck className="h-4 w-4" />;
    }
    case "AP Invoice":
    case "A/R Invoice": {
      return <StickyNote className="h-4 w-4" />;
    }
    case "AP Credit Memo":
    case "A/R Credit Note": {
      return <FileText className="h-4 w-4" />;
    }
    default: {
      return <ClipboardList className="h-4 w-4" />;
    }
  }
};

const targetMeta = (target: string, sourceDocType: string) => {
  switch (target) {
    case "PO": {
      return "Create Purchase Order from this Quotation";
    }
    case "GRPO": {
      return sourceDocType === "PurchaseOrder"
        ? "Create GRPO from this PO"
        : sourceDocType === "PurchaseQuotation"
          ? "Create GRPO from this Quotation"
          : "Create GRPO from this document";
    }
    case "AP Invoice": {
      return sourceDocType === "PurchaseOrder"
        ? "Create A/P Invoice from this PO"
        : sourceDocType === "GoodsReceiptPO"
          ? "Create A/P Invoice from this GRPO"
          : sourceDocType === "PurchaseQuotation"
            ? "Create A/P Invoice from this Quotation"
            : "Create A/P Invoice from this document";
    }
    case "AP Credit Memo": {
      return "Create A/P Credit Memo from this invoice";
    }
    case "Sales Order": {
      return "Create Sales Order from this quotation";
    }
    case "A/R Invoice": {
      return sourceDocType === "SalesQuotation"
        ? "Create A/R Invoice from this quotation"
        : "Create A/R Invoice from this order";
    }
    case "A/R Credit Note": {
      return "Create A/R Credit Note from this invoice";
    }
    default: {
      return "";
    }
  }
};

function CopyToPanel({
  docNum,
  sourceDocType,
  options,
  panelWidth,
}: {
  docNum: string;
  sourceDocType: SourceDocType;
  options: CopyToOption[];
  panelWidth: number | null;
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
          <Link
            key={option.label}
            to={option.to}
            search={{ sourceDocNum: docNum, sourceDocType }}
            className={cn(
              "group/row relative flex items-start gap-3 px-3 py-2.5 transition-all duration-150",
              "hover:bg-zinc-50",
              "focus-visible:outline-none focus-visible:bg-zinc-50 focus-visible:ring-1 focus-visible:ring-zinc-300",
              index === 0 ? "mt-0" : "-mt-px border-t border-zinc-100/80",
            )}
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-50 text-zinc-400 ring-1 ring-zinc-100 transition-all duration-150 group-hover/row:bg-zinc-100 group-hover/row:text-zinc-600">
              {option.icon}
            </span>
            <span className="flex min-w-0 flex-col justify-center">
              <span className="text-[13px] font-medium text-zinc-700 transition-colors group-hover/row:text-zinc-900">
                {option.label}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CopyToDropdownInner({
  docNum,
  sourceDocType,
  options,
  className,
}: {
  docNum: string;
  sourceDocType: SourceDocType;
  options: CopyToOption[];
  className?: string;
}) {
  const { open, setOpen } = Popover.usePopoverContext();
  const [panelWidth, setPanelWidth] = useState<number | null>(null);
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
        onClick={handleTriggerClick}
        className={cn(
          "group h-11 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition-all duration-200 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none disabled:cursor-not-allowed disabled:opacity-50",
          open
            ? "border-zinc-300 bg-zinc-50 text-zinc-900 ring-1 ring-zinc-200"
            : "hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900",
          className,
        )}
      >
        <span className="inline-flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-zinc-400 group-hover:text-zinc-500 transition-colors" />
          <span>Copy To</span>
        </span>
        <span className="mx-2 h-4 w-px bg-zinc-200" />
        <span className="flex items-center gap-1.5 transition-colors duration-200">
          {options.length === 1 ? (
            <>
              <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-600 transition-colors">
                {options[0]!.label}
              </span>
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200 text-zinc-400",
                  open && "translate-x-0.5",
                )}
              />
            </>
          ) : (
            <>
              <span className="text-sm text-zinc-400 group-hover:text-zinc-600 transition-colors">
                Choose target
              </span>
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200 text-zinc-400",
                  open && "translate-x-0.5",
                )}
              />
            </>
          )}
        </span>
      </Button>
      <Popover.Content side="top" align="end" unstyled className="z-[1001]">
        <CopyToPanel
          docNum={docNum}
          sourceDocType={sourceDocType}
          options={options}
          panelWidth={panelWidth}
        />
      </Popover.Content>
    </>
  );
}

export function CopyToDropdown({ docNum, sourceDocType, targets, className }: CopyToDropdownProps) {
  const options: CopyToOption[] = targets.map((target) => ({
    icon: targetIcon(target),
    label: target,
    meta: targetMeta(target, sourceDocType),
    to:
      target === "PO"
        ? "/purchase/create-order"
        : target === "GRPO"
          ? "/purchase/create-grpo"
          : target === "AP Invoice"
            ? "/purchase/create-ap-invoice"
            : target === "AP Credit Memo"
              ? "/purchase/create-ap-credit-memo"
              : target === "Sales Order"
                ? "/sales/create-order"
                : target === "A/R Invoice"
                  ? "/sales/create-ar-invoice"
                  : "/sales/ar-credit-memo/create",
  }));

  return (
    <Popover.Root>
      <CopyToDropdownInner
        docNum={docNum}
        sourceDocType={sourceDocType}
        options={options}
        {...(className ? { className } : {})}
      />
    </Popover.Root>
  );
}
