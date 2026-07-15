// A/R Credit Memo Controller: Handles HTTP requests for A/R Credit Memo operations.

import type { NextFunction, Request, Response } from "express";

// Core
import type { CreditNoteQuery } from "./ar-credit-memo.types";
import type { AuthenticatedRequest } from "@/types/express.types";
// Services
import { arCreditMemoService } from "./ar-credit-memo.service";
// Validation
import { CreateCreditNoteInputSchema, UpdateCreditNoteInputSchema } from "./ar-credit-memo.schema";
import type { CreditNoteDocNumLookupQuery } from "./ar-credit-memo.schema";

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

    const result = await arCreditMemoService.getCreditNotes(dbName, filters);

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
    const draftDocEntry = (req.query.draftDocEntry as string) || undefined;

    const data = await arCreditMemoService.getCreditNote(
      sessionId,
      id as string,
      draftDocEntry ? true : false,
    );
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

    const result = await arCreditMemoService.createCreditNote(sessionId, validatedPayload);

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

    const result = await arCreditMemoService.cancelCreditNote(sessionId, id as string);
    res.status(200).json({ message: result.message, success: true });
  } catch (error) {
    next(error);
  }
};

export const arCreditMemoController = {
  cancelCreditNote,
  createCreditNote,
  getCreditNote,
  getCreditNoteDocNums,
  getCreditNotes,
  updateCreditNote,
};
