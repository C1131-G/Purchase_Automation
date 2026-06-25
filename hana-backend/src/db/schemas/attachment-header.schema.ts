import { EntitySchema } from "typeorm";
import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface AttachmentHeader {
  absEntry: number;
}

export const AttachmentHeaderSchema = new EntitySchema<AttachmentHeader>({
  name: "AttachmentHeader",
  tableName: "OATC",
  columns: {
    absEntry: {
      name: "AbsEntry",
      primary: true,
      type: "int" as HANAColumnType,
    },
  },
});
