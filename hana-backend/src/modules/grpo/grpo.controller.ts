// GRPO Controller: Handles HTTP requests for Goods Receipt Purchase Order (GRPO) operations.

import type { NextFunction, Request, Response } from "express";

import type { AuthenticatedRequest } from "@/types/express.types";
import { requirePortalCreatedBy } from "@/modules/auth/portal-created-by";
import { assertIcPartnerAllowed } from "@/modules/intercompany";
import type { GRPOQuery } from "./grpo.types";
import { grpoService } from "./grpo.service";
import { CreateGRPOInputSchema, UpdateGRPOInputSchema } from "./grpo.schema";
import type { GRPODocNumLookupQuery } from "./grpo.schema";

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

    const result = await grpoService.getGRPOs(dbName, filters);

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
    res.status(200).json({ data, success: true });
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
    const draftDocEntry = req.query.draftDocEntry as string | undefined;

    const data = await grpoService.getGRPOByDocNum(sessionId, dbName, id as string, draftDocEntry);

    if (!data) {
      return res.status(404).json({
        message: "GRPO not found",
        success: false,
      });
    }

    await assertIcPartnerAllowed(dbName, "purchase", String(data.CardCode ?? ""));

    res.status(200).json({
      data,
      success: true,
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

    // Ensure we resolve the PO by DocNum since the frontend often provides the user-visible number.
    const { purchaseOrderService } =
      await import("@/modules/purchase-order/purchase-order.service");
    const data = await purchaseOrderService.getPurchaseOrderByDocNum(
      sessionId,
      dbName,
      id as string,
    );

    if (!data) {
      return res.status(404).json({ message: "Purchase Order not found", success: false });
    }
    await assertIcPartnerAllowed(dbName, "purchase", String(data.CardCode ?? ""));

    res.status(200).json({
      data,
      success: true,
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
        message: "Vendor code is required",
        success: false,
      });
    }

    await assertIcPartnerAllowed(authReq.user.dbName, "purchase", String(vendorCode));

    const data = await grpoService.getAvailablePOs(sessionId, vendorCode as string);

    res.status(200).json({
      data,
      success: true,
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
    const { dbName } = authReq.user;
    const payload = req.body;

    // Validate the payload to ensure all required fields for document creation are present.
    const validatedPayload = CreateGRPOInputSchema.parse(payload);

    const result = await grpoService.createGRPO(
      sessionId,
      validatedPayload,
      dbName,
      requirePortalCreatedBy(authReq.session),
    );

    res.status(201).json({
      data: result,
      message: result.message,
      success: true,
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

    const isDraft = validatedPayload.isDraft === true || Boolean(validatedPayload.draftDocEntry);
    let targetDocEntry: string;

    if (isDraft) {
      targetDocEntry = String(validatedPayload.draftDocEntry || id);
    } else {
      const detail = await grpoService.getGRPOByDocNum(sessionId, dbName, id as string);
      await assertIcPartnerAllowed(dbName, "purchase", String(detail.CardCode ?? ""));
      targetDocEntry = String(detail.id);
    }

    const result = await grpoService.updateGRPO(sessionId, targetDocEntry, validatedPayload);

    res.status(200).json({
      message: result.message,
      success: true,
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

    const detail = await grpoService.getGRPOByDocNum(sessionId, dbName, id as string);
    await assertIcPartnerAllowed(dbName, "purchase", String(detail.CardCode ?? ""));
    const result = await grpoService.cancelGRPO(sessionId, String(detail.id));

    res.status(200).json({
      message: result.message,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const grpoController = {
  cancelGRPO,
  createGRPO,
  getAvailablePOs,
  getGRPO,
  getGRPODocNums,
  getGRPOs,
  getPODetail,
  updateGRPO,
};
