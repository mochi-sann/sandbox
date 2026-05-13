ALTER TABLE "audit_logs" ADD COLUMN "before_value" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "after_value" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "changed_fields" text DEFAULT '' NOT NULL;