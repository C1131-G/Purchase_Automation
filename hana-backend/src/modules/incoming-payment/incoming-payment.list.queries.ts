// Incoming Payment Service: Logic for processing payments from customers. Manages HANA database lookups for listings and SAP Service Layer for payment transactions.

import { getTenantRepository } from "@/db/tenant-query";
import type { PaymentFilters } from "./incoming-payment.types";
import { IncomingPaymentSchema } from "@/db/schemas/incoming-payment.schema";
import type { IncomingPayment } from "@/db/schemas/incoming-payment.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup";
import { PageService } from "@/services/page-service";
// Fetches a paginated list of Incoming Payments from HANA.

export const getPayments = async (dbName: string, filters: PaymentFilters) => {
  try {
    const repo = await getTenantRepository(dbName, IncomingPaymentSchema);
    const queryBuilder = repo.createQueryBuilder("p");

    queryBuilder.where("1=1");

    // Dynamic Filter: Payment Document Number (Standard: DocNum).
    if (filters.DocNum) {
      queryBuilder.andWhere("CAST(p.docNum AS NVARCHAR) LIKE :docNum", {
        docNum: `%${filters.DocNum}%`,
      });
    }

    // Dynamic Filter: Customer Code (Standard: CardCode).
    if (filters.CardCode) {
      queryBuilder.andWhere("p.cardCode LIKE :cardCode", {
        cardCode: `%${filters.CardCode}%`,
      });
    }

    // Dynamic Filter: Customer Name search (Standard: CardName).
    if (filters.CardName) {
      queryBuilder.andWhere("LOWER(p.cardName) LIKE LOWER(:cardName)", {
        cardName: `%${filters.CardName}%`,
      });
    }

    // Dynamic Filter: Date Range Start (Standard: DocDate).
    if (filters.DocDateStart) {
      queryBuilder.andWhere("p.docDate >= :startDate", {
        startDate: filters.DocDateStart,
      });
    }

    // Dynamic Filter: Date Range End (Standard: DocDate).
    if (filters.DocDateEnd) {
      queryBuilder.andWhere("p.docDate <= :endDate", {
        endDate: filters.DocDateEnd,
      });
    }
    // Dynamic Filter: Total amount comparison.
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
    // Dynamic Filter: Counter reference.
    if (filters.CounterRef) {
      queryBuilder.andWhere("LOWER(p.counterRef) LIKE LOWER(:counterRef)", {
        counterRef: `%${filters.CounterRef}%`,
      });
    }

    const sortFieldMap: Record<string, string> = {
      CardCode: "p.cardCode",
      CardName: "p.cardName",
      DocDate: "p.docDate",
      DocNum: "p.docNum",
      DocTotal: "p.docTotal",
    };
    const requestedSortField = filters.sortBy ? sortFieldMap[filters.sortBy] : undefined;
    const requestedSortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const sort = requestedSortField
      ? ({ [requestedSortField]: requestedSortOrder } as Record<string, "ASC" | "DESC">)
      : ({ "p.docDate": "DESC", "p.docNum": "DESC" } as Record<string, "ASC" | "DESC">);

    // Executes paginated query and sorts by descending date/number by default.
    const result = await PageService.getPagedData<IncomingPayment>({
      dbName,
      entityName: "IncomingPayments",
      limit: Number(filters.limit) || 10,
      page: Number(filters.page) || 1,
      query: queryBuilder,
      sort,
    });

    // Transform database results to standardized API output.
    return {
      ...result,
      data: result.data.map((data) => ({
        CardCode: data.cardCode,
        CardName: data.cardName,
        CounterRef: data.counterRef,
        DocCurr: data.docCurr,
        DocDate: data.docDate,
        DocNum: data.docNum,
        DocTotal: data.docTotal,
        PaymentMode: data.paymentMode,
        id: data.docEntry,
      })),
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    throw caughtError;
  }
};

export const getPaymentDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, IncomingPaymentSchema);
  const queryBuilder = repo.createQueryBuilder("p");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("p.docNum", "DocNum").distinct(true);
  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(p.docNum AS NVARCHAR) LIKE :search", {
      search: `%${search.trim()}%`,
    });
  }
  queryBuilder.orderBy("p.docNum", "DESC");
  queryBuilder.take(safeLimit);

  const rows = await queryBuilder.getRawMany<{ DocNum: number | string }>();
  return rows
    .map((row) => String(row.DocNum).trim())
    .filter((value) => value.length > 0)
    .map((code) => ({ code, name: code }));
};

// Obtains detailed payment data, including which invoices were paid by this document.
