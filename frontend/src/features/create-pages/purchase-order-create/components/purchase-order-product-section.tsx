import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Plus } from 'lucide-react'

import { Button } from '@/components/button'
import { Tooltip } from '@/components/tooltip'
import { CreateProductTable } from '@/features/create-pages/create-shared/components/tables/create-product-table'
import { PURCHASE_ORDER_MANDATORY_FIELDS } from '@/features/create-pages/create-shared/config/create-mandatory-fields'
import { type usePurchaseOrderCreate } from '@/features/create-pages/purchase-order-create/hooks/use-purchase-order-create'
import { REQUIRED_FIELD_LABEL_TEXT } from '@/features/create-pages/purchase-order-create/utils/po-create.utils'

type PurchaseOrderState = ReturnType<typeof usePurchaseOrderCreate>

interface PurchaseOrderProductSectionProps {
  sectionId: string
  missingSearchMandatoryFields: PurchaseOrderState['missingSearchMandatoryFields']
  searchRequiredCompletionPercent: PurchaseOrderState['searchRequiredCompletionPercent']
  searchMandatoryFields: PurchaseOrderState['searchMandatoryFields']
  openProductPopup: PurchaseOrderState['openProductPopup']
  prefetchProducts: PurchaseOrderState['prefetchProducts']
  productRows: PurchaseOrderState['productRows']
  productRowDrafts: PurchaseOrderState['productRowDrafts']
  effectiveWarehouseCode: PurchaseOrderState['effectiveWarehouseCode']
  openStockPreview: PurchaseOrderState['openStockPreview']
  updateProductRow: PurchaseOrderState['updateProductRow']
  removeProductRow: PurchaseOrderState['removeProductRow']
  setProductRowDraft: PurchaseOrderState['setProductRowDraft']
  clearProductRowDraft: PurchaseOrderState['clearProductRowDraft']
  totals: PurchaseOrderState['totals']
  summaryCurrencyLabel: PurchaseOrderState['summaryCurrencyLabel']
  createError: PurchaseOrderState['createError']
  createDisabledReason: PurchaseOrderState['createDisabledReason']
  createPurchaseOrderMutation: PurchaseOrderState['createPurchaseOrderMutation']
  missingMandatoryFields: PurchaseOrderState['missingMandatoryFields']
  requiredCompletionPercent: PurchaseOrderState['requiredCompletionPercent']
  handleCreateOrder: PurchaseOrderState['handleCreateOrder']
}

export function PurchaseOrderProductSection({
  sectionId,
  missingSearchMandatoryFields,
  searchRequiredCompletionPercent,
  searchMandatoryFields,
  openProductPopup,
  prefetchProducts,
  productRows,
  productRowDrafts,
  effectiveWarehouseCode,
  openStockPreview,
  updateProductRow,
  removeProductRow,
  setProductRowDraft,
  clearProductRowDraft,
  totals,
  summaryCurrencyLabel,
  createError,
  createDisabledReason,
  createPurchaseOrderMutation,
  missingMandatoryFields,
  requiredCompletionPercent,
  handleCreateOrder,
}: PurchaseOrderProductSectionProps) {
  const navigate = useNavigate()

  return (
    <section id={sectionId} className="mt-3 rounded-2xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <h3 className="whitespace-nowrap text-sm font-medium text-zinc-800">Product Details</h3>
        <div className="flex items-center gap-2">
          {missingSearchMandatoryFields.length > 0 ? (
            <Tooltip
              content={`Required fields: ${missingSearchMandatoryFields.map((field) => REQUIRED_FIELD_LABEL_TEXT[field as keyof typeof REQUIRED_FIELD_LABEL_TEXT]).join(', ')}`}
              className="block w-auto max-w-none"
            >
              <span className="inline-flex cursor-help items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                <span>Required fields</span>
                <span
                  className="inline-block size-3 rounded-full border border-zinc-300"
                  style={{
                    background: `conic-gradient(#2563eb ${searchRequiredCompletionPercent}%, #e4e4e7 ${searchRequiredCompletionPercent}% 100%)`,
                  }}
                />
                <span>
                  {searchMandatoryFields.length - missingSearchMandatoryFields.length}/
                  {searchMandatoryFields.length}
                </span>
              </span>
            </Tooltip>
          ) : null}
          {missingSearchMandatoryFields.length > 0 ? (
            <Tooltip
              content={`Required fields: ${missingSearchMandatoryFields.map((field) => REQUIRED_FIELD_LABEL_TEXT[field as keyof typeof REQUIRED_FIELD_LABEL_TEXT]).join(', ')}`}
              className="block w-auto max-w-none"
            >
              <span>
                <button
                  type="button"
                  onClick={() => openProductPopup(null)}
                  onMouseEnter={prefetchProducts}
                  onFocus={prefetchProducts}
                  className="group inline-flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600"
                >
                  <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  Search Products
                </button>
              </span>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => openProductPopup(null)}
              onMouseEnter={prefetchProducts}
              onFocus={prefetchProducts}
              className="group inline-flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600"
            >
              <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              Search Products
            </button>
          )}
        </div>
      </div>

      <CreateProductTable
        productRows={productRows}
        productRowDrafts={productRowDrafts}
        effectiveWarehouseCode={effectiveWarehouseCode}
        enforceStockLimit={false}
        openProductPopup={openProductPopup}
        openStockPreview={openStockPreview}
        updateProductRow={updateProductRow}
        removeProductRow={removeProductRow}
        setProductRowDraft={setProductRowDraft}
        clearProductRowDraft={clearProductRowDraft}
        prefetchProducts={prefetchProducts}
        totals={totals}
        summaryCurrencyLabel={summaryCurrencyLabel}
        createError={createError}
      />

      <div className="border-t border-zinc-100 px-4 py-3">
        <div className="ml-auto w-full max-w-sm">
          <div className="space-y-1">
            <div className="flex items-center justify-end gap-3 border-b border-zinc-200/80 py-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Tax Total
              </span>
              {summaryCurrencyLabel ? (
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-400">
                  {summaryCurrencyLabel}
                </span>
              ) : null}
              <span className="min-w-20 text-right text-base font-semibold text-zinc-800">
                {totals.taxTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-end gap-3 border-b border-zinc-200/80 py-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Net Total
              </span>
              {summaryCurrencyLabel ? (
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-400">
                  {summaryCurrencyLabel}
                </span>
              ) : null}
              <span className="min-w-20 text-right text-base font-semibold text-zinc-800">
                {totals.netTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-end gap-3 py-1">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">
                Grand Total
              </span>
              {summaryCurrencyLabel ? (
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  {summaryCurrencyLabel}
                </span>
              ) : null}
              <span className="min-w-20 text-right text-lg font-bold text-zinc-900">
                {totals.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        {createError ? (
          <p className="mt-2 text-right text-xs font-medium text-red-600">{createError}</p>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            size="md"
            variant="outline"
            onClick={() =>
              navigate({
                to: '/purchase/orders',
                search: { page: 1, limit: 10 },
              })
            }
            className="group h-11 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none"
          >
            <span className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              Back to Table
            </span>
          </Button>
          <div className="flex items-center gap-2">
            {createDisabledReason && !createPurchaseOrderMutation.isPending ? (
              missingMandatoryFields.length > 0 ? (
                <Tooltip
                  content={`Required fields: ${missingMandatoryFields.map((field) => REQUIRED_FIELD_LABEL_TEXT[field as keyof typeof REQUIRED_FIELD_LABEL_TEXT]).join(', ')}`}
                  className="block w-auto max-w-none"
                >
                  <span className="inline-flex cursor-help items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                    <span>Required fields</span>
                    <span
                      className="inline-block size-3 rounded-full border border-zinc-300"
                      style={{
                        background: `conic-gradient(#2563eb ${requiredCompletionPercent}%, #e4e4e7 ${requiredCompletionPercent}% 100%)`,
                      }}
                    />
                    <span>
                      {PURCHASE_ORDER_MANDATORY_FIELDS.length - missingMandatoryFields.length}/
                      {PURCHASE_ORDER_MANDATORY_FIELDS.length}
                    </span>
                  </span>
                </Tooltip>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                  <span className="inline-block size-2 rounded-full bg-amber-500" />
                  <span>Pick 1 product</span>
                </span>
              )
            ) : null}
            <Button
              type="button"
              size="md"
              variant="outline"
              isLoading={createPurchaseOrderMutation.isPending}
              loadingText="Creating..."
              onClick={handleCreateOrder}
              className="h-11 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none"
            >
              Create
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
