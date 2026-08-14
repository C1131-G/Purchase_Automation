// OpenAPI 3.1 from Zod + registered paths; gated Swagger UI + JSON (non-prod only).

import type { Application, Request, RequestHandler, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";

import "@/config/zod";
import { createDocument } from "@/config/swagger-registry";
import { registerAllPaths } from "@/config/swagger-paths";
import { LoginInputSchema } from "@/modules/auth/auth.schema";
import { MasterDataQuerySchema } from "@/modules/master-data/master-data.schema";
import { OrganizationQuerySchema } from "@/modules/organization/organization.schema";
import { PurchaseOrderQuerySchema } from "@/modules/purchase-order/purchase-order.schema";
import { GRPOQuerySchema } from "@/modules/grpo/grpo.schema";
import { InvoiceQuerySchema } from "@/validation/schemas/inputs/invoice.input";
import { CreditNoteQuerySchema } from "@/validation/schemas/inputs/credit-note.input";
import { PaymentQuerySchema } from "@/validation/schemas/inputs/payments.input";
let pathsRegistered = false;

export const generateOpenApiSpec = () => {
  if (!pathsRegistered) {
    registerAllPaths();
    pathsRegistered = true;
  }

  const registry = createDocument();

  // Query + auth schemas (create/update document bodies registered in swagger-paths-documents).
  registry.register("LoginInput", LoginInputSchema);
  registry.register("PurchaseOrderQuery", PurchaseOrderQuerySchema);
  registry.register("GRPOQuery", GRPOQuerySchema);
  registry.register("InvoiceQuery", InvoiceQuerySchema);
  registry.register("CreditNoteQuery", CreditNoteQuerySchema);
  registry.register("PaymentQuery", PaymentQuerySchema);
  registry.register("MasterDataQuery", MasterDataQuerySchema);
  registry.register("OrganizationsQuery", OrganizationQuerySchema);

  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    info: {
      description:
        "Vendor Portal HANA backend. All business routes live under /api/v1. Auth: CookieAuth (vendorportal.sid). Spec is generated from Zod schemas and route registrations.",
      title: "Vendor Portal HANA Backend API",
      version: "1.0.0",
    },
    openapi: "3.1.0",
    servers: [{ description: "API v1 base path", url: "/api/v1" }],
    security: [{ CookieAuth: [] }],
  });
};

export const configureSwagger = (app: Application) => {
  const isProd = process.env.NODE_ENV === "production";
  let document: ReturnType<typeof generateOpenApiSpec> | undefined;
  const getDocument = () => {
    document ??= generateOpenApiSpec();
    return document;
  };

  if (!isProd) {
    let setupHandler: RequestHandler | undefined;
    app.use("/api-docs", swaggerUi.serve, (req, res, next) => {
      setupHandler ??= swaggerUi.setup(getDocument(), {
        customSiteTitle: "Vendor Portal API Docs",
        swaggerOptions: {
          docExpansion: "list",
          filter: true,
          persistAuthorization: true,
        },
      });
      setupHandler(req, res, next);
    });
  }

  app.get("/api-docs.json", (_req: Request, res: Response) => {
    if (isProd) {
      res.status(404).json({
        message: "API documentation is not available in production",
        success: false,
      });
      return;
    }
    res.json(getDocument());
  });
};
