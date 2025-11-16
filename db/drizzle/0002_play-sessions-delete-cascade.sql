ALTER TABLE "play_sessions" DROP CONSTRAINT "play_sessions_playlist_id_playlists_id_fk";
--> statement-breakpoint
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;