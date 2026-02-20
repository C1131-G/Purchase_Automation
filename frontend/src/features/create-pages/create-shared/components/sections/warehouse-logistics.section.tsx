import { type ComponentProps } from 'react'

import { WarehouseLogisticsGrid } from '@/features/create-pages/create-shared/components/grids/warehouse-logistics-grid'

type WarehouseLogisticsSectionProps = ComponentProps<typeof WarehouseLogisticsGrid>

export function WarehouseLogisticsSection(props: WarehouseLogisticsSectionProps) {
  return <WarehouseLogisticsGrid {...props} />
}
