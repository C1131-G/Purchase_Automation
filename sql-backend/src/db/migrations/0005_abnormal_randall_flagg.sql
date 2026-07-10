ALTER TABLE "ap_credit_memos" ADD COLUMN "comments" text;--> statement-breakpoint
ALTER TABLE "ap_credit_memos" ADD COLUMN "num_at_card" text;--> statement-breakpoint
ALTER TABLE "ap_invoices" ADD COLUMN "comments" text;--> statement-breakpoint
ALTER TABLE "ap_invoices" ADD COLUMN "num_at_card" text;--> statement-breakpoint
ALTER TABLE "ar_credit_memos" ADD COLUMN "comments" text;--> statement-breakpoint
ALTER TABLE "ar_credit_memos" ADD COLUMN "num_at_card" text;--> statement-breakpoint
ALTER TABLE "ar_invoices" ADD COLUMN "comments" text;--> statement-breakpoint
ALTER TABLE "grpo" ADD COLUMN "num_at_card" text;--> statement-breakpoint
ALTER TABLE "purchase_quotations" ADD COLUMN "num_at_card" text;--> statement-breakpoint
ALTER TABLE "sales_quotations" ADD COLUMN "num_at_card" text;