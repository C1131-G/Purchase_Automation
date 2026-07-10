import { executeTenantQuery } from './dal/tenant-dal.helper.ts';
executeTenantQuery('AJAX_POS_DB', 'SELECT TOP 1 * FROM OADM').then(console.log).catch(console.error);
