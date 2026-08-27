// Outgoing Payment Service: Manages payment transactions to vendors. Uses HANA database for listings and SAP Service Layer for payment creation.
import { getDisplayCurrency, resolveCurrencyCode } from "@/services/currency-format";

import { logger } from "@/core/logger/pino-logger";
import { getTenantRepository } from "@/db/tenant-query";
import type { PaymentFilters } from "./outgoing-payment.types";
import { OutgoingPaymentSchema } from "@/db/schemas/outgoing-payment.schema";
import type { OutgoingPayment } from "@/db/schemas/outgoing-payment.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup";
import { PageService } from "@/services/page-service";
import { getIcPartnerCodes } from "@/modules/intercompany/api/ic-partner-scope";
// Fetches a paginated list of Outgoing Payments from HANA.

export const getPayments = async (dbName: string, filters: PaymentFilters) => {
  try {
    const allowedCardCodes = await getIcPartnerCodes(dbName, "purchase");
    const repo = await getTenantRepository(dbName, OutgoingPaymentSchema);
    const queryBuilder = repo.createQueryBuilder("p");

    queryBuilder.where("1=1");
    if (allowedCardCodes.length === 0) queryBuilder.andWhere("1=0");
    else queryBuilder.andWhere("p.cardCode IN (:...allowedCardCodes)", { allowedCardCodes });

    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(p.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    if (filters.CardCode) {
      queryBuilder.andWhere("p.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    if (filters.CardName) {
      queryBuilder.andWhere("LOWER(p.cardName) LIKE LOWER(:cardName)", {
        cardName: `%${filters.CardName}%`,
      });
    }

    if (filters.DocDateStart) {
      queryBuilder.andWhere("p.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    if (filters.DocDateEnd) {
      queryBuilder.andWhere("p.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }

    if (filters.DocTotalOperator && filters.DocTotal !== undefined) {
      if (filters.DocTotalOperator === "eq") {
        queryBuilder.andWhere("p.docTotal = :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "lt") {
        queryBuilder.andWhere("p.docTotal < :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
      if (filters.DocTotalOperator === "gt") {
        queryBuilder.andWhere("p.docTotal > :docTotal", {
          docTotal: filters.DocTotal,
        });
      }
    }

    if (filters.PaymentMode) {
      queryBuilder.andWhere("p.paymentMode = :paymentMode", {
        paymentMode: filters.PaymentMode,
      });
    }

    const sortFieldMap: Record<string, string> = {
      CardCode: "p.cardCode",
      CardName: "p.cardName",
      DocDate: "p.docDate",
      DocNum: "p.docNum",
      DocTotal: "p.docTotal",
      PaymentMode: "p.paymentMode",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "p.docDate": "DESC", "p.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    const [result, displayCurrency] = await Promise.all([
      PageService.getPagedData<OutgoingPayment>({
        dbName,
        entityName: "OutgoingPayments",
        limit: Number(filters.limit) || 10,
        page: Number(filters.page) || 1,
        query: queryBuilder,
        sort,
      }),
      getDisplayCurrency(dbName),
    ]);
    return {
      ...result,
      data: result.data.map((data) => ({
        CardCode: data.cardCode,
        CardName: data.cardName,
        DocCurr: resolveCurrencyCode(data.docCurr, displayCurrency),
        DocDate: data.docDate,
        DocNum: data.docNum,
        DocTotal: data.docTotal,
        PaymentMode: data.paymentMode || undefined,
        id: data.docEntry,
      })),
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      err: caughtError,
      msg: "Failed to fetch Outgoing Payments from HANA",
    });
    throw caughtError;
  }
};

export const getPaymentDocNums = async (dbName: string, search?: string, limit?: number) => {
  const allowedCardCodes = await getIcPartnerCodes(dbName, "purchase");
  const repo = await getTenantRepository(dbName, OutgoingPaymentSchema);
  const queryBuilder = repo.createQueryBuilder("payment");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("payment.docNum", "DocNum").distinct(true);
  if (allowedCardCodes.length === 0) queryBuilder.where("1=0");
  else {
    queryBuilder.where("payment.cardCode IN (:...allowedCardCodes)", { allowedCardCodes });
  }
  if (search && search.trim().length > 0) {
    queryBuilder.andWhere("CAST(payment.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("payment.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();
  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Retrieves a full Outgoing Payment document, including the breakdown of invoices it pays off.
