import { useEffect, useRef } from "react";

interface VendorChangeConfirmationDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  description?: string;
  confirmDisabled?: boolean;
}

export function VendorChangeConfirmationDialog({
  open,
  onCancel,
  onConfirm,
  description = "Changing vendor will affect copied document data. Continue?",
  confirmDisabled = false,
}: VendorChangeConfirmationDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key === "Tab") {
        const atStart = document.activeElement === cancelButtonRef.current;
        const atEnd = document.activeElement === confirmButtonRef.current;
        if ((!event.shiftKey && atEnd) || (event.shiftKey && atStart)) {
          event.preventDefault();
          (event.shiftKey ? confirmButtonRef.current : cancelButtonRef.current)?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink-900/30"
      role="presentation"
    >
      <div
        aria-describedby="vendor-change-confirmation-description"
        aria-labelledby="vendor-change-confirmation-title"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl border border-linen-200 bg-surface p-5 shadow-lg"
        role="dialog"
      >
        <h2
          id="vendor-change-confirmation-title"
          className="mb-2 text-sm font-semibold text-ink-900"
        >
          Confirm Vendor Change
        </h2>
        <p id="vendor-change-confirmation-description" className="mb-4 text-sm text-neutral-500">
          {description}
        </p>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-full border border-linen-200 bg-surface px-4 py-1.5 text-xs font-medium text-ink-900 transition hover:bg-linen-50"
          >
            No
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            aria-busy={confirmDisabled}
            className="rounded-full border border-teal-600 bg-teal-600 px-4 py-1.5 text-xs font-medium text-surface transition hover:bg-teal-700"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
