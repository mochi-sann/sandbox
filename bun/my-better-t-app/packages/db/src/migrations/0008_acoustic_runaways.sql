DROP INDEX "todo_user_id_index";--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "start_at" timestamp;--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "priority" text DEFAULT 'P2';--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "is_starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "estimated_minutes" integer;--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "actual_minutes" integer;