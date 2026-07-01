import { z } from "zod";

export const CreateAttachmentSchema = z.object({
  absEntry: z.coerce.number().int().optional(),
  sourcePath: z.string().optional(),
  fileName: z.string().min(1),
  fileExtension: z.string().optional(),
  freeText: z.string().optional(),
  attachmentDate: z.string().optional(),
});
