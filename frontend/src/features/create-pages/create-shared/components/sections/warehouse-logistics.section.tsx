import { type ComponentProps } from 'react'

import { WarehouseLogisticsGrid } from '@/components/create/grids/warehouse-logistics-grid'

type WarehouseLogisticsSectionProps = ComponentProps<typeof WarehouseLogisticsGrid>

export function WarehouseLogisticsSection(props: WarehouseLogisticsSectionProps) {
  return <WarehouseLogisticsGrid {...props} />
}
