import { EntitySchema } from "typeorm";

export interface BusinessPartner {
  cardCode: string;
  cardName: string;
  cardType: string;
  phone1?: string;
  email?: string;
}

export const BusinessPartnerSchema = new EntitySchema<BusinessPartner>({
  columns: {
    cardCode: { length: 15, name: "CardCode", primary: true, type: "nvarchar" },
    cardName: { length: 100, name: "CardName", type: "nvarchar" },
    cardType: { length: 1, name: "CardType", type: "nvarchar" },
    email: { length: 100, nullable: true, type: "nvarchar" },
    phone1: { length: 20, nullable: true, type: "nvarchar" },
  },
  name: "BusinessPartner",
  tableName: "OCRD",
});
