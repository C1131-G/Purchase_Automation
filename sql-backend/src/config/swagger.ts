// Swagger/OpenAPI configuration: Builds the OpenAPI document and serves Swagger UI.

import type { Application, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { createDocument } from "./swagger-registry";
import "@/config/zod";

export const configureSwagger = (app: Application) => {
  const registry = createDocument();

  const generator = new OpenApiGeneratorV3(registry.definitions);
  const document = generator.generateDocument({
    info: { title: "Vendor Portal SQL Backend API", version: "1.0.0" },
    openapi: "3.0.3",
    servers: [{ url: "/api/v1", description: "API v1" }],
  });

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(document));
  app.get("/api-docs.json", (_req: Request, res: Response) => {
    res.json(document);
  });
};
