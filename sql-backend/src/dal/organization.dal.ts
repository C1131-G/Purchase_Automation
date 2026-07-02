// Organization DAL: Express handler for pre-login org listing.

import type { RequestHandler } from "express";
import { organizationService } from "@/services/organization.service";

export const getAllOrganizations: RequestHandler = async (req, res, next) => {
  try {
    const { username } = req.query;
    const databases = await organizationService.getAvailableDatabases(username as string);
    res.status(200).json({ data: databases, success: true });
  } catch (e) {
    next(e);
  }
};

export const organizationDal = { getAllOrganizations };
