// Tenant Data Source: Re-exports tenant DataSource management from main data-source.
// For file parity with HANA backend.

export {
  getTenantDataSource,
  initializeTenantDatabase,
  closeAllTenantDataSources,
  getTenantDataSourceStats,
} from "./data-source";
