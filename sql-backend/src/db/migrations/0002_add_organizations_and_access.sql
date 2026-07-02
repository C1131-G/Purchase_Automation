CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"db_name" text NOT NULL,
	"db_server" text DEFAULT 'localhost' NOT NULL,
	"is_active" text DEFAULT 'Y' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_db_name_unique" UNIQUE("db_name")
);
--> statement-breakpoint
CREATE TABLE "user_db_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"db_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_db_access" ADD CONSTRAINT "user_db_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_db_access" ADD CONSTRAINT "user_db_access_db_name_organizations_db_name_fk" FOREIGN KEY ("db_name") REFERENCES "public"."organizations"("db_name") ON DELETE cascade ON UPDATE no action;