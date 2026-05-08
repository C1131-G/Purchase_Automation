// Zod Initialization: Extends the core Zod library with OpenAPI descriptors.
// This must be imported at the very top of the entry point to ensure all schemas are registerable for documentation.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Mutation: Enhances the global Zod prototype with .openapi() helper methods.
extendZodWithOpenApi(z);

export { z };
