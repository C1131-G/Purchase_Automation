/**
 * Short IC notification copy: who (vendor/customer code) + navigable doc label.
 * No “open to review” fluff — the doc token is the highlight/navigation target.
 */

export const formatIcVendorParty = (vendorCode: string | null | undefined): string => {
  const code = vendorCode != null ? String(vendorCode).trim() : "";
  return code ? `Vendor ${code}` : "Vendor";
};

export const formatIcCustomerParty = (customerCode: string | null | undefined): string => {
  const code = customerCode != null ? String(customerCode).trim() : "";
  return code ? `Customer ${code}` : "Customer";
};

/** e.g. "Customer C-A-ON-B created RFQ 9001" */
export const formatIcCreatedMessage = (party: string, docLabel: string): string =>
  `${party} created ${docLabel}`;

/** e.g. "Vendor V-B submitted RFQ 9001" */
export const formatIcSubmittedMessage = (party: string, docLabel: string): string =>
  `${party} submitted ${docLabel}`;

/** e.g. "Vendor V-B · PQ No 2042" (party + single navigable doc) */
export const formatIcPartyDocMessage = (party: string, docLabel: string): string =>
  `${party} · ${docLabel}`;
