import { withSession } from '@/lib/auth'
import { db } from '@/db'
import { Playlist, playlists } from '@/db/schema/public'
import { and, eq } from 'drizzle-orm'

export type EditPlaylistInput = {
  title: string
  description: string
  playlistId: string
}

export async function PUT(request: Request) {
  return await withSession(request, async (session) => {
    const input = (await request.json()) as EditPlaylistInput
    const [playlist] = await db
      .update(playlists)
      .set({
        title: input.title,
        description: input.description,
      })
      .where(
        and(
          eq(playlists.id, input.playlistId),
          eq(playlists.ownerId, session.user.id)
        )
      )
      .returning()

    return Response.json(playlist as Playlist)
  })
}
