/**
 * Auto-reference utilities for document copy operations.
 * Provides consistent reference string formatting for traceability.
 */

/**
 * Document type display names for reference strings.
 */
const DOC_TYPE_DISPLAY_NAMES: Record<string, string> = {
  PurchaseOrder: 'Purchase Order',
  GoodsReceiptPO: 'GRPO',
  APInvoice: 'A/P Invoice',
  APCreditNote: 'A/P Credit Note',
  OutgoingPayment: 'Outgoing Payment',
}

/**
 * Plural forms of document types for multi-document references.
 */
const DOC_TYPE_PLURALS: Record<string, string> = {
  PurchaseOrder: 'Purchase Orders',
  GoodsReceiptPO: 'GRPOs',
  APInvoice: 'A/P Invoices',
  APCreditNote: 'A/P Credit Notes',
  OutgoingPayment: 'Outgoing Payments',
}

/**
 * Generates a reference string for a single source document.
 * Format: "Based on <Source Document Type> <Doc Num>"
 */
export function generateSingleSourceReference(
  docType: string,
  docNum: string,
): string {
  const displayName = DOC_TYPE_DISPLAY_NAMES[docType] || docType
  return `Based on ${displayName} ${docNum}`
}

/**
 * Generates a reference string for multiple source documents.
 * Format: "Based on <count> <Document Type Plural>"
 * If mixed types: "Based on <count> Documents"
 */
export function generateMultiSourceReference(
  documents: Array<{ docType: string; docNum: string }>,
): string {
  const count = documents.length
  if (count === 0) return ''
  if (count === 1) {
    return generateSingleSourceReference(documents[0]!.docType, documents[0]!.docNum)
  }

  // Check if all documents are the same type
  const firstType = documents[0]!.docType
  const allSameType = documents.every((doc) => doc.docType === firstType)

  if (allSameType) {
    const pluralName = DOC_TYPE_PLURALS[firstType] || 'Documents'
    return `Based on ${count} ${pluralName}`
  }

  // Mixed document types
  return `Based on ${count} Documents`
}

/**
 * Generates a short summary of source documents for reference.
 * Shows up to 3 document numbers, then ellipsis if more.
 * Format: "Based on <DocType> <Num1>, <Num2>..."
 */
export function generateShortDocListSummary(
  documents: Array<{ docType: string; docNum: string }>,
): string {
  const count = documents.length
  if (count === 0) return ''
  if (count === 1) {
    return generateSingleSourceReference(documents[0]!.docType, documents[0]!.docNum)
  }

  // Check if all documents are the same type
  const firstType = documents[0]!.docType
  const allSameType = documents.every((doc) => doc.docType === firstType)

  const displayName = allSameType
    ? DOC_TYPE_DISPLAY_NAMES[firstType] || firstType
    : 'Documents'

  if (count <= 3) {
    const docNums = documents.map((doc) => doc.docNum).join(', ')
    return `Based on ${displayName} ${docNums}`
  }

  // More than 3 documents - show count and first few numbers
  const shownNums = documents.slice(0, 3).map((doc) => doc.docNum).join(', ')
  const remaining = count - 3
  return `Based on ${displayName} ${shownNums} (+${remaining} more)`
}

/**
 * Extracts source document metadata from a reference string.
 * Returns null if the reference doesn't match expected format.
 */
export function parseReferenceToSourceDocs(
  reference: string,
): Array<{ docType: string; docNum: string }> | null {
  if (!reference.startsWith('Based on ')) return null

  // This is a simplified parser - in production you might want more robust parsing
  // For now, we store source metadata separately, so this is mainly for validation
  return null
}
