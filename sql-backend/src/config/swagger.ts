// Builds OpenAPI 3.1 from Zod + registered paths; serves gated Swagger UI + JSON.

import type { Application, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";

import "@/config/zod";
import { createDocument } from "@/config/swagger-registry";
import { registerAllPaths } from "@/config/swagger-paths";
import { LoginInputSchema } from "@/modules/auth/auth.schema";
import { CreateAttachmentSchema } from "@/modules/attachments/attachments.schema";

let pathsRegistered = false;

export const generateOpenApiSpec = () => {
  if (!pathsRegistered) {
    registerAllPaths();
    pathsRegistered = true;
  }

  const registry = createDocument();

  // components/schemas from Zod (code-first). Document create/update schemas
  // are also registered inside registerDocumentPaths.
  registry.register("LoginInput", LoginInputSchema);
  registry.register("CreateAttachmentInput", CreateAttachmentSchema);

  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    info: {
      description:
        "Vendor Portal SQL backend API. Versioned under /api/v1. Auth: CookieAuth (vendorportal.sid). Spec is generated from Zod schemas and route registrations.",
      title: "Vendor Portal SQL Backend API",
      version: "1.0.0",
    },
    openapi: "3.1.0",
    servers: [{ url: "/api/v1", description: "API v1 base path" }],
    security: [{ CookieAuth: [] }],
  });
};

export const configureSwagger = (app: Application) => {
  const document = generateOpenApiSpec();
  const isProd = process.env.NODE_ENV === "production";

  // Never expose interactive try-it-out against real APIs in production.
  if (!isProd) {
    app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(document, {
        customSiteTitle: "Vendor Portal SQL API Docs",
        swaggerOptions: {
          docExpansion: "list",
          filter: true,
          persistAuthorization: true,
        },
      }),
    );
  }

  // Machine-readable contract: same env gate as interactive UI (rule 10).
  app.get("/api-docs.json", (_req: Request, res: Response) => {
    if (isProd) {
      res.status(404).json({
        message: "API documentation is not available in production",
        success: false,
      });
      return;
    }
    res.json(document);
  });
};
