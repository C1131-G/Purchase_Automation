import swaggerUi from "swagger-ui-express";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";

const swaggerSpec = {
  components: {
    securitySchemes: {
      cookieAuth: {
        in: "cookie",
        name: "vendorportal.sid",
        type: "apiKey",
      },
    },
  },
  info: {
    description: "SQL Server backend API for Vendor Portal",
    title: "Vendor Portal API (SQL Backend)",
    version: "1.0.0",
  },
  openapi: "3.0.0",
  security: [{ cookieAuth: [] }],
  servers: [
    {
      description: "Development server",
      url: `http://localhost:${config.server.port}`,
    },
  ],
};

export const initSwagger = (app: unknown) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  logger.info({ msg: "Swagger docs available at /api-docs" });
};
