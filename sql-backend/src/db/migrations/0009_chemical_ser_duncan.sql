ALTER TABLE "goods_issue_lines" ADD COLUMN "inventory_adjustment_reason" text;--> statement-breakpoint
ALTER TABLE "goods_receipt_lines" ADD COLUMN "inventory_adjustment_reason" text;