// A/R Credit Memo DAL: Manages HTTP requests for A/R Credit Memo operations.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { CreditNoteQuery } from "@/dal/types/ar-credit-memo.types";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { arCreditMemoService } from "@/services/ar-credit-memo.service";
import {
  CreateCreditNoteInputSchema,
  UpdateCreditNoteInputSchema,
} from "@/validation/schemas/inputs/credit-note.input";
import type { CreditNoteDocNumLookupQuery } from "@/validation/schemas/inputs/credit-note.input";

export const getCreditNotes = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    CreditNoteQuery
  >;
  try {
    const { dbName } = authReq.user;
    const filters = authReq.query;

    logger.info({ dbName, filters, msg: "Fetching A/R Credit Memos" });

    const result = await arCreditMemoService.getCreditMemos(dbName, filters);

    logger.info({
      count: result.data.length,
      msg: "Fetched A/R Credit Memos",
      total: result.total,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getCreditNoteDocNums = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    CreditNoteDocNumLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;
    const data = await arCreditMemoService.getCreditMemoDocNums(dbName, search, limit);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getCreditNote = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    logger.info({ dbName, id, msg: "Fetching A/R Credit Memo detail" });

    const data = await arCreditMemoService.getCreditMemo(dbName, id as string);

    if (!data) {
      return res.status(404).json({ message: "A/R Credit Memo not found", success: false });
    }

    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const createCreditNote = async (req: Request, res: Response, next: NextFunction) => {
  const _authReq = req as unknown as AuthenticatedRequest;
  try {
    const payload = req.body;
    CreateCreditNoteInputSchema.parse(payload);

    logger.info({
      customer: (payload as Record<string, unknown>).CardCode,
      msg: "Creating A/R Credit Memo",
    });

    res.status(201).json({
      data: payload,
      message: "Credit Memo created (stub)",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCreditNote = async (_req: Request, res: Response, next: NextFunction) => {
  const _authReq = _req as unknown as AuthenticatedRequest;
  try {
    const payload = _req.body;
    UpdateCreditNoteInputSchema.parse(payload);

    logger.info({
      id: (payload as Record<string, unknown>).id as string,
      msg: "Updating A/R Credit Memo",
    });

    res.status(200).json({ message: "Credit Memo updated (stub)", success: true });
  } catch (error) {
    next(error);
  }
};

export const cancelCreditNote = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { id } = authReq.params;

    logger.info({ id, msg: "Cancelling A/R Credit Memo" });

    res.status(200).json({ message: "Credit Memo cancelled (stub)", success: true });
  } catch (error) {
    next(error);
  }
};

export const arCreditMemoDal = {
  cancelCreditNote,
  createCreditNote,
  getCreditNote,
  getCreditNoteDocNums,
  getCreditNotes,
  updateCreditNote,
};
