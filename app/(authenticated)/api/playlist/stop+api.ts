import { withSession } from '@/lib/auth'
import { db } from '@/db'
import { playlistQueues, playSessions } from '@/db/schema/public'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { getServerSpotifyApi } from '@/lib/spotify/server'

export type StopPlaylistInput = {
  playlistId: string
}

export async function POST(request: Request) {
  return await withSession(request, async (authSession) => {
    const input = (await request.json()) as StopPlaylistInput
    const activeSessions = await db
      .select()
      .from(playSessions)
      .innerJoin(playlistQueues, eq(playSessions.queueId, playlistQueues.id))
      .where(
        and(
          eq(playSessions.ownerId, authSession.user.id),
          eq(playSessions.playlistId, input.playlistId),
          isNull(playSessions.stoppedAt)
        )
      )

    const sessionIds = activeSessions.map((s) => s.play_sessions.id)

    try {
      const spotifyApi = await getServerSpotifyApi({
        userId: authSession.user.id,
      })

      const playbackState = await spotifyApi.player.getPlaybackState()

      if (playbackState.is_playing && playbackState.device.id) {
        console.info('Stopping playback on devices: ', {
          sessionIds,
          deviceId: playbackState.device.id,
        })
        await spotifyApi.player.pausePlayback(playbackState.device.id)
      }
    } finally {
      await db
        .update(playSessions)
        .set({
          stoppedAt: new Date(),
        })
        .where(inArray(playSessions.id, sessionIds))
    }

    return Response.json({ sessionIds })
  })
}
