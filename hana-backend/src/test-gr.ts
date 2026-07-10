import axios from 'axios';
import https from 'https';
import { executeTenantQuery } from './dal/tenant-dal.helper.ts';

const agent = new https.Agent({ rejectUnauthorized: false });

async function run() {
  const loginRes = await axios.post('https://172.18.30.114:50000/b1s/v1/Login', {
    CompanyDB: 'AJAX_POS_DB',
    UserName: 'manager',
    Password: 'password'
  }, { httpsAgent: agent });
  
  const sid = loginRes.data.SessionId;
  const routeId = loginRes.headers['set-cookie']?.find(c => c.includes('ROUTEID'))?.split(';')[0];
  const cookie = `B1SESSION=${sid}; ${routeId}`;

  const binRows = await executeTenantQuery('AJAX_POS_DB', `SELECT TOP 1 "AbsEntry" FROM OBIN WHERE "WhsCode" = 'L101'`);
  const binEntry = binRows[0]?.AbsEntry || 2;

  const payload3 = {
      DocDate: "2024-01-01",
      DocumentLines: [
          {
              ItemCode: '7000000000061',
              Quantity: 1,
              WarehouseCode: 'L101',
              CostingCode: 'L401',
              DocumentLinesBinAllocations: [
                  {
                      BinAbsEntry: binEntry,
                      Quantity: 1,
                      BaseLineNumber: 0,
                      SerialAndBatchNumbersBaseLine: -1
                  }
              ]
          }
      ]
  };

  try {
      const result = await axios.post('https://172.18.30.114:50000/b1s/v1/InventoryGenEntries', payload3, {
          headers: { Cookie: cookie },
          httpsAgent: agent
      });
      console.log("Success payload3");
  } catch(e: any) {
      console.log("Error payload3", e.response?.data?.error?.message?.value || e.message);
  }

  const payload4 = {
      DocDate: "2024-01-01",
      DocumentLines: [
          {
              ItemCode: '7000000000061',
              Quantity: 1,
              WarehouseCode: 'L101',
              CostingCode: 'L401', 
              DocumentLinesBinAllocations: [
                  {
                      BinAbsEntry: binEntry,
                      Quantity: 1,
                      SerialAndBatchNumbersBaseLine: -1
                  }
              ]
          }
      ]
  };

  try {
      const result2 = await axios.post('https://172.18.30.114:50000/b1s/v1/InventoryGenEntries', payload4, {
          headers: { Cookie: cookie },
          httpsAgent: agent
      });
      console.log("Success payload4");
  } catch(e: any) {
      console.log("Error payload4", e.response?.data?.error?.message?.value || e.message);
  }
}
run().catch(console.error);
