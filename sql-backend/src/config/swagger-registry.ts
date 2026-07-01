// Swagger registry: Central registry for OpenAPI path definitions.

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

const registry = new OpenAPIRegistry();

export const registerPath = (path: string, method: string, options: any) => {
  registry.registerPath({ method, path: `/api/v1${path}`, ...options });
};

export const createDocument = () => registry;
