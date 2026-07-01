import cors from "cors";
import { config } from "@/config/env";

export const corsConfig = cors({
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  origin: config.server.frontendUrl,
});
