import { withSession } from '@/lib/auth'
import { db } from '@/db'
import { Playlist, playlists, PlaylistSettings } from '@/db/schema/public'

export type CreatePlaylistInput = {
  title: string
  description: string
  settings: PlaylistSettings
}

export async function POST(request: Request) {
  return await withSession(request, async (session) => {
    const input = (await request.json()) as CreatePlaylistInput
    const [playlist] = await db
      .insert(playlists)
      .values({
        title: input.title,
        description: input.description,
        ownerId: session.user.id,
        settings: input.settings,
      })
      .returning()

    return Response.json(playlist as Playlist)
  })
}
