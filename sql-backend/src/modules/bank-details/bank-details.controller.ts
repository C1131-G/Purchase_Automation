import type { RequestHandler } from "express";

import { bankDetailService } from "./bank-details.service";

export const getList: RequestHandler = async (_req, res, next) => {
  try {
    const result = await bankDetailService.getList();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const bankDetailsDal = { getList };
