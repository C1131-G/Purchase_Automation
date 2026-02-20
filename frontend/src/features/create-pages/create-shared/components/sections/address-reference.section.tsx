import { type ComponentProps } from 'react'

import { AddressGrid } from '@/features/create-pages/create-shared/components/grids/address-grid'
import { ReferenceGrid } from '@/features/create-pages/create-shared/components/grids/reference-grid'

type AddressReferenceSectionProps = ComponentProps<typeof AddressGrid> &
  ComponentProps<typeof ReferenceGrid>

export function AddressReferenceSection({
  billToAddress,
  shipToAddress,
  onBillToAddressChange,
  onShipToAddressChange,
  billToAddressInvalid,
  shipToAddressInvalid,
  billToAddressErrorText,
  shipToAddressErrorText,
  referenceNo,
  comments,
  onReferenceNoChange,
  onCommentsChange,
  referenceNoInvalid,
  commentsInvalid,
  referenceNoErrorText,
  commentsErrorText,
}: AddressReferenceSectionProps) {
  return (
    <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
      <AddressGrid
        billToAddress={billToAddress}
        shipToAddress={shipToAddress}
        onBillToAddressChange={onBillToAddressChange}
        onShipToAddressChange={onShipToAddressChange}
        billToAddressInvalid={billToAddressInvalid}
        shipToAddressInvalid={shipToAddressInvalid}
        billToAddressErrorText={billToAddressErrorText}
        shipToAddressErrorText={shipToAddressErrorText}
      />
      <ReferenceGrid
        referenceNo={referenceNo}
        comments={comments}
        onReferenceNoChange={onReferenceNoChange}
        onCommentsChange={onCommentsChange}
        referenceNoInvalid={referenceNoInvalid}
        commentsInvalid={commentsInvalid}
        referenceNoErrorText={referenceNoErrorText}
        commentsErrorText={commentsErrorText}
      />
    </div>
  )
}
