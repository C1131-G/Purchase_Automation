CREATE TABLE "document_series" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_type" text NOT NULL,
	"next_num" integer NOT NULL,
	"series_name" text DEFAULT 'Primary' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_series_document_type_unique" UNIQUE("document_type")
);
