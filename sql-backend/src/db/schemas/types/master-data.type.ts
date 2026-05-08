export interface BusinessPartner {
  cardCode: string;
  cardName: string;
  cardType: string;
  phone1?: string;
  email?: string;
}

export interface Item {
  itemCode: string;
  itemName: string;
  itemType?: string;
  barcode?: string;
  unitPrice?: number;
}

export interface TaxGroup {
  code: string;
  name: string;
  rate: number;
}

export interface Warehouse {
  whsCode: string;
  whsName: string;
}

export interface UnitOfMeasurement {
  uomCode: string;
  uomName: string;
}

export interface SalesEmployee {
  empID: number;
  firstName: string;
  lastName: string;
  email?: string;
}
