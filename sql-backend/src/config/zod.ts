// Zod OpenAPI extension: Must be imported at entry to enable .openapi() on all schemas.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export { z };
