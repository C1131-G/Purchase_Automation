import { SharedCreateModals } from "@/features/create-pages/create-shared/components/modals/shared-create-modals";
import type { UseGRPOCreateReturn } from "@/features/create-pages/grpo-create/hooks/use-grpo-create";

interface GRPOModalsProps {
  state: UseGRPOCreateReturn;
}

export function GRPOModals({ state }: GRPOModalsProps) {
  return (
    <SharedCreateModals
      state={state}
      entityLabels={{
        vendorErrorMsg: "Unable to load vendors",
        vendorPopupTitle: "Loading vendor popup",
      }}
    />
  );
}
