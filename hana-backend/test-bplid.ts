import { executeTenantQuery } from './src/services/db.service';
executeTenantQuery('AJAX_POS_DB', 'SELECT "WhsCode", "BPLid" FROM OWHS WHERE "WhsCode" = \'L401\'').then(console.log).catch(console.error);
