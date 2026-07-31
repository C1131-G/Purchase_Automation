/**
 * Sales-side RFQ customer (buyer BP on seller books).
 *
 * IC_RFQ_HEADER.VENDOR_CODE is the buyer-side vendor code (routing key).
 * Seller RFQ/SQ UI must show the buyer as **customer** on the seller company —
 * IC_BP_MAPPING.BUYER_CUSTOMER_CODE + CardName (or source company name).
 *
 * List path is batched: O(companies + DBs) queries, not O(rows).
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

const mappingKey = (buyerCompanyId: number, vendorCode: string): string =>
  `${buyerCompanyId}|${vendorCode}`;

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

/** Batch CardName lookup for many card codes on one tenant DB. */
const loadCustomerNamesBatch = async (
  dbName: string,
  cardCodes: string[],
): Promise<Map<string, string>> => {
  const result = new Map<string, string>();
  const unique = [...new Set(cardCodes.map((cardCode) => cardCode.trim()).filter(Boolean))];
  if (!dbName || unique.length === 0) {
    return result;
  }

  // Keep IN-lists bounded for HANA parameter safety.
  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => "?").join(", ");
    try {
      const rows = (await executeTenantQuery(
        dbName,
        `SELECT "CardCode", "CardName" FROM "OCRD" WHERE "CardCode" IN (${placeholders})`,
        chunk,
      )) as Array<Record<string, unknown>>;
      for (const row of rows) {
        const code = toStr(row.CardCode ?? row.cardCode);
        const name = toStr(row.CardName ?? row.cardName);
        if (code && name) {
          result.set(code, name);
        }
      }
    } catch (err: unknown) {
      logger.warn({
        err: err instanceof Error ? err : new Error(String(err)),
        msg: "RFQ customer display: batch OCRD lookup failed",
        dbName,
        codeCount: chunk.length,
      });
    }
  }
  return result;
};

export type RfqCustomerDisplay = {
  customerCode: string | null;
  customerName: string | null;
};

/**
 * Resolve buyer-as-customer for seller RFQ UI (single header — detail/enrich path).
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

/**
 * List path: attach customer display to every header with batched lookups.
 * Avoids per-row BP + company + OCRD round-trips (was N×3 queries).
 */
export const withRfqCustomerDisplayList = async (
  headers: IcRfqHeader[],
): Promise<IcRfqHeader[]> => {
  if (headers.length === 0) {
    return headers;
  }

  try {
    const bpQueries = createBpMappingQueries();
    const companyQueries = createCompanyQueries();

    const sourceCompanyIds = [...new Set(headers.map((header) => header.sourceCompanyId))];
    const targetCompanyIds = [...new Set(headers.map((header) => header.targetCompanyId))];

    // One mapping list per distinct buyer (source) company — typically few.
    const mappingLists = await Promise.all(
      sourceCompanyIds.map(async (sourceId) => bpQueries.listActiveForCompany(sourceId)),
    );

    const customerCodeByBuyerVendor = new Map<string, string>();
    for (const list of mappingLists) {
      for (const mapping of list) {
        const code = toStr(mapping.buyerCustomerCode);
        if (!code) {
          continue;
        }
        customerCodeByBuyerVendor.set(mappingKey(mapping.buyerCompanyId, mapping.vendorCode), code);
      }
    }

    // Seller company SAP DB (list is seller inbox — usually one target).
    const companies = await Promise.all(
      targetCompanyIds.map(async (id) => {
        const company = await companyQueries.getById(id);
        return [id, company] as const;
      }),
    );
    const companyById = new Map(companies);

    // Resolve customer codes in memory, then batch OCRD by tenant DB.
    const resolvedCodes: Array<{
      customerCode: string | null;
      dbName: string;
      sourceName: string | null;
    }> = headers.map((header) => {
      const sourceName = toStr(header.sourceCompanyName);
      const vendorCode = toStr(header.vendorCode) ?? "";
      const customerCode = vendorCode
        ? (customerCodeByBuyerVendor.get(mappingKey(header.sourceCompanyId, vendorCode)) ?? null)
        : null;
      const sellerDb = companyById.get(header.targetCompanyId)?.sapDbName?.trim() || "";
      return { customerCode, dbName: sellerDb, sourceName };
    });

    const codesByDb = new Map<string, string[]>();
    for (const row of resolvedCodes) {
      if (!row.customerCode || !row.dbName) {
        continue;
      }
      const list = codesByDb.get(row.dbName);
      if (list) {
        list.push(row.customerCode);
      } else {
        codesByDb.set(row.dbName, [row.customerCode]);
      }
    }

    const namesByDb = new Map<string, Map<string, string>>();
    await Promise.all(
      [...codesByDb.entries()].map(async ([dbName, codes]) => {
        namesByDb.set(dbName, await loadCustomerNamesBatch(dbName, codes));
      }),
    );

    return headers.map((header, index) => {
      const resolved = resolvedCodes[index];
      const customerCode = resolved?.customerCode ?? null;
      const sourceName = resolved?.sourceName ?? null;
      const dbName = resolved?.dbName ?? "";
      const cardName =
        customerCode && dbName ? (namesByDb.get(dbName)?.get(customerCode) ?? null) : null;

      return {
        ...header,
        customerCode,
        customerName: cardName ?? sourceName,
      };
    });
  } catch (err: unknown) {
    logger.warn({
      err: err instanceof Error ? err : new Error(String(err)),
      msg: "RFQ customer display list resolve failed; falling back per-row",
      count: headers.length,
    });
    // Best-effort fallback so list still returns.
    return Promise.all(headers.map((header) => withRfqCustomerDisplay(header)));
  }
};
