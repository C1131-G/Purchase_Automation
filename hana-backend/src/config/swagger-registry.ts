// OpenAPI registry: CookieAuth, shared Zod envelopes, registerPath helper.

import { OpenAPIRegistry, type RouteConfig } from "@asteasolutions/zod-to-openapi";
import type { ZodTypeAny } from "zod";

import {
  ErrorResponseSchema,
  PaginatedResponseSchema,
  SuccessResponseSchema,
} from "@/validation/schemas/outputs/common.output";

const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "CookieAuth", {
  description: "HttpOnly session cookie set by POST /auth/login (name: vendorportal.sid).",
  in: "cookie",
  name: "vendorportal.sid",
  type: "apiKey",
});

registry.register("SuccessResponse", SuccessResponseSchema);
registry.register("ErrorResponse", ErrorResponseSchema);
registry.register("PaginatedResponse", PaginatedResponseSchema);

const json = (schema: unknown, description: string) => ({
  content: { "application/json": { schema } },
  description,
});

/** Paths are relative to servers[0].url (/api/v1). */
export const registerPath = (path: string, method: string, options: Record<string, unknown>) => {
  registry.registerPath({
    method: method as RouteConfig["method"],
    path: path.startsWith("/") ? path : `/${path}`,
    ...options,
  } as RouteConfig);
};

export const createDocument = () => registry;
export { registry };

export function registerComponentSchema(name: string, schema: ZodTypeAny) {
  registry.register(name, schema);
}

export function jsonResponses(options: {
  successStatus?: "200" | "201";
  successDescription: string;
  successSchema?: "SuccessResponse" | "PaginatedResponse";
  includeValidationError?: boolean;
  includeNotFound?: boolean;
  publicRoute?: boolean;
}) {
  const status = options.successStatus ?? "200";
  const successSchema =
    options.successSchema === "PaginatedResponse" ? PaginatedResponseSchema : SuccessResponseSchema;

  const responses: Record<string, ReturnType<typeof json>> = {
    [status]: json(successSchema, options.successDescription),
    "500": json(ErrorResponseSchema, "Unexpected server error."),
  };

  if (!options.publicRoute) {
    responses["401"] = json(ErrorResponseSchema, "Authentication required or session expired.");
  }
  if (options.includeValidationError !== false) {
    responses["400"] = json(ErrorResponseSchema, "Validation failed or bad request.");
  }
  if (options.includeNotFound) {
    responses["404"] = json(ErrorResponseSchema, "Resource not found.");
  }

  return responses as never;
}

export const cookieSecurity = [{ CookieAuth: [] as string[] }];

export function entityPascal(entityPath: string): string {
  return entityPath
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function jsonBody(schema: ZodTypeAny, description?: string) {
  return {
    body: {
      required: true,
      description,
      content: { "application/json": { schema } },
    },
  };
}
