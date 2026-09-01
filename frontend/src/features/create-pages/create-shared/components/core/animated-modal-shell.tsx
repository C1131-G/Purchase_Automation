/** AnimatedModalShell: Specialized CSS-transition wrapper for premium modal effects. */
import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { motion, useReducedMotion } from "motion/react";

import {
  CREATE_MODAL_MOTION_MS,
  CREATE_MODAL_OVERLAY_CLASS,
  CREATE_MODAL_PANEL_CLASS,
} from "@/features/create-pages/create-shared/config/create-ui.constants";
import { cn } from "@/shared/utils/cn";

interface AnimatedModalShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  overlayClassName?: string;
  panelClassName?: string;
  onAfterClose?: (() => void) | undefined;
  nativeDialog?: boolean;
  dialogLabelledBy?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export function AnimatedModalShell({
  open,
  onClose,
  children,
  overlayClassName,
  panelClassName,
  onAfterClose,
  nativeDialog = false,
  dialogLabelledBy,
  initialFocusRef,
}: AnimatedModalShellProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(open);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (nativeDialog || open || !onAfterClose) {
      return;
    }
    const timeout = window.setTimeout(() => {
      onAfterClose?.();
    }, CREATE_MODAL_MOTION_MS);
    return () => window.clearTimeout(timeout);
  }, [nativeDialog, onAfterClose, open]);

  useEffect(() => {
    if (!nativeDialog) {
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open) {
      wasOpenRef.current = true;
      const active = document.activeElement;
      if (active instanceof HTMLElement && !dialog.contains(active)) {
        restoreFocusRef.current = active;
      }
      if (!dialog.open) {
        dialog.showModal();
      }
      window.requestAnimationFrame(() => {
        (
          initialFocusRef?.current ?? dialog.querySelector<HTMLElement>("button, input, select")
        )?.focus();
      });
      return;
    }

    if (!wasOpenRef.current) {
      return;
    }
    if (dialog.open) {
      dialog.close();
    }
    restoreFocusRef.current?.focus();
    restoreFocusRef.current = null;
    wasOpenRef.current = false;
    onAfterClose?.();
  }, [initialFocusRef, nativeDialog, onAfterClose, open]);

  if (nativeDialog) {
    return (
      <dialog
        ref={dialogRef}
        aria-labelledby={dialogLabelledBy}
        className={cn(
          "fixed inset-0 m-0 flex h-full w-full max-h-none max-w-none items-center justify-center overflow-visible bg-transparent p-4 text-ink-900 backdrop:bg-ink-900/20 backdrop:backdrop-blur-sm",
          "[&::backdrop]:transition-opacity [&::backdrop]:duration-200",
          overlayClassName,
        )}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          animate={open ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
          className={cn(
            "relative z-10",
            CREATE_MODAL_PANEL_CLASS,
            "border-white/70 bg-surface/90 shadow-[0_24px_80px_-28px_rgba(15,30,46,0.42)] backdrop-blur-2xl",
            panelClassName,
          )}
          initial={{
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 0.98,
            y: prefersReducedMotion ? 0 : 8,
          }}
          transition={
            prefersReducedMotion
              ? { duration: 0.12 }
              : { damping: 1, duration: 0.34, type: "spring" }
          }
        >
          {children}
        </motion.div>
      </dialog>
    );
  }

  return (
    <div
      className={cn(
        CREATE_MODAL_OVERLAY_CLASS,
        overlayClassName,
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 z-0 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10",
          CREATE_MODAL_PANEL_CLASS,
          panelClassName,
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}
