import { type ComponentProps } from 'react'

import { DocumentDetailsGrid } from '@/components/create/grids/document-details-grid'

type DocumentDetailsSectionProps = ComponentProps<typeof DocumentDetailsGrid>

export function DocumentDetailsSection(props: DocumentDetailsSectionProps) {
  return <DocumentDetailsGrid {...props} />
}
