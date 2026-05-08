import React, { useEffect, useRef, useState } from "react";

import { PopoverContext, usePopover } from "@/components/context/popover-context";
import type {
  PopoverContentProps,
  PopoverRootProps,
  PopoverTriggerProps,
} from "@/components/types/popover.types";
import { cn } from "@/shared/utils/cn";
import { MOTION_EASING, MOTION_MS } from "@/shared/utils/motion";

// Popover: Floating industrial utility container with high-elevation XL shadows.
function PopoverRoot({ children, defaultOpen = false }: PopoverRootProps) {
  const [open, setOpen] = useState(() => defaultOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentId = React.useId();
  const previousOpenRef = useRef(open);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!open) {
        return;
      }

      const target = event.target as Node;
      const clickedTrigger = triggerRef.current?.contains(target);
      const clickedContent = contentRef.current?.contains(target);

      if (!clickedTrigger && !clickedContent) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (!open) {
        return;
      }
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  useEffect(() => {
    // Return focus to trigger when popover closes for keyboard/screen-reader users.
    if (previousOpenRef.current && !open) {
      triggerRef.current?.focus();
    }
    previousOpenRef.current = open;
  }, [open]);

  return (
    <PopoverContext.Provider value={{ contentId, contentRef, open, setOpen, triggerRef }}>
      <div className="relative">{children}</div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  children,
  className,
  asChild = false,
  ...props
}: PopoverTriggerProps) {
  const { open, setOpen, triggerRef, contentId } = usePopover();

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (e.defaultPrevented) {
      return;
    }
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    const childrenElement = children as React.ReactElement;
    const childrenProps = childrenElement.props as {
      onClick?: (e: React.MouseEvent) => void;
    };
    return React.cloneElement(childrenElement, {
      // ref: triggerRef, // Removed as per instruction "Avoid accessing `ref` during `cloneElement`"
      "aria-expanded": open,
      "aria-haspopup": "true", // Changed from 'dialog' to 'true' as per snippet
      "aria-controls": contentId,
      onClick: (e: React.MouseEvent) => {
        childrenProps.onClick?.(e);
        handleTriggerClick(e);
      },
      ...props,
    });
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-expanded={open}
      aria-haspopup="true" // Changed from 'dialog' to 'true' as per snippet
      aria-controls={contentId}
      onClick={handleTriggerClick}
      className={cn("active:scale-[0.95] transition-transform", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function PopoverContent({
  children,
  className,
  side = "bottom",
  align = "end",
  unstyled = false,
  id,
}: PopoverContentProps) {
  const { open, contentRef, contentId } = usePopover();
  if (!open) {
    return null;
  }

  return (
    <div
      ref={contentRef}
      id={id ?? contentId}
      role="dialog"
      aria-modal="false"
      data-popover-content
      className={cn(
        "absolute z-999 pointer-events-auto",
        "transition-all ease-out opacity-100 scale-100 translate-y-0",
        side === "bottom" ? "mt-2 top-full" : "mb-2 bottom-full",
        align === "start" && "left-0 origin-top-left",
        align === "center" && "left-1/2 -translate-x-1/2 origin-top",
        align === "end" && "right-0 origin-top-right",
        className,
      )}
      style={{
        transitionDuration: `${MOTION_MS.popoverEnter}ms`,
        transitionTimingFunction: MOTION_EASING.smoothOut,
      }}
    >
      {unstyled ? (
        children
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white text-zinc-900 shadow-xl ring-1 ring-black/5 min-w-50">
          {children}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const Popover = {
  Content: PopoverContent,
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  usePopoverContext: usePopover,
};
