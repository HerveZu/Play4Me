CREATE TABLE "playlist_queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playlist_id" text NOT NULL,
	"owner_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "play_sessions" ADD COLUMN "device_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "play_sessions" ADD COLUMN "queue_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "playlist_queues" ADD CONSTRAINT "playlist_queues_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_queue_id_playlist_queues_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."playlist_queues"("id") ON DELETE no action ON UPDATE no action;