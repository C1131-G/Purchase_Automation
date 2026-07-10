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

    logger.info({ dbName, filters, msg: "Fetching A/P Credit Memos" });

    const result = await apCreditMemoService.getCreditNotes(dbName, filters);

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
    const data = await apCreditMemoService.getCreditNoteDocNums(dbName, search, limit);
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Retrieves a single A/P Credit Memo's details using its DocNum (resolves to DocEntry via HANA).
export const getCreditNote = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { id } = authReq.params;
    const draftDocEntry = (req.query.draftDocEntry as string) || undefined;

    logger.info({ id, draftDocEntry, msg: "Fetching A/P Credit Memo detail" });

    const data = await apCreditMemoService.getCreditNoteByDocNum(
      sessionId,
      dbName,
      id as string,
      draftDocEntry,
    );
    if (!data) {
      return res.status(404).json({ message: "A/P Credit Memo not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

// Handles the creation of a new A/P Credit Memo in SAP B1.
export const createCreditNote = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const payload = req.body;

    // Zod Body Validation ensures the payload strictly follows the SAP creation requirements.
    const validatedPayload = CreateCreditNoteInputSchema.parse(payload);

    logger.info({
      dbName,
      msg: "Creating AP Credit Memo",
      vendor: validatedPayload.CardCode,
    });

    const result = await apCreditMemoService.createCreditNote(sessionId, validatedPayload, dbName);

    logger.info({ docNum: result.DocNum, msg: "A/P Credit Memo Created" });

    res.status(201).json({ data: result, message: result.message, success: true });
  } catch (error) {
    next(error);
  }
};

// Updates an existing A/P Credit Memo's metadata (e.g., comments) via Service Layer PATCH.
export const updateCreditNote = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { id } = authReq.params;
    const payload = req.body;

    // Zod validation ensures no unexpected fields are sent to SAP during update.
    const validatedPayload = UpdateCreditNoteInputSchema.parse(payload);

    logger.info({ dbName, id: id as string, msg: "Updating A/P Credit Memo" });

    const isDraft = validatedPayload.isDraft === true || Boolean(validatedPayload.draftDocEntry);
    let targetDocEntry: string;

    if (isDraft) {
      targetDocEntry = String(validatedPayload.draftDocEntry || id);
    } else {
      const detail = await apCreditMemoService.getCreditNoteByDocNum(
        sessionId,
        dbName,
        id as string,
      );
      targetDocEntry = String(detail.id);
    }

    const result = await apCreditMemoService.updateCreditNote(
      sessionId,
      targetDocEntry,
      validatedPayload,
    );

    res.status(200).json({ message: result.message, success: true });
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

    logger.info({ id, msg: "Cancelling A/P Credit Memo" });

    const result = await apCreditMemoService.cancelCreditNote(sessionId, id as string);
    res.status(200).json({ message: result.message, success: true });
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
