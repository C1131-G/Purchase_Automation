// Organization DAL: Express handler for pre-login org listing.

import type { RequestHandler } from "express";
import { organizationService } from "@/services/organization.service";

export const getAllOrganizations: RequestHandler = async (_req, res, next) => {
  try {
    const databases = await organizationService.getAvailableDatabases();
    res.status(200).json({ data: databases, success: true });
  } catch (e) {
    next(e);
  }
};

export const organizationDal = { getAllOrganizations };
