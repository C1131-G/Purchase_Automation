import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/button";
import { CreatePageWrapper } from "@/features/create-pages/create-shared/components/layout/create-page-wrapper";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { CreatedBatchesTable } from "@/features/create-pages/create-shared/lot-setup/created-batches-table";
import { CreatedSerialsTable } from "@/features/create-pages/create-shared/lot-setup/created-serials-table";
import { LotDocumentRowsTable } from "@/features/create-pages/create-shared/lot-setup/lot-document-rows-table";
import type { LotSetupKind } from "@/features/create-pages/create-shared/lot-setup/lot-setup.types";
import { resolveLotSetupAfterOk } from "@/features/create-pages/create-shared/lot-setup/lot-setup.utils";
import { useLotSetup } from "@/features/create-pages/create-shared/lot-setup/use-lot-setup";
import { useGRPOLines } from "@/store/create/grpo-create.store";
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
  const returnTo = session.returnTo ?? { to: "/purchase/create-grpo" };

  const handleCancel = () => {
    void navigate({
      search: (returnTo.search ?? {}) as Record<string, never>,
      to: returnTo.to,
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
        search: selectedRowId ? { selectedRowId } : {},
        to: next.path,
      });
      return;
    }
    if (next.type === "continue-submit") {
      session.requestContinueSubmit();
      void navigate({
        search: (returnTo.search ?? {}) as Record<string, never>,
        to: returnTo.to,
      });
      return;
    }
    handleCancel();
  };

  return (
    <CreatePageWrapper
      breadcrumbParent={{ label: "GRPO", to: "/purchase/grpo" }}
      dashboardUrl="/dashboard/purchase"
      pageTitle={title}
    >
      <div className="flex flex-col gap-4">
        <SectionCard title="Rows from Documents">
          <LotDocumentRowsTable
            activeRowId={setup.activeRowId}
            docLabel={setup.docLabel}
            kind={kind}
            onNeededQtyChange={(rowId, quantity) => setup.patchRow(rowId, { quantity })}
            onSelectRow={setup.setActiveRowId}
            rows={setup.documentRows}
            warehouseNameByCode={setup.warehouseNameByCode}
          />
        </SectionCard>
        <SectionCard title={kind === "serials" ? "Created Serial Numbers" : "Created Batches"}>
          {kind === "serials" ? (
            <CreatedSerialsTable
              binRequired={setup.binRequired}
              onChange={setup.updateActiveSerial}
              row={setup.activeRow}
            />
          ) : (
            <CreatedBatchesTable
              binRequired={setup.binRequired}
              onAddSplit={setup.splitActiveBatch}
              onChange={setup.updateActiveBatch}
              onRemove={setup.removeActiveBatch}
              row={setup.activeRow}
            />
          )}
        </SectionCard>
        {formError || setup.pageError ? (
          <p className="text-sm text-red-700" role="alert">
            {formError || setup.pageError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-4 text-xs text-neutral-600">
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
            <Button onClick={handleCancel} size="sm" type="button" variant="outline">
              Cancel
            </Button>
            <Button onClick={handleOk} size="sm" type="button">
              OK
            </Button>
          </div>
        </div>
      </div>
    </CreatePageWrapper>
  );
}
