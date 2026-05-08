export interface SapDocument {
  docEntry: number;
  docNum: number;
  docDate: string;
  docStatus: string;
  cardCode: string;
  cardName: string;
  docTotal: number;
}

export interface SapLine {
  lineNum: number;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  uomCode: string;
}

export interface SapBusinessPartner {
  cardCode: string;
  cardName: string;
  cardType: string;
  address: string;
  phone: string;
  email: string;
}

export interface SapItem {
  itemCode: string;
  itemName: string;
  itemType: string;
  uomCode: string;
  price: number;
}
