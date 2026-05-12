import { EntitySchema } from "typeorm";

export interface FinancialPeriod {
  absEntry: number;
  fRefDate: Date;
  tRefDate: Date;
  linkAct1: string;
  linkAct2: string;
  linkAct3: string;
}

export const FinancialPeriodSchema = new EntitySchema<FinancialPeriod>({
  name: "FinancialPeriod",
  tableName: "OACP",
  columns: {
    absEntry: {
      type: Number,
      primary: true,
      name: "AbsEntry",
    },
    fRefDate: {
      type: "date",
      name: "F_RefDate",
    },
    tRefDate: {
      type: "date",
      name: "T_RefDate",
    },
    linkAct1: {
      type: String,
      name: "LinkAct_1",
    },
    linkAct2: {
      type: String,
      name: "LinkAct_2",
    },
    linkAct3: {
      type: String,
      name: "LinkAct_3",
    },
  },
});
