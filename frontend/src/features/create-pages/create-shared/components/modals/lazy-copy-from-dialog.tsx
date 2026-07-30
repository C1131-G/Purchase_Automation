/**
 * Lazy CopyFromDialog — heavy virtualized list + multi-API browse should not
 * ship in the initial create-route chunk until the user opens Copy From.
 */
import { lazy, Suspense, type ComponentProps } from "react";

import { CreateModalSkeleton } from "@/components/skeleton/create-modal-skeleton";

const CopyFromDialogLazy = lazy(() =>
  import("@/features/create-pages/create-shared/components/modals/copy-from-dialog").then(
    (module) => ({
      default: module.CopyFromDialog,
    }),
  ),
);

type CopyFromDialogProps = ComponentProps<typeof CopyFromDialogLazy>;

export function LazyCopyFromDialog(props: CopyFromDialogProps) {
  if (!props.open) {
    return null;
  }

  return (
    <Suspense
      fallback={
        <CreateModalSkeleton
          title="Loading copy-from"
          subtitle="Finding source documents"
          panelClassName="max-w-3xl"
          columns={1}
          rows={8}
        />
      }
    >
      <CopyFromDialogLazy {...props} />
    </Suspense>
  );
}

export type { SourceDocType } from "@/features/create-pages/create-shared/components/modals/copy-from-dialog";
