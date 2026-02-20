import { type ComponentProps } from 'react'

import { DocumentDetailsGrid } from '@/features/create-pages/create-shared/components/grids/document-details-grid'

type DocumentDetailsSectionProps = ComponentProps<typeof DocumentDetailsGrid>

export function DocumentDetailsSection(props: DocumentDetailsSectionProps) {
  return <DocumentDetailsGrid {...props} />
}
