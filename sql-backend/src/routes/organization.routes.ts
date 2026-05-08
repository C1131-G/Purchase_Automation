import express from "express";

import { AppDataSource } from "@/db/config/data-source";
import { OrganizationSchema } from "@/db/schemas/organization.schema";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const repo = AppDataSource.getRepository(OrganizationSchema);
    const orgs = await repo.find({ where: { isActive: true } });

    res.status(200).json({
      data: orgs.map((o) => ({
        dbName: o.dbName,
        dbServer: o.dbServer,
        name: o.name,
      })),
      success: true,
    });
  } catch (error) {
    next(error);
  }
});

export const organizationRoutes = router;
