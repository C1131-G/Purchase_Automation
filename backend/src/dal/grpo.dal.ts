// GRPO DAL: Handles HTTP requests for Goods Receipt Purchase Order (GRPO) operations.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import type { GRPOQuery } from "@/dal/types/grpo.types";
import { grpoService } from "@/services/grpo.service";
import {
  CreateGRPOInputSchema,
  type GRPODocNumLookupQuery,
  UpdateGRPOInputSchema,
} from "@/validation/schemas/inputs/grpo.input";

// Retrieves a list of GRPOs filtered by status, dates, and vendor information.
export const getGRPOs = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    GRPOQuery
  >;
  try {
    const { dbName } = authReq.user;
    // Query is already validated/sanitized by validateQuery(GRPOQuerySchema) middleware.
    const filters = authReq.query;

    logger.info({ msg: "Fetching GRPOs", dbName, filters });

    const result = await grpoService.getGRPOs(dbName, filters);

    logger.info({ msg: "Fetched GRPOs", count: result.data.length, total: result.total });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getGRPODocNums = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    GRPODocNumLookupQuery
  >;
  try {
    const { dbName } = authReq.user;
    const { search, limit } = authReq.query;
    const data = await grpoService.getGRPODocNums(dbName, search, limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Fetches detailed information for a single GRPO, including line items.
export const getGRPO = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    logger.info({ msg: "Fetching GRPO detail", id, dbName });

    const data = await grpoService.getGRPOByDocNum(sessionId, dbName, id as string);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "GRPO not found",
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Fetches the original Purchase Order details to facilitate GRPO creation based on a PO.
export const getPODetail = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    logger.info({ msg: "Fetching PO detail for GRPO", id, dbName });

    // Ensure we resolve the PO by DocNum since the frontend often provides the user-visible number.
    const { purchaseOrderService } = await import("@/services/purchase-order.service");
    const data = await purchaseOrderService.getPurchaseOrderByDocNum(
      sessionId,
      dbName,
      id as string,
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Lists all open Purchase Orders for a specific vendor that can be converted into a GRPO.
export const getAvailablePOs = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    { vendorCode?: string }
  >;
  try {
    const { sessionId } = authReq.session;
    const { vendorCode } = authReq.query;

    if (!vendorCode) {
      return res.status(400).json({
        success: false,
        message: "Vendor code is required",
      });
    }

    logger.info({ msg: "Fetching available POs", vendorCode });

    const data = await grpoService.getAvailablePOs(sessionId, vendorCode as string);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Creates a new GRPO in SAP B1.
export const createGRPO = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const payload = req.body;

    // Validate the payload to ensure all required fields for document creation are present.
    const validatedPayload = CreateGRPOInputSchema.parse(payload);

    logger.info({ msg: "Creating GRPO", vendor: validatedPayload.CardCode });

    const result = await grpoService.createGRPO(sessionId, validatedPayload);

    logger.info({ msg: "GRPO Created", docNum: result.DocNum });

    res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Updates metadata (e.g., comments) for an existing GRPO via Service Layer PATCH.
export const updateGRPO = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { id } = authReq.params;
    const payload = req.body;

    // Validate the update payload to prevent unauthorized or invalid field modifications.
    const validatedPayload = UpdateGRPOInputSchema.parse(payload);

    logger.info({ msg: "Updating GRPO", id, dbName });

    const detail = await grpoService.getGRPOByDocNum(sessionId, dbName, id as string);
    const result = await grpoService.updateGRPO(sessionId, String(detail.id), validatedPayload);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// Marks a GRPO as cancelled in the SAP system.
export const cancelGRPO = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { sessionId } = authReq.session;
    const { dbName } = authReq.user;
    const { id } = authReq.params;

    logger.info({ msg: "Cancelling GRPO", id, dbName });

    const detail = await grpoService.getGRPOByDocNum(sessionId, dbName, id as string);
    const result = await grpoService.cancelGRPO(sessionId, String(detail.id));

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const grpoDal = {
  getGRPOs,
  getGRPODocNums,
  getGRPO,
  getPODetail,
  getAvailablePOs,
  createGRPO,
  updateGRPO,
  cancelGRPO,
};
