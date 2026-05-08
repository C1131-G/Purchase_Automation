// Organization DAL: Handles organization/tenant data access.

import type { RequestHandler } from "express";

import { AppDataSource } from "@/db/config/data-source";
import { OrganizationSchema } from "@/db/schemas/organization.schema";

export const getOrganizations: RequestHandler = async (_req, res, next) => {
  try {
    const repo = AppDataSource.getRepository(OrganizationSchema);
    const orgs = await repo.find({ where: { isActive: true } });

    res.status(200).json({
      data: orgs,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const organizationDal = {
  getOrganizations,
};
