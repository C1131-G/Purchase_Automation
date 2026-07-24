-- P9 appendix: seed pattern for company C (and any later peer).
-- Replace placeholders before running. Never commit real passwords.
-- Prerequisites: IC_* tables exist; companies A/B already seeded (see plan.md P0).

-- 1) Company C
/*
INSERT INTO "SBOCOMMON"."IC_COMPANY"
  ("COMPANY_CODE","COMPANY_NAME","SAP_DB_NAME","DEFAULT_BRANCH_ID","IS_ACTIVE")
VALUES
  ('C','Company C','YOUR_C_DB_NAME',NULL,1);
*/

-- 2) Service Layer technical connection for C
/*
INSERT INTO "SBOCOMMON"."IC_SAP_CONNECTION"
  ("COMPANY_ID","SERVICE_LAYER_URL","DATABASE_NAME","USERNAME","PASSWORD","IS_DEFAULT","IS_ACTIVE")
VALUES
  (
    (SELECT "COMPANY_ID" FROM "SBOCOMMON"."IC_COMPANY" WHERE "COMPANY_CODE" = 'C'),
    'https://sl-host:50000/b1s/v1',
    'YOUR_C_DB_NAME',
    'IC_TECH_USER_C',
    '***REPLACE***',
    1,
    1
  );
*/

-- 3) BP pairs (full mesh with A and B — both directions if required by routing)
/*
-- A buys from C
INSERT INTO "SBOCOMMON"."IC_BP_MAPPING"
  ("BUYER_COMPANY_ID","SELLER_COMPANY_ID","BUYER_VENDOR_CODE","SELLER_CUSTOMER_CODE","IS_ACTIVE")
VALUES
  (
    (SELECT "COMPANY_ID" FROM "SBOCOMMON"."IC_COMPANY" WHERE "COMPANY_CODE" = 'A'),
    (SELECT "COMPANY_ID" FROM "SBOCOMMON"."IC_COMPANY" WHERE "COMPANY_CODE" = 'C'),
    'V-C-IN-A',
    'C-IN-C',
    1
  );

-- C buys from A
INSERT INTO "SBOCOMMON"."IC_BP_MAPPING"
  ("BUYER_COMPANY_ID","SELLER_COMPANY_ID","BUYER_VENDOR_CODE","SELLER_CUSTOMER_CODE","IS_ACTIVE")
VALUES
  (
    (SELECT "COMPANY_ID" FROM "SBOCOMMON"."IC_COMPANY" WHERE "COMPANY_CODE" = 'C'),
    (SELECT "COMPANY_ID" FROM "SBOCOMMON"."IC_COMPANY" WHERE "COMPANY_CODE" = 'A'),
    'V-A-IN-C',
    'C-IN-A',
    1
  );
*/

-- 4) Tax mapping both ways for taxes used on test docs
/*
INSERT INTO "SBOCOMMON"."IC_TAX_MAPPING"
  ("SOURCE_COMPANY_ID","TARGET_COMPANY_ID","SOURCE_TAX_CODE","TARGET_TAX_CODE","IS_ACTIVE")
VALUES
  (
    (SELECT "COMPANY_ID" FROM "SBOCOMMON"."IC_COMPANY" WHERE "COMPANY_CODE" = 'A'),
    (SELECT "COMPANY_ID" FROM "SBOCOMMON"."IC_COMPANY" WHERE "COMPANY_CODE" = 'C'),
    'VAT0',
    'VAT0',
    1
  );
*/

-- 5) Portal match: IC_COMPANY.SAP_DB_NAME must equal VST_COMMON.DB_NAME for the org.
