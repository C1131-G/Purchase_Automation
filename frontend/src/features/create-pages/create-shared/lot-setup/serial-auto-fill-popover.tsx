import { ChevronDown, ListOrdered, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

import { Select } from "@/components/select/select";
import {
  buildSerialAutoFillNumbers,
  type SerialAutoFillDirection,
  type SerialAutoFillInput,
  type SerialAutoFillPart,
  type SerialAutoFillPartKind,
} from "@/features/create-pages/create-shared/lot-setup/lot-setup.utils";

const PANEL_WIDTH = 360;
const VIEW_MARGIN = 8;
const MAX_PARTS = 6;
const KIND_LABELS: Record<SerialAutoFillPartKind, string> = {
  number: "Number",
  string: "String",
};

type SerialAutoFillForm = Omit<SerialAutoFillInput, "count">;

interface SerialAutoFillPopoverProps {
  count: number;
  disabled?: boolean;
  onFill: (input: SerialAutoFillForm) => boolean;
}

function panelStyleFromRect(rect: DOMRect, height: number): CSSProperties {
  const left = Math.max(
    VIEW_MARGIN,
    Math.min(rect.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - VIEW_MARGIN),
  );
  const spaceAbove = rect.top;
  const openUp = spaceAbove >= height || spaceAbove > window.innerHeight - rect.bottom;
  let top = openUp ? rect.top - height - 4 : rect.bottom + 4;
  const maxTop = Math.max(VIEW_MARGIN, window.innerHeight - height - VIEW_MARGIN);
  if (top < VIEW_MARGIN) {
    top = VIEW_MARGIN;
  }
  if (top > maxTop) {
    top = maxTop;
  }
  return {
    left,
    position: "fixed",
    top,
    visibility: "visible",
    width: PANEL_WIDTH,
    zIndex: 200,
  };
}

function SerialKindSelect({
  ariaLabel,
  onChange,
  value,
}: {
  ariaLabel: string;
  onChange: (next: SerialAutoFillPartKind) => void;
  value: SerialAutoFillPartKind;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const updateMenuPosition = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setMenuStyle({
      left: rect.left,
      position: "fixed",
      top: rect.bottom + 4,
      width: Math.max(rect.width, 112),
      zIndex: 220,
    });
  };

  return (
    <div ref={wrapRef} className="w-[6.5rem] shrink-0" onClick={updateMenuPosition}>
      <Select
        onValueChange={(next) => {
          if (next === "string" || next === "number") {
            onChange(next);
          }
        }}
        value={value}
      >
        <Select.Trigger aria-label={ariaLabel} className="h-8 w-full rounded-md px-2 py-0 text-xs">
          <Select.Value labelMap={KIND_LABELS} placeholder="Type" />
          <Select.Icon rotate={180}>
            <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
          </Select.Icon>
        </Select.Trigger>
        {typeof document !== "undefined"
          ? createPortal(
              <div style={menuStyle}>
                <Select.Positioner className="relative top-auto mt-0 w-full">
                  <Select.Popup className="border border-linen-200/80 bg-surface p-1 shadow-lg">
                    <Select.List className="space-y-0.5 p-0">
                      <Select.Item label="String" value="string">
                        <span className="text-xs text-ink-900">String</span>
                      </Select.Item>
                      <Select.Item label="Number" value="number">
                        <span className="text-xs text-ink-900">Number</span>
                      </Select.Item>
                    </Select.List>
                  </Select.Popup>
                </Select.Positioner>
              </div>,
              document.body,
            )
          : null}
      </Select>
    </div>
  );
}

function defaultParts(): SerialAutoFillPart[] {
  return [
    { kind: "string", value: "abc" },
    { kind: "number", value: "1" },
  ];
}

export function SerialAutoFillPopover({
  count,
  disabled = false,
  onFill,
}: SerialAutoFillPopoverProps) {
  const titleId = useId();
  const dialogId = useId();
  const directionName = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState<SerialAutoFillPart[]>(defaultParts);
  const [direction, setDirection] = useState<SerialAutoFillDirection>("increase");
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({
    left: 0,
    position: "fixed",
    top: 0,
    visibility: "hidden",
    width: PANEL_WIDTH,
    zIndex: 200,
  });

  const form: SerialAutoFillForm = { direction, parts };
  const preview = buildSerialAutoFillNumbers({ ...form, count });
  const canFill = !disabled && preview.length === count && count > 0;
  const hasNumber = parts.some((part) => part.kind === "number");
  const canAddPart = parts.length < MAX_PARTS;
  const canRemovePart = parts.length > 1;

  const updatePart = (index: number, patch: Partial<SerialAutoFillPart>) => {
    setParts((current) =>
      current.map((part, partIndex) => (partIndex === index ? { ...part, ...patch } : part)),
    );
  };

  const addPart = () => {
    setParts((current) => {
      if (current.length >= MAX_PARTS) {
        return current;
      }
      return [...current, { kind: "string", value: "" }];
    });
  };

  const removePart = (index: number) => {
    setParts((current) =>
      current.length <= 1 ? current : current.filter((_, partIndex) => partIndex !== index),
    );
  };

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    const height = panelRef.current?.offsetHeight ?? 280;
    if (!rect) {
      return;
    }
    setPanelStyle(panelStyleFromRect(rect, height));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    updatePosition();
  }, [hasNumber, open, parts.length, updatePosition]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    firstInputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointer = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      if (target instanceof Element && target.closest("[data-select-popup]")) {
        return;
      }
      setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div>
      <button
        ref={triggerRef}
        aria-controls={open ? dialogId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-linen-300 bg-surface px-3 text-xs font-semibold text-ink-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 disabled:cursor-not-allowed disabled:border-linen-200 disabled:bg-linen-100 disabled:text-neutral-400 disabled:shadow-none"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <ListOrdered aria-hidden className="h-3.5 w-3.5" />
        Auto fill
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              aria-labelledby={titleId}
              className="flex flex-col rounded-xl border border-linen-200 bg-surface p-3 shadow-2xl ring-1 ring-ink-900/5"
              id={dialogId}
              role="dialog"
              style={panelStyle}
            >
              <h2 className="text-sm font-semibold text-ink-900" id={titleId}>
                Auto fill serials
              </h2>
              <div className="mt-3 flex flex-col gap-2.5">
                {parts.map((part, index) => (
                  <div key={`part-${String(index)}`} className="flex items-center gap-2">
                    <SerialKindSelect
                      ariaLabel={`Part ${index + 1} type`}
                      onChange={(kind) => {
                        if (kind === "number" && !/^\d+$/.test(part.value.trim())) {
                          updatePart(index, { kind, value: "1" });
                          return;
                        }
                        updatePart(index, { kind });
                      }}
                      value={part.kind}
                    />
                    <input
                      ref={index === 0 ? firstInputRef : undefined}
                      aria-label={
                        part.kind === "number"
                          ? `Part ${index + 1} number`
                          : `Part ${index + 1} string`
                      }
                      className="h-8 min-w-0 flex-1 rounded-md border border-linen-200 bg-field-silver px-2 text-sm outline-none focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-100"
                      inputMode={part.kind === "number" ? "numeric" : "text"}
                      maxLength={20}
                      onChange={(event) => {
                        const next =
                          part.kind === "number"
                            ? event.target.value.replaceAll(/[^\d]/g, "")
                            : event.target.value;
                        updatePart(index, { value: next });
                      }}
                      placeholder={part.kind === "number" ? "1" : "abc"}
                      value={part.value}
                    />
                    <button
                      aria-label={`Remove part ${index + 1}`}
                      className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition hover:bg-rose-50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={!canRemovePart}
                      onClick={() => removePart(index)}
                      type="button"
                    >
                      <Trash2 aria-hidden className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-linen-300 text-xs font-semibold text-ink-800 transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!canAddPart}
                  onClick={addPart}
                  type="button"
                >
                  <Plus aria-hidden className="h-3.5 w-3.5" />
                  Add
                </button>

                {hasNumber ? (
                  <fieldset className="min-w-0">
                    <legend className="mb-1 text-[11px] font-semibold text-neutral-600">
                      Direction
                    </legend>
                    <div className="grid grid-cols-2 gap-1.5">
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-linen-200 px-2 py-1.5 text-xs has-[:checked]:border-teal-400 has-[:checked]:bg-teal-50">
                        <input
                          checked={direction === "increase"}
                          className="accent-teal-700"
                          name={directionName}
                          onChange={() => setDirection("increase")}
                          type="radio"
                          value="increase"
                        />
                        Increase
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-linen-200 px-2 py-1.5 text-xs has-[:checked]:border-teal-400 has-[:checked]:bg-teal-50">
                        <input
                          checked={direction === "decrease"}
                          className="accent-teal-700"
                          name={directionName}
                          onChange={() => setDirection("decrease")}
                          type="radio"
                          value="decrease"
                        />
                        Decrease
                      </label>
                    </div>
                  </fieldset>
                ) : null}
              </div>

              <div className="mt-3 flex justify-end gap-2 border-t border-linen-100 pt-2">
                <button
                  className="inline-flex h-8 cursor-pointer items-center rounded-md px-3 text-xs font-medium text-neutral-600 hover:bg-linen-50"
                  onClick={close}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-8 cursor-pointer items-center rounded-md bg-ink-900 px-3 text-xs font-semibold text-surface hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!canFill}
                  onClick={() => {
                    if (onFill(form)) {
                      close();
                    }
                  }}
                  type="button"
                >
                  Fill
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
