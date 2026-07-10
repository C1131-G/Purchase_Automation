ALTER TABLE "ar_invoices" ALTER COLUMN "canceled" SET DEFAULT 'N';--> statement-breakpoint
ALTER TABLE "sales_orders" ALTER COLUMN "canceled" SET DEFAULT 'N';