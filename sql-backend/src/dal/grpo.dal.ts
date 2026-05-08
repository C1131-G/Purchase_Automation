// GRPO DAL: Handles goods receipt PO data access.

import type { NextFunction, Request, Response } from "express";

import type { AuthenticatedRequest } from "@/dal/types/express.types";
import type { GRPOQuery, GRPODocNumLookupQuery, AvailablePOsQuery } from "@/dal/types/grpo.types";
import { grpoService } from "@/services/grpo.service";

export const getGRPOs = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    GRPOQuery
  >;
  try {
    const { dbName } = authReq.user;
    const result = await grpoService.getGRPOs(dbName, authReq.query);
    res.status(200).json({ success: true, ...result });
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
    const result = await grpoService.getGRPODocNums(
      dbName,
      authReq.query.search,
      authReq.query.limit,
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getAvailablePOs = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    AvailablePOsQuery
  >;
  try {
    const { dbName } = authReq.user;
    const result = await grpoService.getAvailablePOs(
      dbName,
      authReq.query.search,
      authReq.query.limit,
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getPODetail = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = req.params;
    const data = await grpoService.getGRPO(dbName, id);
    if (!data) {
      return res.status(404).json({ message: "PO not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const getGRPO = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { dbName } = authReq.user;
    const { id } = req.params;
    const data = await grpoService.getGRPO(dbName, id);
    if (!data) {
      return res.status(404).json({ message: "GRPO not found", success: false });
    }
    res.status(200).json({ data, success: true });
  } catch (error) {
    next(error);
  }
};

export const grpoDal = {
  getAvailablePOs,
  getGRPO,
  getGRPODocNums,
  getGRPOs,
  getPODetail,
};
