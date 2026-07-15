import { z } from "zod";

export const GetAvailableDatabasesQuerySchema = z.object({
  username: z.string().min(1).optional(),
});
