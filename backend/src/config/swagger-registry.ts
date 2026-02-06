// OpenAPI Registry: The central collection point for all Zod definitions and security schemes.

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

export const registry = new OpenAPIRegistry();

// Security Scheme Registration: Defines how the API handles authentication.
// In this portal, we use secure, httpOnly cookies named 'vendorportal.sid'.
registry.registerComponent("securitySchemes", "SessionCookie", {
  type: "apiKey",
  in: "cookie",
  name: "vendorportal.sid",
  description: "Express session cookie for authentication",
});
