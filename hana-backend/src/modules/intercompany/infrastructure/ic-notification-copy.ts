/**
 * Short IC notification copy: CardName + navigable doc label.
 * Never says “Vendor” / “Customer” and never prefers CardCode over CardName.
 */

/** BP display name only (no role prefix). Empty when name unknown. */
export const formatIcPartyName = (cardName: string | null | undefined): string => {
  if (cardName == null) {
    return "";
  }
  return String(cardName).trim();
};

/**
 * @deprecated Prefer formatIcPartyName — same result (CardName only, no "Vendor" label).
 */
export const formatIcVendorParty = formatIcPartyName;

/**
 * @deprecated Prefer formatIcPartyName — same result (CardName only, no "Customer" label).
 */
export const formatIcCustomerParty = formatIcPartyName;

/** e.g. "AJAX Industries created RFQ 9001" */
export const formatIcCreatedMessage = (party: string, docLabel: string): string => {
  const name = party.trim();
  return name ? `${name} created ${docLabel}` : `Created ${docLabel}`;
};

/** e.g. "AJAX Industries submitted RFQ 9001" */
export const formatIcSubmittedMessage = (party: string, docLabel: string): string => {
  const name = party.trim();
  return name ? `${name} submitted ${docLabel}` : `Submitted ${docLabel}`;
};

/** e.g. "AJAX Industries · PQ No 2042" (party + single navigable doc) */
export const formatIcPartyDocMessage = (party: string, docLabel: string): string => {
  const name = party.trim();
  return name ? `${name} · ${docLabel}` : docLabel;
};
