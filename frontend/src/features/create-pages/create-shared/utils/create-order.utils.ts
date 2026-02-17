export const parseISODate = (value: string | undefined) => {
  if (!value) return new Date()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export const toISODate = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const toDisplayDate = (value: string | undefined) => {
  const date = parseISODate(value)
  return date.toLocaleDateString('en-GB')
}

const normalizeServiceLayerFieldMessage = (message: string) => {
  const compactMessage = message.replace(/\s+/g, ' ').trim()

  if (
    /Enter due date/i.test(compactMessage) ||
    /\[(ORDR|OPOR)\.DocDueDate\]/i.test(compactMessage)
  ) {
    return 'Delivery Date is required.'
  }

  return compactMessage.replace(/\s*\[[^[\]]+\]\s*$/g, '').trim()
}

export const normalizeCreateOrderErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof Error && error.message.trim()) {
    return normalizeServiceLayerFieldMessage(error.message)
  }

  return fallbackMessage
}
