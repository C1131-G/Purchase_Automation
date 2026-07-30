/**
 * Sales-side RFQ customer (buyer BP on seller books).
 *
 * IC_RFQ_HEADER.VENDOR_CODE is the buyer-side vendor code (routing key).
 * Seller RFQ/SQ UI must show the buyer as **customer** on the seller company —
 * IC_BP_MAPPING.BUYER_CUSTOMER_CODE + CardName (or source company name).
 */

import { executeTenantQuery } from "@/db/tenant-query";
import { createBpMappingQueries } from "@/modules/intercompany/config/bp-mapping/bp-mapping.queries";
import { createCompanyQueries } from "@/modules/intercompany/config/company/company.queries";
import { logger } from "@/core/logger/pino-logger";

import type { IcRfqHeader } from "./rfq.types";

const toStr = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const str = String(value).trim();
  return str || null;
};

const loadCustomerName = async (dbName: string, cardCode: string): Promise<string | null> => {
  if (!cardCode) {
    return null;
  }
  try {
    const rows = (await executeTenantQuery(
      dbName,
      `SELECT "CardName" FROM "OCRD" WHERE "CardCode" = ?`,
      [cardCode],
    )) as Array<Record<string, unknown>>;
    return toStr(rows[0]?.CardName ?? rows[0]?.cardName);
  } catch (err: unknown) {
    logger.warn({
      err: err instanceof Error ? err : new Error(String(err)),
      msg: "RFQ customer display: OCRD lookup failed",
      cardCode,
      dbName,
    });
    return null;
  }
};

export type RfqCustomerDisplay = {
  customerCode: string | null;
  customerName: string | null;
};

/**
 * Resolve buyer-as-customer for seller RFQ UI.
 * Never throws — returns nulls on failure.
 */
export const resolveRfqCustomerDisplay = async (
  header: IcRfqHeader,
): Promise<RfqCustomerDisplay> => {
  const sourceName = toStr(header.sourceCompanyName) ?? null;
  const vendorCode = toStr(header.vendorCode) ?? "";

  try {
    const mapping = vendorCode
      ? await createBpMappingQueries().findByBuyerAndVendorCode(header.sourceCompanyId, vendorCode)
      : null;

    const customerCode = toStr(mapping?.buyerCustomerCode) ?? null;

    if (!customerCode) {
      return {
        customerCode: null,
        // Fallback: buyer company name (e.g. AJAX when AJAX bought from seller).
        customerName: sourceName,
      };
    }

    // Prefer CardName on seller SAP DB (target company).
    const seller = await createCompanyQueries().getById(header.targetCompanyId);
    const sellerDb = seller?.sapDbName?.trim() || "";
    const cardName = sellerDb ? await loadCustomerName(sellerDb, customerCode) : null;

    return {
      customerCode,
      customerName: cardName ?? sourceName,
    };
  } catch (err: unknown) {
    logger.warn({
      err: err instanceof Error ? err : new Error(String(err)),
      msg: "RFQ customer display resolve failed",
      rfqId: header.rfqId,
      sourceCompanyId: header.sourceCompanyId,
      vendorCode,
    });
    return {
      customerCode: null,
      customerName: sourceName,
    };
  }
};

/** Attach customerCode / customerName for sales RFQ UI. */
export const withRfqCustomerDisplay = async (header: IcRfqHeader): Promise<IcRfqHeader> => {
  const customer = await resolveRfqCustomerDisplay(header);
  return {
    ...header,
    customerCode: customer.customerCode,
    customerName: customer.customerName,
  };
};

/** List path: attach customer display to every header (best-effort). */
export const withRfqCustomerDisplayList = async (
  headers: IcRfqHeader[],
): Promise<IcRfqHeader[]> => {
  if (headers.length === 0) {
    return headers;
  }
  return Promise.all(headers.map((header) => withRfqCustomerDisplay(header)));
};
