import type { NextFunction, Request, Response } from "express";

import AppError from "@/core/errors/app-error";
import { requirePortalCreatedBy } from "@/modules/auth/portal-created-by";
import { createProcessRetryQueueJob } from "@/modules/intercompany/background/jobs/02-process-retry-queue/process-retry-queue.job";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createIcRevisionService } from "@/modules/intercompany/domain/revision/revision.service";
import { createRetryService } from "@/modules/intercompany/domain/retry/retry.service";
import { enrichRfqFromPqDraft } from "@/modules/intercompany/domain/rfq/enrich-rfq-from-pq-draft";
import { withRfqCustomerDisplayList } from "@/modules/intercompany/domain/rfq/resolve-rfq-customer-display";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createPromoteArDraftService } from "@/modules/intercompany/domain/document-map/promote-ar-draft.service";
import { createSellerFillRfqService } from "@/modules/intercompany/flows/flow-1-pq-rfq-chain/04-seller-fill-rfq/seller-fill-rfq.service";
import { createConvertPqAndSqService } from "@/modules/intercompany/flows/flow-1-pq-rfq-chain/05-convert-pq-and-sq/convert-pq-and-sq.service";
import { IC_RETRY_STATUS } from "@/modules/intercompany/infrastructure/constants";

import { attachIcRfqEditFlags } from "./ic-edit-lifecycle";
import { ConfirmArInvoiceBodySchema, SubmitRfqBodySchema, UpdateRfqBodySchema } from "./ic.schema";

const resolveSessionDbName = (req: Request): string => {
  const session = req.session as { dbName?: string; user?: { dbName?: string } } | undefined;
  const authed = req.user as { dbName?: string } | undefined;
  const dbName = authed?.dbName || session?.dbName || session?.user?.dbName || "";
  return String(dbName).trim();
};

const resolveActorCompanyId = async (req: Request): Promise<number> => {
  const dbName = resolveSessionDbName(req);
  if (!dbName) {
    throw new AppError("Session company database required", 400, "IC_SESSION_DB_REQUIRED");
  }
  const company = await createCompanyService().getBySapDbName(dbName);
  if (!company) {
    throw new AppError(
      `No IC_COMPANY mapped for session database ${dbName}`,
      403,
      "IC_COMPANY_NOT_MAPPED",
    );
  }
  return company.companyId;
};

const parseIdParam = (raw: string): number => {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new AppError("Invalid id", 400, "IC_INVALID_ID");
  }
  return Math.trunc(id);
};

/** GET /api/ic/health — module liveness (session-protected when mounted under authenticated API). */
export const getIcHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    data: {
      module: "intercompany",
      ok: true,
      phase: "P9",
    },
    success: true,
  });
};

export const getIcRevision = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const companyId = await resolveActorCompanyId(req);
    const revision = await createIcRevisionService().getForCompany(companyId);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ data: { revision }, success: true });
  } catch (error) {
    next(error);
  }
};

export const confirmArInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sellerCompanyId = await resolveActorCompanyId(req);
    const poDocEntry = parseIdParam(String(req.params.poDocEntry));
    const body = ConfirmArInvoiceBodySchema.parse(req.body);
    const data = await createPromoteArDraftService().promote({
      arInvoiceDocEntry: body.arInvoiceDocEntry,
      poDocEntry,
      sellerCompanyId,
    });
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

/** GET /rfqs — seller inbox only (TARGET company). Buyer does not list RFQs. */
export const listRfqs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = await resolveActorCompanyId(req);
    const rfq = createRfqService();
    const rows = await rfq.listForCompany(companyId);
    // Sales-side list: customer code/name (buyer on seller books), not buyer-side vendor.
    const withCustomers = await withRfqCustomerDisplayList(rows);
    res.status(200).json({ data: withCustomers, success: true });
  } catch (error) {
    next(error);
  }
};

export const getRfq = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rfqId = parseIdParam(String(req.params.id));
    // Session company + RFQ header/lines in parallel (auth check before response).
    const [companyId, header] = await Promise.all([
      resolveActorCompanyId(req),
      createRfqService().getById(rfqId),
    ]);
    if (!header) {
      throw new AppError("RFQ not found", 404, "IC_RFQ_NOT_FOUND");
    }
    if (header.sourceCompanyId !== companyId && header.targetCompanyId !== companyId) {
      throw new AppError("RFQ not visible to this company", 403, "IC_RFQ_FORBIDDEN");
    }
    // Merge source buyer PQ (vendor name, buyer, dates, addresses, line descriptions).
    const enriched = await attachIcRfqEditFlags(await enrichRfqFromPqDraft(header));
    res.status(200).json({ data: enriched, success: true });
  } catch (error) {
    next(error);
  }
};

export const updateRfq = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = await resolveActorCompanyId(req);
    const rfqId = parseIdParam(String(req.params.id));
    const body = UpdateRfqBodySchema.parse(req.body);
    const fill = createSellerFillRfqService();
    const updated = await fill.updateLines({
      actorCompanyId: companyId,
      lines: body.lines,
      rfqId,
      removedLineNums: body.removedLineNums,
      warehouse: body.warehouse,
    });
    // Same enrichment as GET so seller UI keeps names/dates/descriptions.
    const enriched = await attachIcRfqEditFlags(await enrichRfqFromPqDraft(updated));
    res.status(200).json({ data: enriched, success: true });
  } catch (error) {
    next(error);
  }
};

export const submitRfq = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = await resolveActorCompanyId(req);
    const rfqId = parseIdParam(String(req.params.id));
    // Empty body is fine; optional `lines` saves fill in the same request.
    const body = SubmitRfqBodySchema.parse(req.body ?? {});
    const fill = createSellerFillRfqService();
    const submitted = await fill.submit({
      actorCompanyId: companyId,
      lines: body.lines,
      portalCreatedBy: requirePortalCreatedBy(req.session),
      rfqId,
      removedLineNums: body.removedLineNums,
      warehouse: body.warehouse,
    });
    // Fast path: no enrich / no wait for notify or convert (those run in background).
    // Seller UI already has line data; status flip is enough for the response.
    res.status(200).json({ data: submitted, success: true });
  } catch (error) {
    next(error);
  }
};

export const convertRfq = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const companyId = await resolveActorCompanyId(req);
    const rfqId = parseIdParam(String(req.params.id));
    const convert = createConvertPqAndSqService();
    const result = await convert.convert({
      actorCompanyId: companyId,
      portalCreatedBy: requirePortalCreatedBy(req.session),
      rfqId,
    });
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    next(error);
  }
};

export const listNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const companyId = await resolveActorCompanyId(req);
    const unreadOnly =
      String(req.query.unreadOnly ?? "") === "1" || req.query.unreadOnly === "true";
    const rows = await createNotificationService().listForCompany(companyId, { unreadOnly });
    res.status(200).json({ data: rows, success: true });
  } catch (error) {
    next(error);
  }
};

export const unreadNotificationCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const companyId = await resolveActorCompanyId(req);
    const count = await createNotificationService().countUnreadForCompany(companyId);
    res.status(200).json({ data: { count }, success: true });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const companyId = await resolveActorCompanyId(req);
    const notificationId = parseIdParam(String(req.params.id));
    const notifications = createNotificationService();
    const updated = await notifications.markRead(notificationId, companyId);
    if (!updated) {
      throw new AppError("Notification not found", 404, "IC_NOTIFICATION_NOT_FOUND");
    }
    res.status(200).json({ data: updated, success: true });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const companyId = await resolveActorCompanyId(req);
    const marked = await createNotificationService().markAllReadForCompany(companyId);
    res.status(200).json({ data: { marked }, success: true });
  } catch (error) {
    next(error);
  }
};

export const listRetries = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const companyId = await resolveActorCompanyId(req);
    const statusRaw = String(req.query.status ?? "").trim();
    const statuses = statusRaw
      ? statusRaw
          .split(",")
          .map((part) => part.trim().toUpperCase())
          .filter(Boolean)
      : [IC_RETRY_STATUS.WAITING, IC_RETRY_STATUS.DEAD, IC_RETRY_STATUS.PROCESSING];
    const rows = await createRetryService().listForCompany(companyId, { statuses });
    res.status(200).json({ data: rows, success: true });
  } catch (error) {
    next(error);
  }
};

export const runRetry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = await resolveActorCompanyId(req);
    const retryId = parseIdParam(String(req.params.id));
    const retry = createRetryService();
    const existing = await retry.findById(retryId);
    if (!existing || existing.companyId !== companyId) {
      throw new AppError("Retry not found", 404, "IC_RETRY_NOT_FOUND");
    }
    if (existing.status === IC_RETRY_STATUS.SUCCESS) {
      throw new AppError("Retry already succeeded", 400, "IC_RETRY_ALREADY_SUCCESS");
    }
    if (existing.status === IC_RETRY_STATUS.PROCESSING) {
      throw new AppError("Retry is already processing", 409, "IC_RETRY_BUSY");
    }

    try {
      const result = await createProcessRetryQueueJob().runOne(
        retryId,
        requirePortalCreatedBy(req.session),
      );
      res.status(200).json({ data: result, success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AppError(message, 400, "IC_RETRY_RUN_FAILED");
    }
  } catch (error) {
    next(error);
  }
};
