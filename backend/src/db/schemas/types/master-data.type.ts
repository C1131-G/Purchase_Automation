export interface BusinessPartner {
  CardCode: string;
  CardName: string;
  Address?: string;
  Currency?: string;
  CardType: string;
  frozenFor: string;
}

export interface Item {
  ItemCode: string;
  ItemName: string;
  SalUnitMsr?: string;
  AvgPrice?: number;
  DfltWH?: string;
  frozenFor: string;
}

export interface TaxGroup {
  Code: string;
  Name: string;
  Rate: number;
  Inactive: string;
}

export interface Warehouse {
  WhsCode: string;
  WhsName: string;
  Inactive: string;
}

export interface UnitOfMeasurement {
  UomCode: string;
  UomName: string;
}

export interface SalesEmployee {
  SlpCode: number;
  SlpName: string;
  Active: string;
}
