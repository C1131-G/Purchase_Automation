export interface Organization {
  id: string; // DB_NAME
  companyName: string;
  dbServer: string;
  serviceLayerUsername?: string;
  serviceLayerPassword?: string;
}
