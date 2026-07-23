export type IcSapConnection = {
  connectionId: number;
  companyId: number;
  server: string | null;
  serviceLayerUrl: string;
  databaseName: string;
  licenseServer: string | null;
  username: string;
  /** Raw password from IC_SAP_CONNECTION — never log. */
  password: string;
  isDefault: boolean;
  isActive: boolean;
};
