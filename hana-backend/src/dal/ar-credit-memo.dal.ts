// A/R Credit Memo DAL: Handles HTTP requests for A/R Credit Memo operations.

import type { NextFunction, Request, Response } from "express";

// Core
import { logger } from "@/core/logger/pino-logger";
import type { CreditNoteQuery } from "@/dal/types/ar-credit-memo.types";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
// Services
import { arCreditMemoService } from "@/services/ar-credit-memo.service";
// Validation
import {
  CreateCreditNoteInputSchema,
  UpdateCreditNoteInputSchema,
} from "@/validation/schemas/inputs/credit-note.input";
import type { CreditNoteDocNumLookupQuery } from "@/validation/schemas/inputs/credit-note.input";

// Fetches all A/R Credit Memos based on filters like credit note number, customer name, date range, etc.
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

    logger.info({ dbName, filters, msg: "Fetching A/R Credit Memos" });

    const result = await arCreditMemoService.getCreditNotes(dbName, filters);

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
    const data = await arCreditMemoService.getCreditNoteDocNums(dbName, search, limit);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves a single A/R Credit Memo's details using its unique identifier from the Service Layer.
export const getCreditNote = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ id, msg: "Fetching A/R Credit Memo detail" });

    const data = await arCreditMemoService.getCreditNote(sessionId, id as string);
    if (!data) {
      return res.status(404).json({ message: "A/R Credit Memo not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Creates a new A/R Credit Memo in SAP B1 using JSON request body.
export const createCreditNote = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const payload = req.body;

    // Zod Body Validation ensures the payload adheres to the required SAP structure.
    const validatedPayload = CreateCreditNoteInputSchema.parse(payload);

    logger.info({
      customer: validatedPayload.CardCode,
      msg: "Creating AR Credit Memo",
    });

    const result = await arCreditMemoService.createCreditNote(sessionId, validatedPayload);

    logger.info({ docNum: result.DocNum, msg: "A/R Credit Memo Created" });

    res.status(201).json({ data: result, message: result.message, success: true });
  } catch (error) {
    next(error);
  }
};

// Updates metadata (e.g., comments/address) for an existing A/R Credit Memo via Service Layer PATCH.
export const updateCreditNote = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;
    const payload = req.body;

    // Validate the update payload to prevent sending invalid fields to SAP.
    const validatedPayload = UpdateCreditNoteInputSchema.parse(payload);

    logger.info({ id, msg: "Updating A/R Credit Memo" });

    const result = await arCreditMemoService.updateCreditNote(
      sessionId,
      id as string,
      validatedPayload,
    );
    res.status(200).json({ message: result.message, success: true });
  } catch (error) {
    next(error);
  }
};

// Cancels an existing A/R Credit Memo in SAP B1.
export const cancelCreditNote = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { id } = authReq.params;

    logger.info({ id, msg: "Cancelling A/R Credit Memo" });

    const result = await arCreditMemoService.cancelCreditNote(sessionId, id as string);
    res.status(200).json({ message: result.message, success: true });
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
