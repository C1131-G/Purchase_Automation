import { Calendar as CalendarIcon } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

import { Calendar } from "@/components/calendar/calendar";
import { LOT_TEXT_FIELD_CLASS } from "@/features/create-pages/create-shared/lot-setup/lot-field-styles";
import {
  parseISODate,
  toDisplayDate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";

const CALENDAR_WIDTH = 288;
const CALENDAR_HEIGHT = 400;
const VIEW_MARGIN = 8;

interface LotExpiryDateCellProps {
  ariaLabel: string;
  onChange: (next: string | undefined) => void;
  portalContainer?: HTMLElement | null | undefined;
  value?: string | undefined;
}

function calendarPanelStyle(rect: DOMRect): CSSProperties {
  const left = Math.max(
    VIEW_MARGIN,
    Math.min(rect.left, window.innerWidth - CALENDAR_WIDTH - VIEW_MARGIN),
  );
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < CALENDAR_HEIGHT && rect.top > spaceBelow;
  let top = openUp ? rect.top - CALENDAR_HEIGHT - 4 : rect.bottom + 4;
  const maxTop = Math.max(VIEW_MARGIN, window.innerHeight - CALENDAR_HEIGHT - VIEW_MARGIN);
  if (top < VIEW_MARGIN) {
    top = VIEW_MARGIN;
  }
  if (top > maxTop) {
    top = maxTop;
  }
  return {
    height: CALENDAR_HEIGHT,
    left,
    position: "fixed",
    top,
    visibility: "visible",
    width: CALENDAR_WIDTH,
    zIndex: 1000,
  };
}

export function LotExpiryDateCell({
  ariaLabel,
  onChange,
  portalContainer,
  value,
}: LotExpiryDateCellProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({
    height: CALENDAR_HEIGHT,
    left: 0,
    position: "fixed",
    top: 0,
    visibility: "hidden",
    width: CALENDAR_WIDTH,
    zIndex: 1000,
  });

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setPanelStyle(calendarPanelStyle(rect));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

  useEffect(
    function manageExpiryCalendarInteractions() {
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
        setOpen(false);
      };
      const handleKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handlePointer);
      document.addEventListener("keydown", handleKey);
      document.addEventListener("fullscreenchange", updatePosition);
      window.addEventListener("resize", updatePosition);
      return () => {
        document.removeEventListener("mousedown", handlePointer);
        document.removeEventListener("keydown", handleKey);
        document.removeEventListener("fullscreenchange", updatePosition);
        window.removeEventListener("resize", updatePosition);
      };
    },
    [open, updatePosition],
  );

  const calendarPortalTarget =
    (typeof document !== "undefined" ? document.fullscreenElement : null) ??
    portalContainer ??
    (typeof document !== "undefined" ? document.body : null);

  return (
    <div ref={triggerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className={`${LOT_TEXT_FIELD_CLASS} relative flex cursor-pointer items-center justify-start pr-8 text-left text-xs hover:bg-surface`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={value ? "text-ink-900" : "text-neutral-400"}>
          {value ? toDisplayDate(value) : "Optional"}
        </span>
        <span className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-linen-200 bg-surface text-neutral-500">
          <CalendarIcon aria-hidden className="h-3 w-3" />
        </span>
      </button>
      {open && calendarPortalTarget
        ? createPortal(
            <div
              ref={panelRef}
              aria-label={ariaLabel}
              className="overflow-visible"
              onMouseDown={(event) => event.stopPropagation()}
              role="dialog"
              style={panelStyle}
            >
              <Calendar
                mode="single"
                onSelect={(next) => {
                  if (!(next instanceof Date)) {
                    return;
                  }
                  onChange(toISODate(next));
                  setOpen(false);
                }}
                {...(value ? { selected: parseISODate(value) } : {})}
              />
              {value ? (
                <div className="border-t border-linen-100 px-2 py-1.5">
                  <button
                    className="h-7 cursor-pointer rounded-md px-2 text-xs font-medium text-neutral-600 transition hover:bg-linen-50"
                    onClick={() => {
                      onChange(undefined);
                      setOpen(false);
                    }}
                    type="button"
                  >
                    Clear date
                  </button>
                </div>
              ) : null}
            </div>,
            calendarPortalTarget,
          )
        : null}
    </div>
  );
}
