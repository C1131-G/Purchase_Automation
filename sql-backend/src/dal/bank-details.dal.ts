import type { RequestHandler } from "express";
import { bankDetailService } from "@/services/bank-details.service";

export const getList: RequestHandler = async (_req, res, next) => {
  try {
    const result = await bankDetailService.getList();
    res.status(200).json({ data: result, success: true });
  } catch (e) {
    next(e);
  }
};

export const bankDetailsDal = { getList };
