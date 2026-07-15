import { z } from "zod";

export const CreateAttachmentSchema = z.object({
  absEntry: z.coerce.number().int().optional(),
  attachmentDate: z.string().optional(),
  fileExtension: z.string().optional(),
  fileName: z.string().min(1),
  freeText: z.string().optional(),
  sourcePath: z.string().optional(),
});
