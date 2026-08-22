export type PosParkContext = {
  storeId: number;
  storeLocation: string;
  storeCounterId: number;
  counterCode: string;
  userId: number | null;
};

export type PosParkedSalesItem = {
  BaseEntry: number;
  BaseLine: number;
  BaseType: 23;
  Discount: number;
  FreeText: string;
  ItemCode: string;
  ItemName: string;
  LineNum: number;
  Price: number;
  Quantity: number;
  TaxPercent: number;
  TotalPrice: number;
  TotalPriceWithTax: number;
  UomCode: string;
  VatGroup: string;
  WhsCode: string;
  TreeType?: string;
  ManBtchNum?: string;
  ManSerNum?: string;
};

export type PosParkedInvoiceData = {
  customer: { CardCode: string; CardName: string; Cellular?: string };
  salesItems: PosParkedSalesItem[];
  salesHeader: {
    BPL_IDAssignedToInvoice?: number;
    Comments: string;
    NumAtCard?: string;
    SalesPersonCode?: number;
    postingDate?: string;
  };
  customerAddress: {
    Street?: string;
    Block?: string;
    Building?: string;
    City?: string;
    Country?: string;
    State?: string;
    ZipCode?: string;
    AdresType?: string;
  };
  isOneTimeCustomer: false;
  isCODCustomer: false;
  oneTimeCustomerDetails: Record<string, never>;
  parkedTransaction: { TotalAmount: number; parkReason: string };
  timYardTransaction: Record<string, never>;
  transactionID: string;
};

export type ParkedTransactionResult = {
  parkedTransactionId: number;
  reused: boolean;
  transactionRefNum: string;
};
