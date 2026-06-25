import { EntitySchema } from "typeorm";
import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface AttachmentLine {
  absEntry: number;
  line: number;
  trgtPath: string;
  fileName: string;
  fileExt: string;
  freeText?: string;
  date: Date;
  copied: string;
}

export const AttachmentLineSchema = new EntitySchema<AttachmentLine>({
  name: "AttachmentLine",
  tableName: "ATC1",
  columns: {
    absEntry: {
      name: "AbsEntry",
      primary: true,
      type: "int" as HANAColumnType,
    },
    line: {
      name: "Line",
      primary: true,
      type: "int" as HANAColumnType,
    },
    trgtPath: {
      name: "trgtPath",
      type: "nvarchar" as HANAColumnType,
      length: 260,
    },
    fileName: {
      name: "FileName",
      type: "nvarchar" as HANAColumnType,
      length: 260,
    },
    fileExt: {
      name: "FileExt",
      type: "nvarchar" as HANAColumnType,
      length: 20,
    },
    freeText: {
      name: "FreeText",
      type: "nvarchar" as HANAColumnType,
      length: 254,
      nullable: true,
    },
    date: {
      name: "Date",
      type: "date" as HANAColumnType,
    },
    copied: {
      name: "Copied",
      type: "nvarchar" as HANAColumnType,
      length: 1,
    },
  },
});
