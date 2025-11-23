import { withSession } from '@/lib/auth'
import { db } from '@/db'
import { playlists } from '@/db/schema/public'
import { and, eq } from 'drizzle-orm'

export type DeletePlaylistInput = {
  playlistId: string
}

export async function DELETE(request: Request) {
  return await withSession(request, async (session) => {
    const input = (await request.json()) as DeletePlaylistInput

    await db
      .delete(playlists)
      .where(
        and(
          eq(playlists.id, input.playlistId),
          eq(playlists.ownerId, session.user.id)
        )
      )
      .returning()

    return new Response(null, { status: 204 })
  })
}
