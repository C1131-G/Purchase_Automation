// Organization Controller: Manages HTTP requests related to organization and database discovery.

import type { NextFunction, Request, Response } from "express";

// Core
import { organizationService } from "./organization.service";

// Retrieves all available SAP databases (tentants) that the portal can connect to.
export const getAllOrganizations = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const databases = await organizationService.getAvailableDatabases();

    res.status(200).json({
      data: databases,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const organizationController = {
  getAllOrganizations,
};
