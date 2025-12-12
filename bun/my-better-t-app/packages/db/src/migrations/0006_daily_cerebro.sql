ALTER TABLE "tag" ADD CONSTRAINT "tag_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "todo" ADD CONSTRAINT "todo_user_id_unique" UNIQUE("user_id");