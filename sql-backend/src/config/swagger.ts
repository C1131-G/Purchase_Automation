// Swagger/OpenAPI configuration: Builds the OpenAPI document and serves Swagger UI.

import type { Application, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { createDocument } from "./swagger-registry";
import { registerAllPaths } from "./swagger-paths";
import "@/config/zod";

export const configureSwagger = (app: Application) => {
  // Load/register all path definitions
  registerAllPaths();

  const registry = createDocument();

  // Register cookie authentication security scheme
  registry.registerComponent("securitySchemes", "CookieAuth", {
    type: "apiKey",
    in: "cookie",
    name: "vendorportal.sid",
    description: "Session cookie authentication",
  });

  const generator = new OpenApiGeneratorV31(registry.definitions);
  const document = generator.generateDocument({
    info: { title: "Vendor Portal SQL Backend API", version: "1.0.0" },
    openapi: "3.1.0",
    servers: [{ url: "/api/v1", description: "API v1" }],
    security: [{ CookieAuth: [] }],
  });

  // Gated: Never expose interactive try-out docs in production environment
  if (process.env.NODE_ENV !== "production") {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(document));
  }

  app.get("/api-docs.json", (_req: Request, res: Response) => {
    res.json(document);
  });
};
