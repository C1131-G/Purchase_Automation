process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.OTEL_SDK_DISABLED = "true";

// Zod OpenAPI extension before any schema modules load.
import "@/config/zod";
