/** Address Utils: Universal reconciliation rules for Bill-To and Ship-To addresses. */

/**
 * Reconciles Bill-To and Ship-To addresses.
 * If Ship-To is a partial prefix of Bill-To (ignoring punctuation/case),
 * it is assumed to be a truncated duplicate and the full Bill-To address is returned.
 * 
 * @param billTo The source Bill-To address block.
 * @param shipTo The source Ship-To address block.
 * @returns The reconciled Ship-To address.
 */
export const reconcileAddresses = (billTo: string, shipTo: string): string => {
  const bA = (billTo || '').trim()
  const sA = (shipTo || '').trim()
  
  if (!sA) return bA
  if (!bA) return sA

  const bClean = bA.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  const sClean = sA.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

  // If ship-to is just a (likely truncated) beginning of bill-to, prefer bill-to
  if (sClean && bClean.startsWith(sClean) && bClean.length > sClean.length) {
    return bA
  }

  return sA
}
