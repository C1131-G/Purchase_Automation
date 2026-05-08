import { EntitySchema } from "typeorm";

export interface BusinessPartnerAddress {
  cardCode: string;
  address: string;
  street?: string;
  city?: string;
  country?: string;
  zipCode?: string;
}

export const BusinessPartnerAddressSchema = new EntitySchema<BusinessPartnerAddress>({
  columns: {
    address: { length: 50, name: "Address", primary: true, type: "nvarchar" },
    cardCode: {
      length: 50,
      name: "CardCode",
      primary: true,
      type: "nvarchar",
    },
    city: { length: 100, name: "City", nullable: true, type: "nvarchar" },
    country: {
      length: 50,
      name: "Country",
      nullable: true,
      type: "nvarchar",
    },
    street: { length: 200, name: "Street", nullable: true, type: "nvarchar" },
    zipCode: {
      length: 20,
      name: "ZipCode",
      nullable: true,
      type: "nvarchar",
    },
  },
  name: "BusinessPartnerAddress",
  tableName: "CRD1",
});
