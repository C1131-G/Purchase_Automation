/**
 * IC notification copy: full IC company display names + navigable doc labels.
 * Never says “Vendor” / “Customer” and never prefers CardCode over a display name.
 *
 * Ownership (who owns the document):
 *   PQ / PO     → buyer company (e.g. AJAX Industries)
 *   RFQ / SQ / AR → seller company (e.g. RCM Trading)
 */

/** Company / BP display name only (no role prefix). Empty when name unknown. */
export const formatIcPartyName = (name: string | null | undefined): string => {
  if (name == null) {
    return "";
  }
  return String(name).trim();
};

/**
 * @deprecated Prefer formatIcPartyName — same result (name only, no "Vendor" label).
 */
export const formatIcVendorParty = formatIcPartyName;

/**
 * @deprecated Prefer formatIcPartyName — same result (name only, no "Customer" label).
 */
export const formatIcCustomerParty = formatIcPartyName;

/** e.g. "AJAX Industries created RFQ 9001" */
export const formatIcCreatedMessage = (party: string, docLabel: string): string => {
  const name = party.trim();
  return name ? `${name} created ${docLabel}` : `Created ${docLabel}`;
};

/** e.g. "RCM Trading submitted RFQ 9001" */
export const formatIcSubmittedMessage = (party: string, docLabel: string): string => {
  const name = party.trim();
  return name ? `${name} submitted ${docLabel}` : `Submitted ${docLabel}`;
};

/** e.g. "AJAX Industries · PQ No 2042" (party + single navigable doc) */
export const formatIcPartyDocMessage = (party: string, docLabel: string): string => {
  const name = party.trim();
  return name ? `${name} · ${docLabel}` : docLabel;
};

/**
 * RFQ auto-created on seller after buyer PQ save.
 * Owner of RFQ = seller; source = buyer PQ.
 * e.g. "RCM Trading: RFQ 9001 created automatically from AJAX Industries PQ No 2042"
 */
export const formatIcRfqCreatedMessage = (params: {
  sellerCompanyName: string;
  buyerCompanyName: string;
  rfqLabel: string;
  pqLabel?: string;
}): string => {
  const seller = params.sellerCompanyName.trim();
  const buyer = params.buyerCompanyName.trim();
  const rfqLabel = params.rfqLabel.trim();
  const pqLabel = params.pqLabel?.trim() || "";
  if (seller && buyer && pqLabel) {
    return `${seller}: ${rfqLabel} created automatically from ${buyer} ${pqLabel}`;
  }
  if (seller && buyer) {
    return `${seller}: ${rfqLabel} created automatically from ${buyer}`;
  }
  if (seller) {
    return `${seller}: ${rfqLabel} created automatically`;
  }
  if (buyer && pqLabel) {
    return `${rfqLabel} created automatically from ${buyer} ${pqLabel}`;
  }
  return `${rfqLabel} created automatically`;
};

/**
 * Seller submitted RFQ → notify buyer.
 * e.g. "RCM Trading submitted RFQ 9001"
 */
export const formatIcRfqSubmittedMessage = (params: {
  sellerCompanyName: string;
  rfqLabel: string;
}): string => formatIcSubmittedMessage(params.sellerCompanyName, params.rfqLabel);

/**
 * Buyer PQ updated from submitted RFQ.
 * e.g. "AJAX Industries: PQ No 2042 updated from RFQ 9001"
 */
export const formatIcPqUpdatedMessage = (params: {
  buyerCompanyName: string;
  pqLabel: string;
  rfqLabel: string;
}): string => {
  const buyer = params.buyerCompanyName.trim();
  const pqLabel = params.pqLabel.trim();
  const rfqLabel = params.rfqLabel.trim();
  if (buyer) {
    return `${buyer}: ${pqLabel} updated from ${rfqLabel}`;
  }
  return `${pqLabel} updated from ${rfqLabel}`;
};

/**
 * Seller SQ auto-created after convert.
 * e.g. "RCM Trading: SQ No 810 created automatically"
 */
export const formatIcSqCreatedMessage = (params: {
  sellerCompanyName: string;
  sqLabel: string;
}): string => {
  const seller = params.sellerCompanyName.trim();
  const sqLabel = params.sqLabel.trim();
  return seller
    ? `${seller}: ${sqLabel} created automatically`
    : `${sqLabel} created automatically`;
};

/**
 * Seller AR invoice auto-created after buyer PO.
 * e.g. "RCM Trading: AR Invoice No 55 created automatically from AJAX Industries PO No 188"
 */
export const formatIcArCreatedMessage = (params: {
  sellerCompanyName: string;
  buyerCompanyName: string;
  arLabel: string;
  poLabel?: string;
}): string => {
  const seller = params.sellerCompanyName.trim();
  const buyer = params.buyerCompanyName.trim();
  const arLabel = params.arLabel.trim();
  const poLabel = params.poLabel?.trim() || "";
  if (seller && buyer && poLabel) {
    return `${seller}: ${arLabel} created automatically from ${buyer} ${poLabel}`;
  }
  if (seller) {
    return `${seller}: ${arLabel} created automatically`;
  }
  return `${arLabel} created automatically`;
};
