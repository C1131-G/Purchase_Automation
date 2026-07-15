import { logger } from "@/core/logger/pino-logger";
import { resolveGLAccount } from "@/services/account-resolution.service";
import { getDisplayCurrency } from "@/services/currency-format";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";

function collectPaymentModes(payload: Record<string, unknown>): string[] {
  const modes: string[] = [];

  if (payload.CashSum && (payload.CashSum as number) > 0) {
    modes.push("CASH");
  }

  if (Array.isArray(payload.PaymentCreditCards) && payload.PaymentCreditCards.length > 0) {
    const firstCard = payload.PaymentCreditCards[0] as Record<string, unknown>;
    const cardId = Number(firstCard.CreditCard);
    if (cardId === 5) modes.push("M-Pesa");
    else if (cardId === 6) modes.push("My Cash");
    else if (cardId === 7) modes.push("Direct Pay");
    else modes.push("EFTPOS");
  }

  if (Array.isArray(payload.PaymentChecks) && payload.PaymentChecks.length > 0) {
    const checks = payload.PaymentChecks as Record<string, unknown>[];
    if (checks.some((c) => c.BankCode === "CASH")) modes.push("CASH");
    if (checks.some((c) => c.BankCode !== "CASH")) modes.push("Direct Pay");
  }

  if (payload.TrsfrSum && (payload.TrsfrSum as number) > 0) {
    modes.push("Direct Pay");
  }

  return modes;
}

function mapPaymentInvoices(payload: Record<string, unknown>) {
  return (
    (payload.PaymentInvoices as Record<string, unknown>[])
      ?.sort((a, b) => {
        const typeA = a.InvoiceType === "it_Invoice" ? 0 : 1;
        const typeB = b.InvoiceType === "it_Invoice" ? 0 : 1;
        return typeA - typeB;
      })
      .map((inv) => {
        let sapType = "13";
        let sumApplied = inv.SumApplied as number;
        if (inv.InvoiceType === "it_CredItnote") {
          sapType = "14";
          sumApplied = -Math.abs(sumApplied);
        }
        if (inv.InvoiceType === "it_Return") sapType = "16";
        return {
          DocEntry: inv.DocEntry as number,
          SumApplied: sumApplied,
          InvoiceType: sapType,
        };
      }) || []
  );
}

async function applyCreditCards(
  sapPayload: Record<string, unknown>,
  payload: Record<string, unknown>,
  dbName: string,
  branch: string,
) {
  if (!Array.isArray(payload.PaymentCreditCards) || payload.PaymentCreditCards.length === 0) {
    return;
  }

  sapPayload.PaymentCreditCards = await Promise.all(
    (payload.PaymentCreditCards as Record<string, unknown>[]).map(async (card, idx) => {
      const originalCardSum = Number(card.CreditSum) || 0;
      let cardAmount = originalCardSum;
      const cardId = Number(card.CreditCard);
      let surchargeRate = 0;
      if (cardId === 1 || cardId === 2) surchargeRate = 3.82;
      else if (cardId === 3) surchargeRate = 4.91;
      if (surchargeRate > 0) {
        cardAmount = Number((originalCardSum / (1 + surchargeRate / 100)).toFixed(2));
      }
      return {
        LineNum: idx,
        CreditCard: card.CreditCard,
        CreditSum: cardAmount,
        VoucherNum: card.VoucherNum,
        CreditAcct:
          card.CreditAcct ||
          (await resolveGLAccount(dbName, branch, "CreditCard", Number(card.CreditCard))),
        CreditCardNumber: "123",
        CardValidUntil: "2026-12-31",
      };
    }),
  );
}

async function applyChecks(
  sapPayload: Record<string, unknown>,
  payload: Record<string, unknown>,
  dbName: string,
  branch: string,
) {
  if (!Array.isArray(payload.PaymentChecks) || payload.PaymentChecks.length === 0) return;

  const realChecks = (payload.PaymentChecks as Record<string, unknown>[]).filter(
    (chk) => chk.BankCode !== "CASH",
  );
  if (realChecks.length === 0) return;

  sapPayload.PaymentChecks = await Promise.all(
    realChecks.map(async (chk, idx) => ({
      LineNum: idx,
      DueDate: chk.DueDate || sapPayload.DocDate,
      CheckNumber: chk.CheckNumber,
      BankCode: chk.BankCode,
      Branch: chk.Branch,
      CheckSum: Number(chk.CheckSum) || 0,
      CheckAccount: await resolveGLAccount(dbName, branch, "Check"),
      Endorse: chk.Endorse || "tNO",
      OriginallyIssuedBy: chk.OriginallyIssuedBy,
      CountryCode: chk.CountryCode,
    })),
  );
}

async function applySurchargeInvoice(
  sessionId: string,
  sapPayload: Record<string, unknown>,
  payload: Record<string, unknown>,
  dbName: string,
  branch: string,
): Promise<string | undefined> {
  if (!payload.SurchargeTotal || (payload.SurchargeTotal as number) <= 0) {
    return undefined;
  }

  const surcharge = Number(payload.SurchargeTotal);
  const surchargeAccount = await resolveGLAccount(dbName, branch, "Surcharge");
  sapPayload.BankChargeAmount = surcharge;

  const invoiceResult = (await serviceLayerClient.request(sessionId, "POST", "/Invoices", {
    CardCode: payload.CardCode,
    DocDate: sapPayload.DocDate,
    DocDueDate: sapPayload.DocDate,
    TaxDate: sapPayload.DocDate,
    DocType: "dDocument_Service",
    DocumentLines: [
      {
        ItemDescription: "Credit Card Surcharge",
        AccountCode: surchargeAccount,
        LineTotal: surcharge,
      },
    ],
  })) as SAPDocumentResponse;

  logger.info({
    msg: "Surcharge Invoice Created successfully",
    docEntry: invoiceResult.DocEntry,
  });

  const existingInvoices = (sapPayload.PaymentInvoices as Record<string, unknown>[]) || [];
  existingInvoices.push({
    DocEntry: invoiceResult.DocEntry,
    SumApplied: surcharge,
    InvoiceType: "13",
  });
  sapPayload.PaymentInvoices = existingInvoices;
  return surchargeAccount;
}

/** Builds the SAP IncomingPayments payload from the portal request body. */
export async function buildIncomingPaymentSapPayload(
  sessionId: string,
  payload: Record<string, unknown>,
  dbName: string,
): Promise<{ sapPayload: Record<string, unknown>; surchargePostedAccount?: string }> {
  const branch = (payload.PaymentChecks as any[])?.[0]?.Branch || (payload.Branch as string);

  const sapPayload: Record<string, unknown> = {
    CardCode: payload.CardCode,
    DocDate: payload.DocDate,
    TaxDate: payload.DocDate,
    DueDate: payload.DocDate,
    DocCurrency: payload.DocCurrency || (await getDisplayCurrency(dbName)),
    DocObjectCode: "bopot_IncomingPayments",
    PaymentInvoices: mapPaymentInvoices(payload),
    Reference: payload.Reference,
    Remarks: payload.Remarks,
  };

  const modes = collectPaymentModes(payload);
  if (modes.length === 1) sapPayload.U_Mode_Pay = modes[0];
  else if (modes.length > 1) sapPayload.U_Mode_Pay = modes.find((m) => m !== "CASH") || "CASH";

  if (payload.CashSum && (payload.CashSum as number) > 0) {
    sapPayload.CashSum = payload.CashSum;
    sapPayload.CashAccount =
      payload.CashAccount || (await resolveGLAccount(dbName, branch, "Cash"));
  }

  if (payload.TrsfrSum && (payload.TrsfrSum as number) > 0) {
    sapPayload.TransferSum = payload.TrsfrSum;
    if (payload.TransferAccount) sapPayload.TransferAccount = payload.TransferAccount;
    if (payload.TransferDate) sapPayload.TransferDate = payload.TransferDate;
    if (payload.TransferReference) sapPayload.TransferReference = payload.TransferReference;
  }

  await applyCreditCards(sapPayload, payload, dbName, branch);
  await applyChecks(sapPayload, payload, dbName, branch);
  const surchargePostedAccount = await applySurchargeInvoice(
    sessionId,
    sapPayload,
    payload,
    dbName,
    branch,
  );

  const paymentAccounts = (payload.PaymentAccounts as Record<string, unknown>[]) || [];
  if (paymentAccounts.length > 0) {
    sapPayload.PaymentAccounts = paymentAccounts.map((acc, idx) => ({
      AccountCode: acc.AccountCode,
      Decription: acc.Decription || "Surcharge",
      LineNum: idx,
      SumPaid: acc.SumPaid,
    }));
  }

  const docDate = sapPayload.DocDate as string;
  if (docDate && docDate.length === 8) {
    sapPayload.DocDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
  }

  return { sapPayload, surchargePostedAccount };
}
