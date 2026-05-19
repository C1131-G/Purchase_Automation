// Outgoing Payment Service: Manages payment transactions to vendors. Uses HANA database for listings and SAP Service Layer for payment creation.
import { In } from "typeorm";

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import type { PaymentFilters } from "@/dal/types/outgoing-payment.types";
import type { AccountQuery } from "@/dal/types/outgoing-payment-account.types";
import { GlAccountSchema } from "@/db/schemas/gl-account.schema";
import { APCreditMemoSchema } from "@/db/schemas/ap-credit-memo.schema";
import { APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";
import { OutgoingPaymentSchema } from "@/db/schemas/outgoing-payment.schema";
import type { OutgoingPayment } from "@/db/schemas/outgoing-payment.schema";
import { getSafeDocNumLimit } from "@/services/docnum-lookup.util";
import { PageService } from "@/services/page-service.service";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";

// Fetches a paginated list of Outgoing Payments from HANA.
export const getPayments = async (dbName: string, filters: PaymentFilters) => {
  try {
    const repo = await getTenantRepository(dbName, OutgoingPaymentSchema);
    const queryBuilder = repo.createQueryBuilder("p");

    queryBuilder.where("1=1");

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

    const result = await PageService.getPagedData<OutgoingPayment>({
      dbName,
      entityName: "OutgoingPayments",
      limit: Number(filters.limit) || 10,
      page: Number(filters.page) || 1,
      query: queryBuilder,
      sort,
    });

    return {
      ...result,
      data: result.data.map((data) => ({
        CardCode: data.cardCode,
        CardName: data.cardName,
        DocCurr: data.docCurr,
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
      error: caughtError.message,
      msg: "Failed to fetch Outgoing Payments from HANA",
    });
    throw caughtError;
  }
};

export const getPaymentDocNums = async (dbName: string, search?: string, limit?: number) => {
  const repo = await getTenantRepository(dbName, OutgoingPaymentSchema);
  const queryBuilder = repo.createQueryBuilder("payment");
  const safeLimit = getSafeDocNumLimit(limit);

  queryBuilder.select("payment.docNum", "DocNum").distinct(true);
  if (search && search.trim().length > 0) {
    queryBuilder.where("CAST(payment.docNum AS NVARCHAR) LIKE :search", {
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
export const getPayment = async (sessionId: string, id: string) => {
  try {
    const result = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/VendorPayments(${id})`,
    )) as SAPDocumentResponse;

    let creditCardsInfo: { CreditCardCode: number; CreditCardName: string }[] = [];
    try {
      const ccResponse = (await serviceLayerClient.request(sessionId, "GET", "/CreditCards")) as {
        value: { CreditCardCode: number; CreditCardName: string }[];
      };
      creditCardsInfo = ccResponse.value || [];
    } catch (error) {
      logger.warn({
        msg: "Failed to fetch CreditCards mapping",
        error: String(error),
      });
    }

    const rawCreditCards =
      ((result as unknown as Record<string, unknown>).PaymentCreditCards as Record<
        string,
        unknown
      >[]) || [];
    const mappedCreditCards = rawCreditCards.map((card: Record<string, unknown>) => {
      const ccInfo = creditCardsInfo.find((c) => c.CreditCardCode === card.CreditCard);
      return {
        ...card,
        CardName: ccInfo ? ccInfo.CreditCardName : `Card ${card.CreditCard}`,
      };
    });

    return {
      CardCode: result.CardCode,
      CardName: result.CardName,
      CashSum: (result as unknown as Record<string, unknown>).CashSum || 0,
      CheckSum: (result as unknown as Record<string, unknown>).CheckSum || 0,
      DocCurr: result.DocCurrency,
      DocDate: result.DocDate,
      DocEntry: result.DocEntry,
      DocNum: result.DocNum,
      DocTotal: result.DocTotal,
      PaymentAccounts: (result as unknown as Record<string, unknown>).PaymentAccounts || [],
      PaymentChecks: (result as unknown as Record<string, unknown>).PaymentChecks || [],
      PaymentCreditCards: mappedCreditCards,
      PaymentInvoices: await (async () => {
        const rawInvoices =
          ((result as unknown as Record<string, unknown>).PaymentInvoices as Record<
            string,
            unknown
          >[]) || [];

        const invoiceEntries = rawInvoices
          .filter((i) => i.InvoiceType === "it_PurchaseInvoice")
          .map((i) => i.DocEntry as number);
        const creditMemoEntries = rawInvoices
          .filter((i) => i.InvoiceType === "it_PurchCredItnote")
          .map((i) => i.DocEntry as number);

        const session = serviceLayerClient.getSession(sessionId);
        const dbName = session?.companyDB;

        const invoiceMap: Record<number, number> = {};
        const creditMemoMap: Record<number, number> = {};

        if (dbName) {
          if (invoiceEntries.length > 0) {
            try {
              const invRepo = await getTenantRepository(dbName, APInvoiceSchema);
              const invoices = await invRepo.find({
                where: { docEntry: In(invoiceEntries) },
                select: ["docEntry", "docNum"],
              });
              invoices.forEach((inv) => (invoiceMap[inv.docEntry] = inv.docNum));
            } catch (e) {
              logger.error({
                msg: "Failed to fetch DocNums for AP invoices",
                error: String(e),
              });
            }
          }
          if (creditMemoEntries.length > 0) {
            try {
              const cmRepo = await getTenantRepository(dbName, APCreditMemoSchema);
              const cms = await cmRepo.find({
                where: { docEntry: In(creditMemoEntries) },
                select: ["docEntry", "docNum"],
              });
              cms.forEach((cm) => (creditMemoMap[cm.docEntry] = cm.docNum));
            } catch (e) {
              logger.error({
                msg: "Failed to fetch DocNums for AP credit memos",
                error: String(e),
              });
            }
          }
        }

        return rawInvoices.map((inv) => ({
          DocEntry: inv.DocEntry as number,
          DocNum:
            inv.InvoiceType === "it_PurchaseInvoice"
              ? invoiceMap[inv.DocEntry as number]
              : creditMemoMap[inv.DocEntry as number],
          SumApplied: inv.SumApplied as number,
          InvoiceType: inv.InvoiceType as string,
        }));
      })(),
      PaymentMode: (result as unknown as Record<string, unknown>).U_Mode_Pay,
      Remarks: result.Remarks,
      TrsfrSum:
        (result as unknown as Record<string, unknown>).TransferSum ||
        (result as unknown as Record<string, unknown>).TrsfrSum ||
        0,
      id: result.DocEntry,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to fetch Outgoing Payment from Service Layer",
    });
    throw caughtError;
  }
};

// Resolves an Outgoing Payment by DocNum from tenant DB and fetches full details from Service Layer.
export const getPaymentByDocNum = async (sessionId: string, dbName: string, docNum: string) => {
  const normalizedDocNum = docNum.trim();
  if (!normalizedDocNum) {
    const error = new Error("DocNum is required") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const repo = await getTenantRepository(dbName, OutgoingPaymentSchema);
  const match = await repo
    .createQueryBuilder("p")
    .select(["p.docEntry"])
    .where("CAST(p.docNum AS NVARCHAR) = :docNum", { docNum: normalizedDocNum })
    .getOne();

  if (!match?.docEntry) {
    const error = new Error("Outgoing Payment not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }

  return getPayment(sessionId, String(match.docEntry));
};

// Submits a new vendor payment to SAP. Handles allocation across multiple A/P invoices.
export const createPayment = async (sessionId: string, payload: Record<string, unknown>) => {
  let sapPayload: Record<string, unknown> = {};
  try {
    // Preflight: validate CardCode is present
    if (!payload.CardCode || String(payload.CardCode).trim() === "") {
      throw new Error("Vendor code (CardCode) is required.");
    }

    // Preflight: validate PaymentInvoices
    const invoices = (payload.PaymentInvoices as Record<string, unknown>[]) || [];
    if (invoices.length > 0) {
      const validTypes = new Set(["it_PurchaseInvoice", "it_PurchCredItnote"]);
      for (const inv of invoices) {
        const docEntry = Number(inv.DocEntry);
        if (!docEntry || docEntry <= 0) {
          throw new Error(`Invalid document entry: DocEntry=${inv.DocEntry}`);
        }
        const sumApplied = Number(inv.SumApplied);
        if (!sumApplied || sumApplied <= 0) {
          throw new Error(
            `Invalid payment amount for document DocEntry=${docEntry}: SumApplied=${inv.SumApplied}`,
          );
        }
        const invType = String(inv.InvoiceType || "");
        if (!validTypes.has(invType)) {
          throw new Error(`Invalid invoice type for document DocEntry=${docEntry}: ${invType}`);
        }
      }
    }

    sapPayload = {
      CardCode: payload.CardCode,
      CashSum: payload.CashSum || 0,
      DocDate: payload.DocDate,
      PaymentInvoices:
        (payload.PaymentInvoices as Record<string, unknown>[])
          ?.sort((a, b) => {
            const typeA = a.InvoiceType === "it_PurchaseInvoice" ? 0 : 1;
            const typeB = b.InvoiceType === "it_PurchaseInvoice" ? 0 : 1;
            return typeA - typeB;
          })
          .map((inv) => {
            let sapType = "18";
            let sumApplied = inv.SumApplied as number;

            if (inv.InvoiceType === "it_PurchCredItnote") {
              sapType = "19";
              sumApplied = -Math.abs(sumApplied);
            }

            return {
              DocEntry: inv.DocEntry as number,
              SumApplied: sumApplied,
              InvoiceType: sapType,
            };
          }) || [],
      Reference: payload.Reference,
      Remarks: payload.Remarks,
      TransferSum: payload.TransferSum || payload.TrsfrSum || 0,
    };

    const modes: string[] = [];
    if (payload.CashSum && (payload.CashSum as number) > 0) {
      modes.push("CASH");
    }

    if (Array.isArray(payload.PaymentChecks) && payload.PaymentChecks.length > 0) {
      const checks = payload.PaymentChecks as Record<string, unknown>[];
      const hasCash = checks.some((c) => c.BankCode === "CASH");
      const hasRealCheck = checks.some((c) => c.BankCode !== "CASH");
      if (hasCash) {
        modes.push("CASH");
      }
      if (hasRealCheck) {
        modes.push("Direct Pay");
      }
    }

    const transferSum = (payload.TransferSum || payload.TrsfrSum || 0) as number;
    if (transferSum > 0) {
      modes.push("Direct Pay");
    }

    if (modes.length === 1) {
      sapPayload.U_Mode_Pay = modes[0];
    } else if (modes.length > 1) {
      sapPayload.U_Mode_Pay = modes.find((m) => m !== "CASH") || "CASH";
    }

    if (payload.CashSum && (payload.CashSum as number) > 0) {
      sapPayload.CashSum = payload.CashSum;
      sapPayload.CashAccount = (payload.CashAccount as string) || "";
    }

    if (transferSum > 0) {
      sapPayload.TransferSum = transferSum;
    }

    if (Array.isArray(payload.PaymentChecks) && payload.PaymentChecks.length > 0) {
      const realChecks = (payload.PaymentChecks as Record<string, unknown>[]).filter(
        (chk) => chk.BankCode !== "CASH",
      );

      if (realChecks.length > 0) {
        sapPayload.PaymentChecks = realChecks.map((chk, idx) => ({
          BankCode: chk.BankCode,
          Branch: chk.Branch,
          CheckAccount: chk.GLAccount || chk.CheckAccount || "",
          CheckNumber: chk.CheckNumber,
          CheckSum: chk.CheckSum,
          DueDate: chk.DueDate || sapPayload.DocDate,
          Endorse: "tNO",
          LineNum: idx,
        }));
      }
    }

    if (Array.isArray(payload.PaymentAccounts) && payload.PaymentAccounts.length > 0) {
      sapPayload.PaymentAccounts = (payload.PaymentAccounts as Record<string, unknown>[]).map(
        (acc, idx) => ({
          AccountCode: acc.AccountCode,
          Decription: acc.Decription || "Surcharge",
          LineNum: idx,
          SumPaid: acc.SumPaid,
        }),
      );
    }

    const docDate = sapPayload.DocDate as string;
    if (docDate && docDate.length === 8) {
      sapPayload.DocDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    }

    logger.info({
      cardCode: payload.CardCode,
      docDate,
      msg: "Creating Outgoing Payment via Service Layer",
    });

    logger.info({
      msg: "[DEBUG-cheque] Backend SAP payload",
      CashAccount: sapPayload.CashAccount,
      CashSum: sapPayload.CashSum,
      CheckSum: sapPayload.CheckSum,
      PaymentChecks: JSON.stringify(sapPayload.PaymentChecks),
      fullPayload: JSON.stringify(sapPayload, null, 2),
    });

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/VendorPayments",
      sapPayload,
    )) as { DocEntry: number; DocNum: number };

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      DocNum: result.DocNum,
      id: result.DocEntry,
      message: "Payment created successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to create Outgoing Payment in Service Layer",
      sapPayload: JSON.stringify(sapPayload, null, 2),
      "[DEBUG-cheque]": "SAP failure - payload above",
    });
    throw caughtError;
  }
};

// Updates non-financial attributes (Remarks, Ref, PaymentMode) on an Outgoing Payment.
export const updatePayment = async (
  sessionId: string,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const sapPayload: Record<string, unknown> = {};
    if (payload.Remarks) {
      sapPayload.Remarks = payload.Remarks;
    }
    if (payload.Reference) {
      sapPayload.Reference = payload.Reference;
    }

    // Allow direct PaymentMode update if provided and valid
    const allowedModes = ["M-Pesa", "My Cash", "EFTPOS", "Direct Pay", "CASH"];
    if (payload.PaymentMode && allowedModes.includes(payload.PaymentMode as string)) {
      sapPayload.U_Mode_Pay = payload.PaymentMode;
    }

    await serviceLayerClient.request(sessionId, "PATCH", `/VendorPayments(${id})`, sapPayload);

    // Invalidate purchase-related dashboard metrics for the tenant.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return { message: "Outgoing Payment updated successfully", success: true };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to update Outgoing Payment",
    });
    throw caughtError;
  }
};

// Cancels the outgoing payment document in SAP B1.
export const cancelPayment = async (sessionId: string, id: string) => {
  try {
    await serviceLayerClient.request(sessionId, "POST", `/VendorPayments(${id})/Cancel`);

    // Dashboard must be cleared to reflect the reinstatement of the payable.
    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dash:purchase:${session.companyDB}:`);
    }

    return {
      message: "Outgoing Payment cancelled successfully",
      success: true,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      id,
      msg: "Failed to cancel Outgoing Payment in Service Layer",
    });
    throw caughtError;
  }
};

// Backfills U_Mode_Pay for existing OVPM rows via SAP Service Layer.
export const backfillPaymentModes = async (sessionId: string, batchSize = 50) => {
  const session = serviceLayerClient.getSession(sessionId);
  if (!session?.companyDB) {
    throw new Error("No active session");
  }

  try {
    // Get all VendorPayments from Service Layer
    const response = (await serviceLayerClient.request(
      sessionId,
      "GET",
      `/VendorPayments?$top=${batchSize}&$select=DocEntry,CashSum,TrsfrSum,CreditCard,CheckNum,U_Mode_Pay&$orderby=DocEntry DESC`,
    )) as {
      value: {
        DocEntry: number;
        CashSum?: number;
        TrsfrSum?: number;
        CreditCard?: number;
        CheckNum?: number;
        U_Mode_Pay?: string;
      }[];
    };

    const payments = response.value || [];
    logger.info({
      msg: "Backfill: Raw SL response",
      recordCount: payments.length,
      samplePayment: payments[0],
    });

    if (payments.length === 0) {
      logger.info({ msg: "Backfill: No records found" });
      return { message: "No records found", success: true, updated: 0 };
    }

    const recordsToUpdate = payments.filter(
      (p) =>
        !p.U_Mode_Pay &&
        ((p.CashSum && Number(p.CashSum) > 0) ||
          (p.TrsfrSum && Number(p.TrsfrSum) > 0) ||
          (p.CreditCard && Number(p.CreditCard) > 0) ||
          (p.CheckNum && Number(p.CheckNum) > 0)),
    );

    logger.info({
      count: recordsToUpdate.length,
      msg: "Backfill: Records needing update",
      sample: recordsToUpdate[0],
    });

    let updatedCount = 0;
    const allowedModes = new Set(["M-Pesa", "My Cash", "EFTPOS", "Direct Pay", "CASH"]);

    for (const row of recordsToUpdate) {
      try {
        const modes: string[] = [];

        if (row.CashSum && Number(row.CashSum) > 0) {
          modes.push("CASH");
        }

        if (row.CreditCard && Number(row.CreditCard) > 0) {
          const cardId = Number(row.CreditCard);
          if (cardId === 5) modes.push("M-Pesa");
          else if (cardId === 6) modes.push("My Cash");
          else if (cardId === 7) modes.push("Direct Pay");
          else modes.push("EFTPOS");
        }

        if (row.CheckNum && Number(row.CheckNum) > 0) {
          modes.push("Direct Pay");
        }

        if (row.TrsfrSum && Number(row.TrsfrSum) > 0) {
          modes.push("Direct Pay");
        }

        let paymentMode: string | undefined;
        if (modes.length === 1) {
          paymentMode = modes[0];
        } else if (modes.length > 1) {
          paymentMode = modes.find((m) => m !== "CASH") || "CASH";
        }

        if (paymentMode && allowedModes.has(paymentMode)) {
          await serviceLayerClient.request(sessionId, "PATCH", `/VendorPayments(${row.DocEntry})`, {
            U_Mode_Pay: paymentMode,
          });
          updatedCount++;
          logger.info({
            docEntry: row.DocEntry,
            msg: "Backfill: Updated payment",
            paymentMode,
          });
        }
      } catch (error) {
        logger.warn({
          msg: "Failed to backfill individual payment",
          docEntry: row.DocEntry,
          error: String(error),
        });
      }
    }

    logger.info({ batchSize, msg: "Backfill complete", updated: updatedCount });
    return {
      message: `Updated ${updatedCount} records`,
      success: true,
      updated: updatedCount,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "Failed to backfill payment modes",
    });
    throw caughtError;
  }
};

// Fetches accounts from DSC1 for account selection in outgoing payment forms.
export const getAccounts = async (dbName: string, query: AccountQuery) => {
  try {
    const repo = await getTenantRepository(dbName, GlAccountSchema);
    const qb = repo.createQueryBuilder("a");

    qb.select(["a.GLAccount", "a.Account"]);

    if (query.search) {
      qb.andWhere("LOWER(a.GLAccount) LIKE LOWER(:search)", { search: `%${query.search}%` });
    }

    qb.orderBy("a.GLAccount", "ASC").take(query.limit ?? 20);

    const rows = await qb.getRawMany<Record<string, unknown>>();

    logger.info({
      msg: "Fetched DSC1 accounts",
      db: dbName,
      count: rows.length,
      accounts: rows.map((r) => r["a_GLAccount"]),
    });

    return {
      data: rows.map((r) => ({
        GLAccount: r["a_GLAccount"] as string,
        Account: r["a_Account"] as string,
      })),
      total: rows.length,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      db: dbName,
      error: caughtError.message,
      msg: "Failed to fetch DSC1 accounts",
    });
    const dbError = new Error(`Failed to retrieve accounts: ${caughtError.message}`) as Error & {
      statusCode?: number;
    };
    dbError.statusCode = 500;
    throw dbError;
  }
};

export const outgoingPaymentService = {
  backfillPaymentModes,
  cancelPayment,
  createPayment,
  getAccounts,
  getPayment,
  getPaymentByDocNum,
  getPaymentDocNums,
  getPayments,
  updatePayment,
};
