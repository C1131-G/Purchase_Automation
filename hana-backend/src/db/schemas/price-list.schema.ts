import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface PriceList {
  ListNum: number;
  ListName: string;
}

export const PriceListSchema = new EntitySchema<PriceList>({
  columns: {
    ListNum: {
      name: "ListNum",
      primary: true,
      type: "int" as HANAColumnType,
    },
    ListName: {
      length: 100,
      name: "ListName",
      type: "nvarchar" as HANAColumnType,
    },
  },
  name: "PriceList",
  tableName: "OPLN",
});
