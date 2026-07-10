ALTER TABLE "ap_credit_memos" ADD COLUMN "canceled" text DEFAULT 'N';--> statement-breakpoint
ALTER TABLE "ap_invoices" ADD COLUMN "canceled" text DEFAULT 'N';--> statement-breakpoint
ALTER TABLE "ar_credit_memos" ADD COLUMN "canceled" text DEFAULT 'N';--> statement-breakpoint
ALTER TABLE "grpo" ADD COLUMN "canceled" text DEFAULT 'N';--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "canceled" text DEFAULT 'N';--> statement-breakpoint
ALTER TABLE "purchase_quotations" ADD COLUMN "canceled" text DEFAULT 'N';--> statement-breakpoint
ALTER TABLE "sales_quotations" ADD COLUMN "canceled" text DEFAULT 'N';