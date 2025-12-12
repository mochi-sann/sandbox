ALTER TABLE "todo" DROP CONSTRAINT "todo_user_id_unique";--> statement-breakpoint
CREATE INDEX "todo_user_id_index" ON "todo" USING btree ("user_id");