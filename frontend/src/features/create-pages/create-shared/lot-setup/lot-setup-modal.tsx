import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/button";
import { AnimatedModalShell } from "@/features/create-pages/create-shared/components/core/animated-modal-shell";
import { CreatedBatchesTable } from "@/features/create-pages/create-shared/lot-setup/created-batches-table";
import { CreatedSerialsTable } from "@/features/create-pages/create-shared/lot-setup/created-serials-table";
import { LotDocumentRowsTable } from "@/features/create-pages/create-shared/lot-setup/lot-document-rows-table";
import type { LotSetupKind } from "@/features/create-pages/create-shared/lot-setup/lot-setup.types";
import {
  lotSetupPrimaryActionLabel,
  lotSetupProgress,
  resolveLotSetupAfterOk,
} from "@/features/create-pages/create-shared/lot-setup/lot-setup.utils";
import { useLotSetup } from "@/features/create-pages/create-shared/lot-setup/use-lot-setup";
import { useGRPOLines } from "@/store/create/grpo-create.store";
import { useGRPOLotSessionStore } from "@/store/create/grpo-lot-session.store";
import { useSidebarOpen } from "@/store/sidebar/sidebar.store";

interface LotSetupModalProps {
  kind: LotSetupKind;
  open: boolean;
  selectedRowId?: string | undefined;
  onClose: () => void;
  /** Called after the whole lot setup flow completes (OK on last step, or submit triggered) */
  onAfterOk?: () => void;
}

/**
 * LotSetupInner: the actual setup UI for a given kind (batches or serials).
 * Kept separate so useLotSetup is always called with a stable `kind`.
 */
function LotSetupInner({
  kind,
  selectedRowId,
  onCancel,
  onOk,
}: {
  kind: LotSetupKind;
  selectedRowId?: string | undefined;
  onCancel: () => void;
  onOk: (result: ReturnType<typeof resolveLotSetupAfterOk>) => void;
}) {
  const lines = useGRPOLines();
  const session = useGRPOLotSessionStore();
  const [formError, setFormError] = useState<string | null>(null);

  // Pin to selectedRowId on mount only. After the first render we switch to
  // undefined so useLotSetup's effect no longer forces the row back —
  // allowing the user to freely navigate between rows in the top table.
  const [pinRowId, setPinRowId] = useState<string | undefined>(selectedRowId);
  const didUnpinRef = useRef(false);
  useEffect(() => {
    if (!didUnpinRef.current) {
      didUnpinRef.current = true;
      // Schedule unpin so useLotSetup gets ONE render with selectedRowId first
      const id = window.setTimeout(() => setPinRowId(undefined), 0);
      return () => window.clearTimeout(id);
    }
  }, []);

  const setup = useLotSetup(kind, pinRowId);

  const handleOk = () => {
    if (setup.pageError) {
      setFormError(setup.pageError);
      return;
    }
    if (kind === "serials") {
      session.confirmSerials();
    } else {
      session.confirmBatches();
    }
    const result = resolveLotSetupAfterOk({
      confirmed,
      hasPendingCreateAction: Boolean(session.pendingAction),
      kind,
      rows: lines,
    });
    if (result.type === "continue-submit") {
      session.requestContinueSubmit();
    }
    setFormError(null);
    onOk(result);
  };

  const title = kind === "serials" ? "Serial Numbers — Setup" : "Batches — Setup";
  const confirmed = {
    batchesConfirmed: session.batchesConfirmed,
    serialsConfirmed: session.serialsConfirmed,
  };
  const progress = lotSetupProgress(lines, kind);
  const primaryActionLabel = lotSetupPrimaryActionLabel({
    confirmed,
    hasPendingCreateAction: Boolean(session.pendingAction),
    kind,
    pendingAction: session.pendingAction,
    rows: lines,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-linen-200 px-4 py-2">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3">
        <section className="w-full shrink-0">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
            Rows from Documents
          </h3>
          <LotDocumentRowsTable
            activeRowId={setup.activeRowId}
            docLabel={setup.docLabel}
            kind={kind}
            onNeededQtyChange={(rowId, quantity) => setup.patchRow(rowId, { quantity })}
            onSelectRow={setup.setActiveRowId}
            rows={setup.documentRows}
            warehouseNames={setup.warehouseNames}
          />
        </section>

        <section className="flex min-h-0 flex-1 flex-col">
          <h3 className="mb-1 shrink-0 text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
            {kind === "serials" ? "Created Serial Numbers" : "Created Batches"}
          </h3>
          <div className="min-h-0 flex-1">
            {kind === "serials" ? (
              <CreatedSerialsTable
                binRequired={setup.binRequired}
                onAddSplit={setup.splitActiveSerial}
                onAutoFill={setup.applyActiveSerialAutoFill}
                onChange={setup.updateActiveSerial}
                onRemove={setup.removeActiveSerial}
                row={setup.activeRow}
              />
            ) : (
              <CreatedBatchesTable
                binRequired={setup.binRequired}
                onAddSplit={setup.splitActiveBatch}
                onAutoFill={setup.applyActiveBatchAutoFill}
                onChange={setup.updateActiveBatch}
                onRemove={setup.removeActiveBatch}
                row={setup.activeRow}
              />
            )}
          </div>
        </section>

        {formError ? (
          <p
            className="shrink-0 rounded-md border border-danger/20 bg-rose-50 px-2.5 py-1.5 text-xs text-danger"
            role="alert"
          >
            {formError}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-linen-200 px-4 py-2">
        <div className="flex flex-wrap gap-4 text-xs text-neutral-600">
          {kind === "batches" ? (
            <>
              <span>
                Created Batches <strong className="text-ink-900">{setup.footerCreatedCount}</strong>
              </span>
              <span>
                Created Qty <strong className="text-ink-900">{setup.footerCreatedQty}</strong>
              </span>
            </>
          ) : (
            <span>
              Total Created <strong className="text-ink-900">{setup.footerCreatedCount}</strong>
            </span>
          )}
          <span>
            Progress{" "}
            <strong className="text-ink-900">
              {progress.created} of {progress.needed}
            </strong>{" "}
            ({progress.percent}%)
          </span>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCancel} size="sm" type="button" variant="outline">
            Cancel
          </Button>
          <Button onClick={handleOk} size="sm" type="button">
            {primaryActionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * LotSetupModal: Renders batch/serial lot setup as a viewport-fitted popup.
 *
 * Handles multi-step flows (batches → serials) by switching kind inside the modal
 * instead of navigating to separate routes. The two tables (Rows from Documents +
 * Created Batches/Serials) are unchanged from the original page implementation.
 *
 * Bottom table columns:
 *   Serials: Serial No, Qty, Bin Location, Expiry Date
 *   Batches: Batch No, Qty, Bin Location, Expiry Date
 */
export function LotSetupModal({
  kind: initialKind,
  open,
  selectedRowId,
  onClose,
  onAfterOk,
}: LotSetupModalProps) {
  const sidebarOpen = useSidebarOpen();
  const [currentKind, setCurrentKind] = useState<LotSetupKind>(initialKind);

  useEffect(() => {
    if (open) {
      setCurrentKind(initialKind);
    }
  }, [initialKind, open]);

  // Reset kind when kind prop changes (new row opened)
  // We use a key on LotSetupInner to remount when kind changes
  const handleOk = (result: ReturnType<typeof resolveLotSetupAfterOk>) => {
    if (result.type === "next") {
      // Multi-step: switch to the next lot type (e.g. batches → serials)
      setCurrentKind(result.kind);
      return;
    }
    // "continue-submit" or "return" — close the modal
    onAfterOk?.();
    onClose();
  };

  const handleCancel = () => {
    setCurrentKind(initialKind);
    onClose();
  };

  return (
    <AnimatedModalShell
      open={open}
      onClose={handleCancel}
      overlayClassName={
        sidebarOpen
          ? "pl-[calc(var(--sidebar-width)+1rem)]"
          : "pl-4 md:pl-[calc(var(--sidebar-width-icon)+1rem)]"
      }
      panelClassName="flex h-[min(30rem,calc(100dvh-2rem))] w-full max-w-5xl max-h-[calc(100dvh-2rem)] flex-col overflow-hidden transition-[opacity,transform]"
    >
      <LotSetupInner
        key={currentKind}
        kind={currentKind}
        selectedRowId={selectedRowId}
        onCancel={handleCancel}
        onOk={handleOk}
      />
    </AnimatedModalShell>
  );
}
