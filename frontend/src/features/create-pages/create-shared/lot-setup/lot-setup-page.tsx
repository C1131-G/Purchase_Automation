import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/button";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { CreatedBatchesTable } from "@/features/create-pages/create-shared/lot-setup/created-batches-table";
import { CreatedSerialsTable } from "@/features/create-pages/create-shared/lot-setup/created-serials-table";
import { LotDocumentRowsTable } from "@/features/create-pages/create-shared/lot-setup/lot-document-rows-table";
import type { LotSetupKind } from "@/features/create-pages/create-shared/lot-setup/lot-setup.types";
import {
  grpoCreateReturnTarget,
  isGrpoCreateFlowPath,
  resolveLotSetupAfterOk,
} from "@/features/create-pages/create-shared/lot-setup/lot-setup.utils";
import { useLotSetup } from "@/features/create-pages/create-shared/lot-setup/use-lot-setup";
import { useGRPOCreateStore, useGRPOLines } from "@/store/create/grpo-create.store";
import { useGRPOLotSessionStore } from "@/store/create/grpo-lot-session.store";

interface LotSetupPageProps {
  kind: LotSetupKind;
  selectedRowId?: string;
}

export function LotSetupPage({ kind, selectedRowId }: LotSetupPageProps) {
  const navigate = useNavigate();
  const lines = useGRPOLines();
  const session = useGRPOLotSessionStore();
  const [formError, setFormError] = useState<string | null>(null);
  const setup = useLotSetup(kind, selectedRowId);
  const title = kind === "serials" ? "Serial Numbers - Setup" : "Batches - Setup";
  const returnTarget = grpoCreateReturnTarget(session.returnTo);

  useEffect(() => {
    return () => {
      if (isGrpoCreateFlowPath(window.location.pathname)) {
        return;
      }
      useGRPOCreateStore.getState().reset();
      useGRPOLotSessionStore.getState().reset();
    };
  }, []);

  const handleCancel = () => {
    void navigate({
      replace: true,
      search: returnTarget.search,
      to: returnTarget.to,
    });
  };

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
    const next = resolveLotSetupAfterOk({
      confirmed: {
        batchesConfirmed: session.batchesConfirmed,
        serialsConfirmed: session.serialsConfirmed,
      },
      hasPendingCreateAction: Boolean(session.pendingAction),
      kind,
      rows: lines,
    });
    if (next.type === "next") {
      void navigate({
        search: returnTarget.search,
        to: returnTarget.to,
      });
      return;
    }
    if (next.type === "continue-submit") {
      session.requestContinueSubmit();
      void navigate({
        replace: true,
        search: returnTarget.search,
        to: returnTarget.to,
      });
      return;
    }
    handleCancel();
  };

  return (
    <CreatePageWrapper
      breadcrumbParent={{
        label: setup.docLabel === "New" ? "Create GRPO" : `GRPO ${setup.docLabel}`,
        search: returnTarget.search,
        to: returnTarget.to,
      }}
      dashboardUrl="/dashboard/purchase"
      fillHeight
      pageTitle={title}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <SectionCard className="h-auto shrink-0" title="Rows from Documents">
          <LotDocumentRowsTable
            activeRowId={setup.activeRowId}
            docLabel={setup.docLabel}
            kind={kind}
            onNeededQtyChange={(rowId, quantity) => setup.patchRow(rowId, { quantity })}
            onSelectRow={setup.setActiveRowId}
            rows={setup.documentRows}
            warehouseNames={setup.warehouseNames}
          />
        </SectionCard>
        <SectionCard
          className="min-h-0 flex-1 overflow-hidden"
          title={kind === "serials" ? "Created Serial Numbers" : "Created Batches"}
        >
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
        </SectionCard>
        {formError ? (
          <p className="shrink-0 text-sm text-red-700" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-5 text-sm text-neutral-600">
            {kind === "batches" ? (
              <>
                <span>
                  Created Batches{" "}
                  <strong className="text-ink-900">{setup.footerCreatedCount}</strong>
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
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCancel} type="button" variant="outline">
              Cancel
            </Button>
            <Button onClick={handleOk} type="button">
              OK
            </Button>
          </div>
        </div>
      </div>
    </CreatePageWrapper>
  );
}
