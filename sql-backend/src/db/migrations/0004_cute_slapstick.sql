ALTER TABLE "business_partners" ADD COLUMN "bill_to_def" text;--> statement-breakpoint
ALTER TABLE "business_partners" ADD COLUMN "ship_to_def" text;--> statement-breakpoint
ALTER TABLE "goods_issue_lines" ADD COLUMN "ocr_code" text;--> statement-breakpoint
ALTER TABLE "goods_issue_lines" ADD COLUMN "uom_code" text;--> statement-breakpoint
ALTER TABLE "goods_issue_lines" ADD COLUMN "unit_msr" text;--> statement-breakpoint
ALTER TABLE "goods_issue_lines" ADD COLUMN "bin_allocations" jsonb;--> statement-breakpoint
ALTER TABLE "goods_issues" ADD COLUMN "jrnl_memo" text;--> statement-breakpoint
ALTER TABLE "goods_issues" ADD COLUMN "ref2" text;--> statement-breakpoint
ALTER TABLE "goods_issues" ADD COLUMN "series" integer;--> statement-breakpoint
ALTER TABLE "goods_issues" ADD COLUMN "price_list" integer;--> statement-breakpoint
ALTER TABLE "goods_issues" ADD COLUMN "attachment_entry" integer;--> statement-breakpoint
ALTER TABLE "goods_receipt_lines" ADD COLUMN "ocr_code" text;--> statement-breakpoint
ALTER TABLE "goods_receipt_lines" ADD COLUMN "unit_msr" text;--> statement-breakpoint
ALTER TABLE "goods_receipt_lines" ADD COLUMN "bin_allocations" jsonb;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD COLUMN "price_list" integer;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD COLUMN "attachment_entry" integer;