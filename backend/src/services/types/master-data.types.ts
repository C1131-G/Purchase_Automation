/**
 * Master Data Service Types
 */

export interface MasterDataItem {
  Code: string;
  Name: string;
}

export interface VendorListItem {
  CardCode: string;
  CardName: string;
}

export interface WarehouseListItem {
  WarehouseCode: string;
  WarehouseName: string;
}

export interface TaxCodeListItem {
  Code: string;
  Name: string;
  Rate: number;
}
