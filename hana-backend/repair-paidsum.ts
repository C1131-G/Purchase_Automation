import 'dotenv/config';
import { executeTenantQuery } from './src/dal/tenant-dal.helper';


async function repairPaidSum() {
  const db = process.env.COMMON_DB || 'AJAX_POS_DB';
  console.log('Starting PaidSum repair for DB:', db);

  try {
    const rows = await executeTenantQuery(db, 'SELECT "DocEntry", "DocNum", "PaidSum" FROM "OINV" WHERE "DocStatus" = \'O\'');
    console.log(`Found ${rows.length} open invoices to verify.`);

    // Hardcode known ones to fix immediately to avoid SL login overhead if we don't need it
    const fixes = [
      { docNum: 1038835, deduction: 59.99 },
      { docNum: 1038835, deduction: 27.74 },
      { docNum: 1038879, deduction: 1.53 },
      { docNum: 1038880, deduction: 0.57 }
    ];

    let count = 0;
    for (const fix of fixes) {
       console.log(`Deducting ${fix.deduction} from DocNum ${fix.docNum}...`);
       await executeTenantQuery(db, `UPDATE "OINV" SET "PaidSum" = "PaidSum" - ${fix.deduction} WHERE "DocNum" = ${fix.docNum} AND "PaidSum" >= ${fix.deduction}`);
       count++;
    }

    console.log(`Repair complete. Attempted ${count} fixes.`);
  } catch (error) {
    console.error('Repair failed:', error);
  }
  process.exit(0);
}

repairPaidSum();
