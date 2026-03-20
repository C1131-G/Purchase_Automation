import { type ZodError } from 'zod'

export const getSearchPrereqMissing = (
  nameInput: string,
  codeInput: string,
  salesEmployeeInput: string,
  effectiveWarehouseCode: string,
) => ({
  customerName: !nameInput.trim(),
  customerCode: !codeInput.trim(),
  salesEmployee: !salesEmployeeInput.trim(),
  warehouse: !effectiveWarehouseCode.trim(),
})

export const canSearchProductsFromPrereq = (searchPrereqMissing: Record<string, boolean>) =>
  Object.values(searchPrereqMissing).every((isMissing) => !isMissing)

export const getSearchProductsBlockedReason = (
  searchPrereqTouched: boolean,
  canSearchProducts: boolean,
) =>
  searchPrereqTouched && !canSearchProducts
    ? 'Select Customer Name, Customer Code, Sales Employee, and Warehouse before searching products.'
    : null

export const getZodTopLevelFieldErrors = (error: ZodError) =>
  Array.from(
    new Set(
      error.issues
        .map((issue) => issue.path[0])
        .filter((field): field is string => typeof field === 'string'),
    ),
  )
