// A/P Credit Memo DAL: Manages HTTP requests for A/P Credit Memo operations.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { CreditNoteQuery } from "@/dal/types/ap-credit-memo.types";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { apCreditMemoService } from "@/services/ap-credit-memo.service";
import {
  CreateCreditNoteInputSchema,
  type CreditNoteDocNumLookupQuery,
  UpdateCreditNoteInputSchema,
} from "@/validation/schemas/inputs/credit-note.input";

// Fetches a list of A/P Credit Memos based on query parameters like date range, vendor name, etc.
export const getCreditNotes = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    CreditNoteQuery
  >;
  try {
    const { dbName } = authReq.user;
    // Query is already validated/sanitized by validateQuery(CreditNoteQuerySchema) middleware.
    const filters = authReq.query;

    logger.info({ msg: "Fetching A/P Credit Memos", dbName, filters });

    const result = await apCreditMemoService.getCreditNotes(dbName, filters);

    logger.info({
      msg: "Fetched A/P Credit Memos",
      count: result.data.length,
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
    const data = await apCreditMemoService.getCreditNoteDocNums(dbName, search, limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Retrieves a single A/P Credit Memo's details using its unique identifier.
export const getCreditNote = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ msg: "Fetching A/P Credit Memo detail", id });

    const data = await apCreditMemoService.getCreditNote(sessionId, id as string);
    if (!data)
      return res.status(404).json({ success: false, message: "A/P Credit Memo not found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Handles the creation of a new A/P Credit Memo in SAP B1.
export const createCreditNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.session;
    const payload = req.body;

    // Zod Body Validation ensures the payload strictly follows the SAP creation requirements.
    const validatedPayload = CreateCreditNoteInputSchema.parse(payload);

    logger.info({ msg: "Creating AP Credit Memo", vendor: validatedPayload.CardCode });

    const result = await apCreditMemoService.createCreditNote(sessionId, validatedPayload);

    logger.info({ msg: "A/P Credit Memo Created", docNum: result.DocNum });

    res.status(201).json({ success: true, message: result.message, data: result });
  } catch (error) {
    next(error);
  }
};

// Updates an existing A/P Credit Memo's metadata (e.g., comments) via Service Layer PATCH.
export const updateCreditNote = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;
    const payload = req.body;

    // Zod validation ensures no unexpected fields are sent to SAP during update.
    const validatedPayload = UpdateCreditNoteInputSchema.parse(payload);

    logger.info({ msg: "Updating A/P Credit Memo", id });

    const result = await apCreditMemoService.updateCreditNote(
      sessionId,
      id as string,
      validatedPayload,
    );

    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

// Cancels an A/P Credit Memo in SAP B1.
export const cancelCreditNote = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ msg: "Cancelling A/P Credit Memo", id });

    const result = await apCreditMemoService.cancelCreditNote(sessionId, id as string);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

export const apCreditMemoDal = {
  getCreditNotes,
  getCreditNoteDocNums,
  getCreditNote,
  createCreditNote,
  updateCreditNote,
  cancelCreditNote,
};
