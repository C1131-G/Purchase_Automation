import { type ComponentProps } from 'react'

import { VendorCustomerGrid } from '@/features/create-pages/create-shared/components/grids/vendor-customer-grid'

type VendorCustomerSectionProps = ComponentProps<typeof VendorCustomerGrid>

export function VendorCustomerSection(props: VendorCustomerSectionProps) {
  return <VendorCustomerGrid {...props} />
}
