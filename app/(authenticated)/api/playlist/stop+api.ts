import { withSession } from '@/lib/auth'
import { db } from '@/db'
import { playlistQueues, playSessions } from '@/db/schema/public'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { getServerSpotifyApi } from '@/lib/spotifyServer'

export type StopPlaylistInput = {
  playlistId: string
}

export async function POST(request: Request) {
  return await withSession(request, async (authSessino) => {
    const input = (await request.json()) as StopPlaylistInput
    const activeSessions = await db
      .select()
      .from(playSessions)
      .innerJoin(playlistQueues, eq(playSessions.queueId, playlistQueues.id))
      .where(
        and(
          eq(playSessions.ownerId, authSessino.user.id),
          eq(playSessions.playlistId, input.playlistId),
          isNull(playSessions.stoppedAt)
        )
      )

    if (!activeSessions.length) {
      return new Response('No active session', {
        status: 404,
      })
    }

    const sessionIds = activeSessions.map((s) => s.play_sessions.id)
    const deviceIds = [
      ...new Set(activeSessions.map((s) => s.play_sessions.deviceId)),
    ]

    console.info('Stopping playback on devices: ', { sessionIds, deviceIds })

    try {
      const spotifyApi = await getServerSpotifyApi({
        userId: authSessino.user.id,
      })

      await Promise.all(
        deviceIds.map((deviceId) => spotifyApi.player.pausePlayback(deviceId))
      )
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
