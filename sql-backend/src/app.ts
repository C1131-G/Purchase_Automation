import "@/config/zod";

import express, { type RequestHandler, type ErrorRequestHandler } from "express";
import helmet from "helmet";
import compression from "compression";

import { corsConfig } from "@/config/cors";
import { config } from "@/config/env";
import { configureSession } from "@/config/session";
import { errorHandler } from "@/core/errors/error-handler";
import { healthRoutes } from "@/routes/health.routes";
import { apiRoutes } from "@/routes/api.routes";
import { AppError } from "@/core/errors/app-error";

import { configureSwagger } from "@/config/swagger";

const app = express();

app.set("etag", "strong");
app.set("trust proxy", config.server.trustProxyHops);

app.use(
  "/",
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }) as unknown as RequestHandler,
);
app.use("/", corsConfig as unknown as RequestHandler);
app.use("/", compression({ level: 6, threshold: 1024 }) as unknown as RequestHandler);
app.use("/", express.json({ limit: "10mb" }) as unknown as RequestHandler);
app.use("/", express.urlencoded({ extended: true }) as unknown as RequestHandler);

configureSession(app);
configureSwagger(app);

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1", apiRoutes);

app.use("/", ((_req: express.Request, _res: express.Response, next: express.NextFunction) => {
  next(new AppError("Route not found", 404, "NOT_FOUND"));
}) as unknown as RequestHandler);

app.use("/", errorHandler as unknown as ErrorRequestHandler);

export { app };
