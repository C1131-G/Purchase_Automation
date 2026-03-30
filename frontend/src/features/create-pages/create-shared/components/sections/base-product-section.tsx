import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Lock, Plus, RefreshCw, Save } from 'lucide-react'
import { type ReactNode } from 'react'

import { Button } from '@/components/button'
import { Tooltip } from '@/components/tooltip'

interface BaseProductSectionProps {
  sectionId?: string
  title?: string

  // Search Action
  onSearchProducts: () => void
  onPrefetchProducts?: () => void
  searchLabel?: string
  hideSearch?: boolean

  // Validation Hints (Search)
  showRequiredHints?: boolean
  missingSearchFields?: string[]
  searchCompletionPercent?: number
  searchFieldsTotal?: number
  requiredFieldLabels?: Record<string, string>

  // Main Table Area
  children: ReactNode

  // Totals
  totals: {
    taxTotal: number
    netTotal: number
    grandTotal: number
  }
  currencyLabel?: string | null
  createError?: string | null

  // Footer Actions
  backToUrl: string
  backToLabel?: string
  submitLabel: string
  submitLoadingText: string
  isSubmitting: boolean
  onSubmit: () => void

  // Validation Hints (Submit)
  disabledReason?: string | null
  missingMandatoryFields?: string[]
  mandatoryCompletionPercent?: number
  mandatoryFieldsTotal?: number
  isEditMode?: boolean
  secondaryActions?: ReactNode
  showSubmitButton?: boolean
  isReadOnly?: boolean
}

/**
 * BaseProductSection: Shared container for Entity Product tables.
 * Centralizes header actions, totals display, and footer navigation/submission.
 */
export function BaseProductSection({
  sectionId,
  title = 'Product Details',
  onSearchProducts,
  onPrefetchProducts,
  searchLabel = 'Search Products',
  showRequiredHints = true,
  missingSearchFields = [],
  searchCompletionPercent = 0,
  searchFieldsTotal = 0,
  requiredFieldLabels = {},
  children,
  totals,
  currencyLabel,
  createError,
  backToUrl,
  backToLabel = 'Back to Table',
  submitLabel,
  submitLoadingText,
  isSubmitting,
  onSubmit,
  disabledReason,
  missingMandatoryFields = [],
  mandatoryCompletionPercent = 0,
  mandatoryFieldsTotal = 0,
  secondaryActions,
  showSubmitButton = true,
  isEditMode = false,
  hideSearch = false,
  isReadOnly = false,
}: BaseProductSectionProps) {
  const navigate = useNavigate()
  const effectiveHideSearch = hideSearch || isEditMode
  const isUpdateAction = submitLabel.toLowerCase().includes('update')
  const SubmitIcon = isUpdateAction ? RefreshCw : Save

  return (
    <section id={sectionId} className="mt-3 rounded-2xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <h3 className="whitespace-nowrap text-sm font-medium text-zinc-800">
          <span className="inline-flex items-center gap-2">
            <span>{title}</span>
            {isReadOnly ? <Lock className="h-3 w-3 text-zinc-400" aria-hidden="true" /> : null}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {showRequiredHints && !effectiveHideSearch && missingSearchFields.length > 0 && searchFieldsTotal > 0 ? (
            <Tooltip
              content={`Required fields: ${missingSearchFields.map((field) => requiredFieldLabels[field] ?? field).join(', ')}`}
              className="block w-auto max-w-none"
            >
              <span className="inline-flex cursor-help items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                <span>Required fields</span>
                <span
                  className="inline-block size-3 rounded-full border border-zinc-300"
                  style={{
                    background: `conic-gradient(#2563eb ${searchCompletionPercent}%, #e4e4e7 ${searchCompletionPercent}% 100%)`,
                  }}
                />
                <span>
                  {searchFieldsTotal - missingSearchFields.length}/{searchFieldsTotal}
                </span>
              </span>
            </Tooltip>
          ) : null}
          {!effectiveHideSearch && (
            <button
              type="button"
              onClick={onSearchProducts}
              onMouseEnter={onPrefetchProducts}
              onFocus={onPrefetchProducts}
              className="group inline-flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600"
            >
              <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              {searchLabel}
            </button>
          )}
        </div>
      </div>

      {children}

      <div className="border-t border-zinc-100 px-4 py-3">
        <div className="ml-auto w-full max-w-sm">
          <div className="space-y-1">
            <div className="flex items-center justify-end gap-3 border-b border-zinc-200/80 py-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Tax Total
              </span>
              {currencyLabel ? (
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-400">
                  {currencyLabel}
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
              {currencyLabel ? (
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-400">
                  {currencyLabel}
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
              {currencyLabel ? (
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  {currencyLabel}
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
            onClick={() => navigate({ to: backToUrl, search: { page: 1, limit: 10 } })}
            className="group h-11 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none"
          >
            <span className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              {backToLabel}
            </span>
          </Button>
          <div className="flex items-center gap-2">
            {disabledReason && !isSubmitting ? (
              showRequiredHints ? (
                missingMandatoryFields.length > 0 && mandatoryFieldsTotal > 0 ? (
                  <Tooltip
                    content={`Required fields: ${missingMandatoryFields.map((field) => requiredFieldLabels[field] ?? field).join(', ')}`}
                    className="block w-auto max-w-none"
                  >
                    <span className="inline-flex cursor-help items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                      <span>Required fields</span>
                      <span
                        className="inline-block size-3 rounded-full border border-zinc-300"
                        style={{
                          background: `conic-gradient(#2563eb ${mandatoryCompletionPercent}%, #e4e4e7 ${mandatoryCompletionPercent}% 100%)`,
                        }}
                      />
                      <span>
                        {mandatoryFieldsTotal - missingMandatoryFields.length}/
                        {mandatoryFieldsTotal}
                      </span>
                    </span>
                  </Tooltip>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                    <span className="inline-block size-2 rounded-full bg-amber-500" />
                    <span>Pick 1 product</span>
                  </span>
                )
              ) : null
            ) : null}
            {secondaryActions}
            {showSubmitButton && (
              <Button
                type="button"
                size="md"
                variant="outline"
                isLoading={isSubmitting}
                loadingText={submitLoadingText}
                onClick={onSubmit}
                className="group h-11 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 normal-case tracking-normal focus:outline-none focus:ring-0 ring-0 outline-none"
              >
                <span className="inline-flex items-center gap-2">
                  <SubmitIcon
                    className={
                      isUpdateAction
                        ? 'h-4 w-4 transition-all duration-300 group-hover:rotate-180 group-hover:text-blue-600'
                        : 'h-4 w-4 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:text-blue-600'
                    }
                  />
                  {submitLabel}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
