import type { Table } from "@tanstack/react-table";

import type { IcRetryQueueItem } from "@/features/intercompany/schemas/intercompany-api.schema";
import { TableToolbar } from "@/features/table-pages/table-shared/components/core/table-toolbar";

const IC_RETRY_BREADCRUMB = {
  href: "/intercompany/retries",
  page: "Retries Data Table",
  section: "Intercompany",
} as const;

export interface IcRetryToolbarProps {
  tableId: string;
  table: Table<IcRetryQueueItem>;
  onReset: () => void;
  /** Kept for call-site compatibility; sidebar shows queue health. */
  actionableCount?: number;
}

/**
 * Breadcrumb + search only.
 * No Create / View / Filter — retries are system-queued with a fixed column set.
 */
export function IcRetryToolbar({ tableId, table, onReset }: IcRetryToolbarProps) {
  return (
    <TableToolbar
      tableId={tableId}
      table={table}
      onReset={onReset}
      hideCreate
      hideView
      hideFilter
      breadcrumb={IC_RETRY_BREADCRUMB}
    />
  );
}
