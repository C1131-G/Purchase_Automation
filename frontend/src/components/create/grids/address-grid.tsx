import { SectionCard } from '@/components/create/core/section-card'

type AddressGridProps = {
  billToAddress: string
  shipToAddress: string
  onBillToAddressChange: (value: string) => void
  onShipToAddressChange: (value: string) => void
  billToAddressInvalid?: boolean | undefined
  shipToAddressInvalid?: boolean | undefined
  billToAddressErrorText?: string | undefined
  shipToAddressErrorText?: string | undefined
}

export function AddressGrid({
  billToAddress,
  shipToAddress,
  onBillToAddressChange,
  onShipToAddressChange,
  billToAddressInvalid,
  shipToAddressInvalid,
  billToAddressErrorText,
  shipToAddressErrorText,
}: AddressGridProps) {
  return (
    <SectionCard title="Address" className="lg:col-span-2">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label
            htmlFor="po-bill-to-address"
            className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
          >
            Bill To Address{' '}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <textarea
            id="po-bill-to-address"
            value={billToAddress}
            onChange={(event) => onBillToAddressChange(event.target.value)}
            placeholder="Enter Billing Address"
            className={`h-16 w-full rounded-xl border px-3 py-2 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 ${
              billToAddressInvalid
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200'
                : 'border-zinc-200 bg-zinc-50 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200'
            }`}
          />
          {billToAddressInvalid && billToAddressErrorText ? (
            <p className="mt-1 text-xs text-red-600">{billToAddressErrorText}</p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="po-ship-to-address"
            className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
          >
            Ship To Address{' '}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <textarea
            id="po-ship-to-address"
            value={shipToAddress}
            onChange={(event) => onShipToAddressChange(event.target.value)}
            placeholder="Enter Shipping Address"
            className={`h-16 w-full rounded-xl border px-3 py-2 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 ${
              shipToAddressInvalid
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200'
                : 'border-zinc-200 bg-zinc-50 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200'
            }`}
          />
          {shipToAddressInvalid && shipToAddressErrorText ? (
            <p className="mt-1 text-xs text-red-600">{shipToAddressErrorText}</p>
          ) : null}
        </div>
      </div>
    </SectionCard>
  )
}
