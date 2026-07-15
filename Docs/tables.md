# Database Tables — SQL-Backend (PostgreSQL)

This document lists every table in the `sql-backend` PostgreSQL database, mapped to the original SAP HANA table it replaces. Use this when debugging schema issues or adding new fields.

---

## Purchase Documents

| Module | SQL Table | HANA Equivalent | Columns | Notes |
|--------|-----------|----------------|---------|-------|
| Purchase Quotation | `purchase_quotations` | `OPQT` | id, doc_num, doc_date, card_code, card_name, doc_total, doc_currency, doc_status, comments, sales_person_code, created_at, updated_at | |
| Purchase Quotation Lines | `purchase_quotation_lines` | `PQT1` | id, doc_entry, line_num, item_code, item_description, quantity, unit_price, discount_percent, vat_group, warehouse_code, uom_code, line_total, base_entry, base_line, base_type, open_qty, created_at | |
| Purchase Order | `purchase_orders` | `OPOR` | id, doc_num, doc_date, doc_due_date, card_code, card_name, doc_total, doc_currency, doc_status, address, address2, comments, sales_person_code, discount_percent, created_at, updated_at | |
| Purchase Order Lines | `purchase_order_lines` | `POR1` | id, doc_entry, line_num, item_code, item_description, quantity, unit_price, discount_percent, vat_group, warehouse_code, uom_code, line_total, base_entry, base_line, base_type, open_qty, created_at | |
| GRPO | `grpo` | `OPDN` | id, doc_num, doc_date, card_code, card_name, doc_total, doc_currency, doc_status, comments, created_at, updated_at | |
| GRPO Lines | `grpo_lines` | `PDN1` | id, doc_entry, line_num, item_code, item_description, quantity, unit_price, warehouse_code, uom_code, line_total, base_entry, base_line, base_type, created_at | |
| AP Invoice | `ap_invoices` | `OPCH` | id, doc_num, doc_date, doc_due_date, card_code, card_name, doc_total, doc_currency, doc_status, paid_to_date, address, address2, attachment_entry, created_at, updated_at | |
| AP Invoice Lines | `ap_invoice_lines` | `PCH1` | id, doc_entry, line_num, item_code, item_description, quantity, unit_price, warehouse_code, uom_code, line_total, base_entry, base_line, base_type, created_at | |
| AP Credit Memo | `ap_credit_memos` | `ORPC` | id, doc_num, doc_date, doc_due_date, card_code, card_name, doc_total, doc_currency, doc_status, paid_to_date, address, address2, attachment_entry, created_at, updated_at | |
| AP Credit Memo Lines | `ap_credit_memo_lines` | `RPC1` | id, doc_entry, line_num, item_code, item_description, quantity, unit_price, warehouse_code, uom_code, line_total, base_entry, base_line, base_type, created_at | |
| Outgoing Payment | `outgoing_payments` | `OVPM` | id, doc_num, doc_date, card_code, card_name, doc_total, doc_currency, payment_mode, created_at, updated_at | |

## Sales Documents

| Module | SQL Table | HANA Equivalent | Columns | Notes |
|--------|-----------|----------------|---------|-------|
| Sales Quotation | `sales_quotations` | `OQUT` | id, doc_num, doc_date, card_code, card_name, doc_total, doc_currency, doc_status, comments, sales_person_code, created_at, updated_at | |
| Sales Quotation Lines | `sales_quotation_lines` | `QUT1` | id, doc_entry, line_num, item_code, item_description, quantity, unit_price, discount_percent, vat_group, vat_percent, warehouse_code, uom_code, line_total, open_qty, created_at | |
| Sales Order | `sales_orders` | `ORDR` | id, doc_num, doc_date, card_code, card_name, doc_total, doc_currency, doc_status, num_at_card, address, address2, comments, sales_person_code, created_at, updated_at | |
| Sales Order Lines | `sales_order_lines` | `RDR1` | id, doc_entry, line_num, item_code, item_description, quantity, unit_price, discount_percent, vat_group, warehouse_code, uom_code, line_total, base_entry, base_line, base_type, open_qty, created_at | |
| AR Invoice | `ar_invoices` | `OINV` | id, doc_num, doc_date, doc_due_date, card_code, card_name, doc_total, doc_currency, doc_status, canceled, paid_to_date, num_at_card, address, address2, attachment_entry, created_at, updated_at | |
| AR Invoice Lines | `ar_invoice_lines` | `INV1` | id, doc_entry, line_num, item_code, item_description, quantity, unit_price, warehouse_code, uom_code, line_total, base_entry, base_line, base_type, created_at | |
| AR Credit Memo | `ar_credit_memos` | `ORIN` | id, doc_num, doc_date, doc_due_date, card_code, card_name, doc_total, doc_currency, doc_status, paid_to_date, address, address2, attachment_entry, created_at, updated_at | |
| AR Credit Memo Lines | `ar_credit_memo_lines` | `RIN1` | id, doc_entry, line_num, item_code, item_description, quantity, unit_price, warehouse_code, uom_code, line_total, base_entry, base_line, base_type, created_at | |
| Incoming Payment | `incoming_payments` | `ORCT` | id, doc_num, doc_date, card_code, card_name, doc_total, doc_currency, counter_ref, payment_mode, created_at, updated_at | |

## Inventory Documents

| Module | SQL Table | HANA Equivalent | Columns | Notes |
|--------|-----------|----------------|---------|-------|
| Goods Receipt | `goods_receipts` | `OIGN` | id, doc_num, doc_date, doc_status, comments, jrnl_memo, doc_currency, ref2, created_at, updated_at | |
| Goods Receipt Lines | `goods_receipt_lines` | `IGN1` | id, doc_entry, line_num, item_code, dscription, quantity, price, warehouse_code, acct_code, base_type, base_entry, base_line, created_at | |
| Goods Issue | `goods_issues` | `OIGE` | id, doc_num, doc_date, doc_status, comments, doc_currency, created_at, updated_at | |
| Goods Issue Lines | `goods_issue_lines` | `IGE1` | id, doc_entry, line_num, item_code, dscription, quantity, price, warehouse_code, acct_code, base_type, base_entry, base_line, created_at | |
| Inventory Transfer Request | `inventory_transfer_requests` | `OWTQ` | id, doc_num, doc_date, doc_status, comments, doc_total, filler, to_warehouse_code, doc_currency, created_at, updated_at | |
| Inventory Transfer Request Lines | `inventory_transfer_request_lines` | `WTQ1` | id, doc_entry, line_num, item_code, dscription, quantity, from_warehouse_code, warehouse_code, open_qty, line_status, created_at | |
| Inventory Transfer | `inventory_transfers` | `OWTR` | id, doc_num, doc_date, comments, filler, to_warehouse_code, doc_total, doc_currency, doc_status, created_at, updated_at | |
| Inventory Transfer Lines | `inventory_transfer_lines` | `WTR1` | id, doc_entry, line_num, item_code, dscription, quantity, from_warehouse_code, warehouse_code, base_type, base_entry, base_line, created_at | |

## Master / Support Tables

| SQL Table | HANA Equivalent | Columns | Notes |
|-----------|----------------|---------|-------|
| `business_partners` | `OCRD` | id, card_code, card_name, card_type (V/C), group_code, phone, email, address, created_at, updated_at | Both vendors and customers |
| `business_partner_addresses` | `CRD1` | id, card_code, address_type, address_name, street, city, state, zip_code, country, created_at | |
| `items` | `OITM` | id, code, name, foreign_name, item_group_code, inventory_uom, purchase_item, sales_item, inventory_item, default_warehouse, avg_price, last_purchase_price, last_purchase_date, barcode, frozen, created_at, updated_at | |
| `item_prices` | `ITM1` | id, item_code, price_list, price, currency, created_at | |
| `item_warehouse_stock` | `OITW` | id, item_code, warehouse_code, on_hand, is_committed, on_order, created_at, updated_at | |
| `warehouses` | `OWHS` | id, code, name, location, active, created_at, updated_at | |
| `price_lists` | `OPLN` | id, code, name, currency, active, created_at, updated_at | |
| `sales_employees` | `OSLP` | id, code, name, commission, active, created_at, updated_at | |
| `tax_groups` | `OSCN` / `ONWT` | id, code, name, rate, type (S=VAT, P=Withholding), active, created_at, updated_at | |
| `unit_of_measurements` | `OUOM` | id, code, name, active, created_at, updated_at | |
| `bank_details` | `ODSC` | id, bank_code, bank_name, country_code, active, created_at | |
| `gl_accounts` | `DSC1` | id, code, name, type, active, created_at | |
| `chart_of_accounts` | `OACT` | id, code, name, type, category, active, created_at, updated_at | |
| `document_series` | `NNM1` | id, document_type, next_num, series_name, created_at, updated_at | Auto-increment series for local document numbering |

## Auth & Admin Tables

| SQL Table | HANA Equivalent | Columns | Notes |
|-----------|----------------|---------|-------|
| `users` | `OUSR` | id, username, password_hash, email, full_name, role, active, created_at, updated_at | **New** — no direct SAP equivalent |
| `admin_settings` | `@VENDOR_PORTAL_SETTINGS` | id, key, value, created_at, updated_at | App configuration |
| `organizations` | **New** | id, company_name, db_name, db_server, is_active, created_at, updated_at | Multi-tenant company configurations |
| `user_db_access` | **New** | id, user_id, db_name, created_at, updated_at | User access rights mapping to tenant databases |

## Attachments

| SQL Table | HANA Equivalent | Columns | Notes |
|-----------|----------------|---------|-------|
| `attachments` | `OATC` + `ATC1` (merged) | id, abs_entry, source_path, file_name, file_extension, free_text, attachment_date, created_at | Single table replaces OATC header + ATC1 lines |

---

## Summary

| Category | Count | Notes |
|----------|-------|-------|
| Purchase documents | 10 tables | PQ, PO, GRPO, AP Inv, AP CM + lines + outgoing payments |
| Sales documents | 8 tables | SQ, SO, AR Inv, AR CM + lines + incoming payments |
| Inventory documents | 8 tables | GR, GI, Transfer Req, Transfer + lines |
| Master / Support | 13 tables | Partners, items, prices, stock, warehouses, series, etc. |
| Auth & Admin | 4 tables | Users, settings, organizations, user_db_access |
| Attachments | 1 table | Merged header + lines |
| **Total** | **44 tables** -> **47 tables** | |

### HANA Tables NOT Ported

These SAP HANA tables have **no direct equivalent** in the SQL backend:

| HANA Table | Reason Skipped |
|-----------|----------------|
| `OACP` | Financial periods — SAP-specific |
| `OADM` | System admin settings — not needed |
| `CRD1` (as separate) | Merged into `business_partner_addresses` |
| `NNM1` (as separate) | Replaced by custom `document_series` local numbering table |
| `SBW` | Warehouse bins — SAP Service Layer specific |
