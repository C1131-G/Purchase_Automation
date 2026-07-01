CREATE TABLE "admin_settings" (
	"code" text PRIMARY KEY NOT NULL,
	"value" text
);
--> statement-breakpoint
CREATE TABLE "ap_credit_memo_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_entry" integer NOT NULL,
	"line_num" integer NOT NULL,
	"item_code" text NOT NULL,
	"item_description" text,
	"quantity" numeric(19, 6) NOT NULL,
	"unit_price" numeric(19, 6),
	"base_entry" integer,
	"base_line" integer,
	"base_type" integer,
	"base_quantity" numeric(19, 6)
);
--> statement-breakpoint
CREATE TABLE "ap_credit_memos" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"doc_due_date" date,
	"card_code" text NOT NULL,
	"card_name" text,
	"doc_total" numeric(19, 6),
	"doc_currency" text,
	"doc_status" text DEFAULT 'O',
	"paid_to_date" numeric(19, 6),
	"address" text,
	"address2" text,
	"attachment_entry" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ap_invoice_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_entry" integer NOT NULL,
	"line_num" integer NOT NULL,
	"item_code" text NOT NULL,
	"item_description" text,
	"quantity" numeric(19, 6) NOT NULL,
	"unit_price" numeric(19, 6),
	"discount_percent" numeric(5, 2),
	"vat_group" text,
	"vat_percent" numeric(5, 2),
	"warehouse_code" text,
	"uom_code" text,
	"uom_entry" integer,
	"line_total" numeric(19, 6),
	"base_entry" integer,
	"base_line" integer,
	"base_type" integer,
	"base_quantity" numeric(19, 6)
);
--> statement-breakpoint
CREATE TABLE "ap_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"doc_due_date" date,
	"card_code" text NOT NULL,
	"card_name" text,
	"doc_total" numeric(19, 6),
	"doc_currency" text,
	"doc_status" text DEFAULT 'O',
	"paid_to_date" numeric(19, 6),
	"address" text,
	"address2" text,
	"attachment_entry" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ar_credit_memo_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_entry" integer NOT NULL,
	"line_num" integer NOT NULL,
	"item_code" text NOT NULL,
	"item_description" text,
	"quantity" numeric(19, 6) NOT NULL,
	"unit_price" numeric(19, 6),
	"base_entry" integer,
	"base_line" integer,
	"base_type" integer,
	"base_quantity" numeric(19, 6)
);
--> statement-breakpoint
CREATE TABLE "ar_credit_memos" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"doc_due_date" date,
	"card_code" text NOT NULL,
	"card_name" text,
	"doc_total" numeric(19, 6),
	"doc_currency" text,
	"doc_status" text DEFAULT 'O',
	"paid_to_date" numeric(19, 6),
	"address" text,
	"address2" text,
	"attachment_entry" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ar_invoice_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_entry" integer NOT NULL,
	"line_num" integer NOT NULL,
	"item_code" text NOT NULL,
	"item_description" text,
	"quantity" numeric(19, 6) NOT NULL,
	"unit_price" numeric(19, 6),
	"discount_percent" numeric(5, 2),
	"vat_group" text,
	"vat_percent" numeric(5, 2),
	"warehouse_code" text,
	"uom_code" text,
	"uom_entry" integer,
	"line_total" numeric(19, 6),
	"base_entry" integer,
	"base_line" integer,
	"base_type" integer,
	"base_quantity" numeric(19, 6)
);
--> statement-breakpoint
CREATE TABLE "ar_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"doc_due_date" date,
	"card_code" text NOT NULL,
	"card_name" text,
	"doc_total" numeric(19, 6),
	"doc_currency" text,
	"doc_status" text DEFAULT 'O',
	"canceled" text,
	"paid_to_date" numeric(19, 6),
	"num_at_card" text,
	"address" text,
	"address2" text,
	"attachment_entry" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"abs_entry" integer,
	"source_path" text,
	"file_name" text,
	"file_extension" text,
	"free_text" text,
	"attachment_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_details" (
	"country_code" text PRIMARY KEY NOT NULL,
	"bank_code" text,
	"bank_name" text
);
--> statement-breakpoint
CREATE TABLE "business_partner_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_code" text NOT NULL,
	"address_type" text NOT NULL,
	"address" text,
	"street" text,
	"block" text,
	"city" text,
	"zip_code" text,
	"state" text,
	"country" text
);
--> statement-breakpoint
CREATE TABLE "business_partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'S' NOT NULL,
	"currency" text,
	"sales_employee_code" integer,
	"phone" text,
	"email" text,
	"bill_to_address" text,
	"ship_to_address" text,
	"frozen" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_partners_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "chart_of_accounts" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text,
	"postable" boolean,
	"finance" boolean
);
--> statement-breakpoint
CREATE TABLE "goods_issue_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_entry" integer NOT NULL,
	"line_num" integer NOT NULL,
	"item_code" text NOT NULL,
	"dscription" text,
	"quantity" numeric(19, 6) NOT NULL,
	"price" numeric(19, 6),
	"warehouse_code" text,
	"acct_code" text,
	"base_type" integer,
	"base_entry" integer,
	"base_line" integer
);
--> statement-breakpoint
CREATE TABLE "goods_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"tax_date" date,
	"comments" text,
	"doc_total" numeric(19, 6),
	"doc_currency" text,
	"doc_status" text DEFAULT 'O',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_entry" integer NOT NULL,
	"line_num" integer NOT NULL,
	"item_code" text NOT NULL,
	"dscription" text,
	"quantity" numeric(19, 6) NOT NULL,
	"price" numeric(19, 6),
	"warehouse_code" text,
	"acct_code" text,
	"uom_code" text,
	"base_type" integer,
	"base_entry" integer,
	"base_line" integer
);
--> statement-breakpoint
CREATE TABLE "goods_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"tax_date" date,
	"comments" text,
	"jrnl_memo" text,
	"doc_total" numeric(19, 6),
	"doc_currency" text,
	"doc_status" text DEFAULT 'O',
	"ref2" text,
	"series" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grpo_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_entry" integer NOT NULL,
	"line_num" integer NOT NULL,
	"item_code" text NOT NULL,
	"item_description" text,
	"quantity" numeric(19, 6) NOT NULL,
	"unit_price" numeric(19, 6),
	"warehouse_code" text,
	"uom_code" text,
	"uom_entry" integer,
	"line_total" numeric(19, 6),
	"base_entry" integer,
	"base_line" integer,
	"base_type" integer,
	"base_quantity" numeric(19, 6)
);
--> statement-breakpoint
CREATE TABLE "grpo" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"doc_due_date" date,
	"card_code" text NOT NULL,
	"card_name" text,
	"doc_total" numeric(19, 6),
	"doc_currency" text,
	"doc_status" text DEFAULT 'O',
	"address" text,
	"address2" text,
	"comments" text,
	"attachment_entry" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incoming_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"card_code" text NOT NULL,
	"card_name" text,
	"doc_total" numeric(19, 6),
	"doc_currency" text,
	"counter_ref" text,
	"payment_mode" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transfer_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_entry" integer NOT NULL,
	"line_num" integer NOT NULL,
	"item_code" text NOT NULL,
	"dscription" text,
	"quantity" numeric(19, 6) NOT NULL,
	"from_warehouse_code" text,
	"warehouse_code" text,
	"base_type" integer,
	"base_entry" integer,
	"base_line" integer
);
--> statement-breakpoint
CREATE TABLE "inventory_transfer_request_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_entry" integer NOT NULL,
	"line_num" integer NOT NULL,
	"item_code" text NOT NULL,
	"dscription" text,
	"quantity" numeric(19, 6) NOT NULL,
	"from_warehouse_code" text,
	"warehouse_code" text,
	"open_qty" numeric(19, 6),
	"line_status" text
);
--> statement-breakpoint
CREATE TABLE "inventory_transfer_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"doc_status" text DEFAULT 'O',
	"comments" text,
	"doc_total" numeric(19, 6),
	"filler" text,
	"to_warehouse_code" text,
	"doc_currency" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"comments" text,
	"filler" text,
	"to_warehouse_code" text,
	"doc_total" numeric(19, 6),
	"doc_currency" text,
	"doc_status" text DEFAULT 'O',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_prices" (
	"item_code" text NOT NULL,
	"price_list" integer NOT NULL,
	"price" numeric(19, 6)
);
--> statement-breakpoint
CREATE TABLE "item_warehouse_stock" (
	"item_code" text NOT NULL,
	"warehouse_code" text NOT NULL,
	"on_hand" numeric(19, 6)
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"foreign_name" text,
	"item_group_code" integer,
	"inventory_uom" text,
	"purchase_item" boolean DEFAULT false,
	"sales_item" boolean DEFAULT false,
	"inventory_item" boolean DEFAULT false,
	"default_warehouse" text,
	"avg_price" numeric(19, 6),
	"last_purchase_price" numeric(19, 6),
	"last_purchase_date" date,
	"barcode" text,
	"frozen" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "items_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "outgoing_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"card_code" text NOT NULL,
	"card_name" text,
	"doc_total" numeric(19, 6),
	"doc_currency" text,
	"payment_mode" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_num" integer NOT NULL,
	"list_name" text NOT NULL,
	CONSTRAINT "price_lists_list_num_unique" UNIQUE("list_num")
);
--> statement-breakpoint
CREATE TABLE "purchase_order_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_entry" integer NOT NULL,
	"line_num" integer NOT NULL,
	"item_code" text NOT NULL,
	"item_description" text,
	"quantity" numeric(19, 6) NOT NULL,
	"unit_price" numeric(19, 6),
	"discount_percent" numeric(5, 2),
	"vat_group" text,
	"vat_percent" numeric(5, 2),
	"warehouse_code" text,
	"uom_code" text,
	"uom_entry" integer,
	"line_total" numeric(19, 6),
	"base_entry" integer,
	"base_line" integer,
	"base_type" integer,
	"base_quantity" numeric(19, 6)
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"doc_due_date" date,
	"card_code" text NOT NULL,
	"card_name" text,
	"doc_total" numeric(19, 6),
	"doc_currency" text,
	"doc_status" text DEFAULT 'O',
	"address" text,
	"address2" text,
	"comments" text,
	"num_at_card" text,
	"sales_person_code" integer,
	"discount_percent" numeric(5, 2),
	"attachment_entry" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_quotation_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_entry" integer NOT NULL,
	"line_num" integer NOT NULL,
	"item_code" text NOT NULL,
	"item_description" text,
	"quantity" numeric(19, 6) NOT NULL,
	"unit_price" numeric(19, 6),
	"discount_percent" numeric(5, 2),
	"vat_group" text,
	"vat_percent" numeric(5, 2),
	"warehouse_code" text,
	"uom_code" text,
	"uom_entry" integer,
	"line_total" numeric(19, 6),
	"base_entry" integer,
	"base_line" integer,
	"base_type" integer,
	"base_quantity" numeric(19, 6)
);
--> statement-breakpoint
CREATE TABLE "purchase_quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"doc_due_date" date,
	"card_code" text NOT NULL,
	"card_name" text,
	"doc_total" numeric(19, 6),
	"doc_currency" text,
	"doc_status" text DEFAULT 'O',
	"address" text,
	"address2" text,
	"comments" text,
	"sales_person_code" integer,
	"discount_percent" numeric(5, 2),
	"attachment_entry" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_employees" (
	"code" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "sales_order_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_entry" integer NOT NULL,
	"line_num" integer NOT NULL,
	"item_code" text NOT NULL,
	"item_description" text,
	"quantity" numeric(19, 6) NOT NULL,
	"unit_price" numeric(19, 6),
	"discount_percent" numeric(5, 2),
	"vat_group" text,
	"vat_percent" numeric(5, 2),
	"warehouse_code" text,
	"uom_code" text,
	"uom_entry" integer,
	"line_total" numeric(19, 6),
	"base_entry" integer,
	"base_line" integer,
	"base_type" integer,
	"base_quantity" numeric(19, 6)
);
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"doc_due_date" date,
	"card_code" text NOT NULL,
	"card_name" text,
	"doc_total" numeric(19, 6),
	"doc_currency" text,
	"doc_status" text DEFAULT 'O',
	"canceled" text,
	"address" text,
	"address2" text,
	"comments" text,
	"num_at_card" text,
	"sales_person_code" integer,
	"discount_percent" numeric(5, 2),
	"attachment_entry" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_quotation_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_entry" integer NOT NULL,
	"line_num" integer NOT NULL,
	"item_code" text NOT NULL,
	"item_description" text,
	"quantity" numeric(19, 6) NOT NULL,
	"unit_price" numeric(19, 6),
	"discount_percent" numeric(5, 2),
	"vat_group" text,
	"vat_percent" numeric(5, 2),
	"warehouse_code" text,
	"uom_code" text,
	"uom_entry" integer,
	"line_total" numeric(19, 6),
	"open_qty" numeric(19, 6),
	"base_entry" integer,
	"base_line" integer,
	"base_type" integer,
	"base_quantity" numeric(19, 6)
);
--> statement-breakpoint
CREATE TABLE "sales_quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_num" integer NOT NULL,
	"doc_date" date NOT NULL,
	"doc_due_date" date,
	"card_code" text NOT NULL,
	"card_name" text,
	"doc_total" numeric(19, 6),
	"doc_currency" text,
	"doc_status" text DEFAULT 'O',
	"address" text,
	"address2" text,
	"comments" text,
	"sales_person_code" integer,
	"discount_percent" numeric(5, 2),
	"attachment_entry" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_groups" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rate" numeric(5, 2) NOT NULL,
	"inactive" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "unit_of_measurements" (
	"code" text PRIMARY KEY NOT NULL,
	"entry" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"company_name" text DEFAULT 'Default Company' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"inactive" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
