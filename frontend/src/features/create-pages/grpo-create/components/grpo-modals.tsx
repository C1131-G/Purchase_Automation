import { SharedCreateModals } from '@/features/create-pages/create-shared/components/modals/shared-create-modals'
import { type useGRPOCreate } from '@/features/create-pages/grpo-create/hooks/use-grpo-create'

interface GRPOModalsProps {
  state: ReturnType<typeof useGRPOCreate>
}

export function GRPOModals({ state }: GRPOModalsProps) {
  return (
    <SharedCreateModals
      state={state}
      entityLabels={{
        vendorPopupTitle: 'Loading vendor popup',
        vendorErrorMsg: 'Unable to load vendors',
      }}
    />
  )
}
