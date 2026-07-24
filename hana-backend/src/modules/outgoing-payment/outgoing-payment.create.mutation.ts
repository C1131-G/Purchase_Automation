// Outgoing Payment Service: Manages payment transactions to vendors. Uses HANA database for listings and SAP Service Layer for payment creation.
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { serviceLayerClient } from "@/services/service-layer.service";
// Fetches a paginated list of Outgoing Payments from HANA.

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
          ?.sort((item, item2) => {
            const typeA = item.InvoiceType === "it_PurchaseInvoice" ? 0 : 1;
            const typeB = item2.InvoiceType === "it_PurchaseInvoice" ? 0 : 1;
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
      const hasCash = checks.some((check) => check.BankCode === "CASH");
      const hasRealCheck = checks.some((check) => check.BankCode !== "CASH");
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
      sapPayload.U_Mode_Pay = modes.find((mode) => mode !== "CASH") || "CASH";
    }

    if (payload.CashSum && (payload.CashSum as number) > 0) {
      sapPayload.CashSum = payload.CashSum;
      sapPayload.CashAccount = (payload.CashAccount as string) || "";
    }

    const transferReference =
      typeof payload.TransferReference === "string" ? payload.TransferReference.trim() : "";

    if (transferSum > 0) {
      if (!transferReference) {
        throw new Error("Transfer reference is required for bank transfer.");
      }

      sapPayload.TransferSum = transferSum;
      if (payload.TransferDate) {
        const transferDate = String(payload.TransferDate);
        sapPayload.TransferDate =
          transferDate.length === 8
            ? `${transferDate.slice(0, 4)}-${transferDate.slice(4, 6)}-${transferDate.slice(6, 8)}`
            : transferDate;
      }
      if (payload.TransferAccount) {
        sapPayload.TransferAccount = payload.TransferAccount;
      }
      sapPayload.TransferReference = transferReference;
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
          CountryCode: chk.CountryCode,
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

    const result = (await serviceLayerClient.request(
      sessionId,
      "POST",
      "/VendorPayments",
      sapPayload,
    )) as { DocEntry: number; DocNum: number };

    const session = serviceLayerClient.getSession(sessionId);
    if (session?.companyDB) {
      purgeCache(`dashboard:overview:${session.companyDB}`);
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
      err: caughtError,
      msg: "Failed to create Outgoing Payment in Service Layer",
    });
    throw caughtError;
  }
};

// Updates non-financial attributes (Remarks, Ref, PaymentMode) on an Outgoing Payment.
