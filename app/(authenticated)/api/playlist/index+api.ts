import { withSession } from '@/lib/auth'
import { db } from '@/db'
import { playlists, playSessions } from '@/db/schema/public'
import { and, count, eq, isNull } from 'drizzle-orm'

export type Playlist = typeof playlists.$inferSelect & { active: boolean }

export async function GET(request: Request) {
  return await withSession(request, async (session) => {
    const userPlaylists = await db
      .select({
        id: playlists.id,
        title: playlists.title,
        description: playlists.description,
        ownerId: playlists.ownerId,
        activeSessionsCount: count(playSessions.playlistId),
      })
      .from(playlists)
      .leftJoin(
        playSessions,
        and(
          eq(playlists.id, playSessions.playlistId),
          isNull(playSessions.stoppedAt)
        )
      )
      .where(eq(playlists.ownerId, session.user.id))
      .groupBy(playlists.id)
      .orderBy(playlists.title)

    return Response.json(
      userPlaylists.map((playlist) => ({
        ...playlist,
        active: playlist.activeSessionsCount > 0,
      })) as Playlist[]
    )
  })
}
