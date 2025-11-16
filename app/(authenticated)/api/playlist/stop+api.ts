import { withSession } from '@/lib/auth'
import { db } from '@/db'
import { playlistQueues, playSessions } from '@/db/schema/public'
import { and, eq, isNull } from 'drizzle-orm'
import { getServerSpotifyApi } from '@/lib/spotify-server'

export type StopPlaylistInput = {
  playlistId: string
}

export async function POST(request: Request) {
  return await withSession(request, async (session) => {
    const input = (await request.json()) as StopPlaylistInput
    const [activeSession] = await db
      .select()
      .from(playSessions)
      .innerJoin(playlistQueues, eq(playSessions.queueId, playlistQueues.id))
      .where(
        and(
          eq(playSessions.ownerId, session.user.id),
          eq(playSessions.playlistId, input.playlistId),
          isNull(playSessions.stoppedAt)
        )
      )

    if (!activeSession) {
      return new Response('No active session', {
        status: 404,
      })
    }

    try {
      const spotifyApi = await getServerSpotifyApi(session)
      await spotifyApi.player.pausePlayback(
        activeSession.play_sessions.deviceId
      )
    } finally {
      await db
        .update(playSessions)
        .set({
          stoppedAt: new Date(),
        })
        .where(eq(playSessions.id, activeSession.play_sessions.id))
    }

    return Response.json({ sessionId: activeSession.play_sessions.id })
  })
}
