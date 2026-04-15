// Organization DAL: Manages HTTP requests related to organization and database discovery.

import type { NextFunction, Request, Response } from "express";

// Core
import { logger } from "@/core/logger/pino-logger";
import { organizationService } from "@/services/organization.service";

// Retrieves all available SAP databases (tentants) that the portal can connect to.
export const getAllOrganizations = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    logger.info({ msg: "Fetching all organizations" });
    const databases = await organizationService.getAvailableDatabases();

    res.status(200).json({
      success: true,
      data: databases,
    });
  } catch (error) {
    next(error);
  }
};

export const organizationDal = {
  getAllOrganizations,
};
