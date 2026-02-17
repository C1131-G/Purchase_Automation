export const CREATE_REQUIRED_FIELD_COUNT = 9

export const PURCHASE_ORDER_MANDATORY_FIELDS = [
  'vendorCode',
  'vendorName',
  'docDueDate',
  'warehouseCode',
  'salesEmployee',
  'billToAddress',
  'shipToAddress',
  'referenceNo',
  'comments',
] as const

export const SALES_ORDER_MANDATORY_FIELDS = [...PURCHASE_ORDER_MANDATORY_FIELDS] as const

type MandatoryFieldValue = string | number | boolean | null | undefined

export const hasMandatoryCreateFields = (
  values: Record<string, MandatoryFieldValue>,
  requiredFields: readonly string[],
) =>
  requiredFields.every((field) => {
    const value = values[field]
    if (typeof value === 'number') return value > 0
    if (typeof value === 'boolean') return value
    return Boolean(String(value ?? '').trim())
  })

export const getMissingMandatoryCreateFields = (
  values: Record<string, MandatoryFieldValue>,
  requiredFields: readonly string[],
) =>
  requiredFields.filter((field) => {
    const value = values[field]
    if (typeof value === 'number') return value <= 0
    if (typeof value === 'boolean') return !value
    return !String(value ?? '').trim()
  })

export const getMissingMandatoryCreateFieldsTyped = <TField extends string>(
  values: Record<TField, MandatoryFieldValue>,
  requiredFields: readonly TField[],
) =>
  requiredFields.filter((field) => {
    const value = values[field]
    if (typeof value === 'number') return value <= 0
    if (typeof value === 'boolean') return !value
    return !String(value ?? '').trim()
  })
