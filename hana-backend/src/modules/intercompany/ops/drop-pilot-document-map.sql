-- P9: Drop pilot map table after export (if needed) and IC_DOCUMENT_MAPPING is live.
-- DBA approval required. Application no longer registers this table (P9).
-- New engine spine: IC_DOCUMENT_MAPPING only.

-- Pre-check: ensure pilot table exists
-- SELECT COUNT(*) FROM "SYS"."TABLES"
--  WHERE "SCHEMA_NAME" = 'SBOCOMMON' AND "TABLE_NAME" = 'INTERCOMPANY_DOCUMENT_MAP';

DROP TABLE "SBOCOMMON"."INTERCOMPANY_DOCUMENT_MAP";
