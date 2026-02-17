import { type ComponentProps } from 'react'

import { VendorCustomerGrid } from '@/components/create/grids/vendor-customer-grid'

type VendorCustomerSectionProps = ComponentProps<typeof VendorCustomerGrid>

export function VendorCustomerSection(props: VendorCustomerSectionProps) {
  return <VendorCustomerGrid {...props} />
}
