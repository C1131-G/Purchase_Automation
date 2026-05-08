// A/P Credit Memo DAL: Manages HTTP requests for A/P Credit Memo operations.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { CreditNoteQuery } from "@/dal/types/ap-credit-memo.types";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { apCreditMemoService } from "@/services/ap-credit-memo.service";
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

    logger.info({ dbName, filters, msg: "Fetching A/P Credit Memos" });

    const result = await apCreditMemoService.getCreditMemos(dbName, filters);

    logger.info({
      count: result.data.length,
      msg: "Fetched A/P Credit Memos",
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
    const data = await apCreditMemoService.getCreditMemoDocNums(dbName, search, limit);
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

    logger.info({ dbName, id, msg: "Fetching A/P Credit Memo detail" });

    const data = await apCreditMemoService.getCreditMemo(dbName, id as string);

    if (!data) {
      return res.status(404).json({ message: "A/P Credit Memo not found", success: false });
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
      msg: "Creating A/P Credit Memo",
      vendor: (payload as Record<string, unknown>).CardCode,
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
      msg: "Updating A/P Credit Memo",
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

    logger.info({ id, msg: "Cancelling A/P Credit Memo" });

    res.status(200).json({ message: "Credit Memo cancelled (stub)", success: true });
  } catch (error) {
    next(error);
  }
};

export const apCreditMemoDal = {
  cancelCreditNote,
  createCreditNote,
  getCreditNote,
  getCreditNoteDocNums,
  getCreditNotes,
  updateCreditNote,
};
