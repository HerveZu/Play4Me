import { withSession } from '@/lib/auth'
import { db } from '@/db'
import { playlists, playSessions } from '@/db/schema/public'
import { desc, eq, max, sql } from 'drizzle-orm'

export type UserPlaylist = typeof playlists.$inferSelect & {
  active: boolean
  lastPlayedAt?: Date
}

export async function GET(request: Request) {
  return await withSession(request, async (session) => {
    const userPlaylists = await db
      .select({
        id: playlists.id,
        title: playlists.title,
        description: playlists.description,
        ownerId: playlists.ownerId,
        lastPlayedAt: max(playSessions.startedAt),
        active:
          sql<boolean>`count(case when ${playSessions.stoppedAt} is null then 1 else null end) > 0`.as(
            'active'
          ),
      })
      .from(playlists)
      .leftJoin(playSessions, eq(playlists.id, playSessions.playlistId))
      .where(eq(playlists.ownerId, session.user.id))
      .groupBy(playlists.id)
      .orderBy(playlists.title, desc(max(playSessions.startedAt)))

    return Response.json(userPlaylists as UserPlaylist[])
  })
}
