import { withSession } from '@/lib/auth'
import { db } from '@/db'
import {
  PlaylistQueue,
  playlistQueues,
  playlists,
  PlaySession,
  playSessions,
} from '@/db/schema/public'
import { and, eq, isNull } from 'drizzle-orm'
import { getServerSpotifyApi } from '@/lib/spotify-server'
import { deferTask } from 'expo-server'
import { llmSearchTracks } from '@/lib/llmSearchTracks'
import { Playlist, Track } from '@spotify/web-api-ts-sdk'

export type StartPlaylistInput = {
  playlistId: string
  deviceId: string
}

export async function POST(request: Request) {
  return await withSession(request, async (authSession) => {
    const input = (await request.json()) as StartPlaylistInput

    const stoppedSessions = await db
      .update(playSessions)
      .set({ stoppedAt: new Date() })
      .where(
        and(
          eq(playSessions.ownerId, authSession.user.id),
          isNull(playSessions.stoppedAt)
        )
      )
      .returning()

    console.info('Stopped sessions before stating playlist', {
      sessionIds: stoppedSessions.map((s) => s.id),
    })

    let [queue] = await db
      .select()
      .from(playlistQueues)
      .where(eq(playlistQueues.ownerId, authSession.user.id))

    const spotifyApi = await getServerSpotifyApi({
      userId: authSession.user.id,
    })

    let queuePlaylist = queue
      ? await spotifyApi.playlists.getPlaylist(queue.queuePlaylistId)
      : null

    if (queuePlaylist) {
      console.info('Playlist matching the queue found', {
        playlistId: queuePlaylist.id,
      })
    } else {
      console.info('No playlist matching the queue found')

      const spotifyUser = await spotifyApi.currentUser.profile()
      queuePlaylist = (await spotifyApi.playlists.createPlaylist(
        spotifyUser.id,
        {
          name: 'Play4Me',
          description: 'Play4Me uses this playlist to queue songs.',
          public: false,
        }
      )) as Playlist<Track>

      if (queue) {
        console.info('Updating queue with new playlist id')
        const [updatedQueue] = await db
          .update(playlistQueues)
          .set({
            queuePlaylistId: queuePlaylist.id,
          })
          .where(eq(playlistQueues.id, queue.id))
          .returning()
        queue = updatedQueue
      } else {
        console.info('Creating queue with new playlist id')
        const [createdQueue] = await db
          .insert(playlistQueues)
          .values({
            queuePlaylistId: queuePlaylist.id,
            ownerId: authSession.user.id,
          })
          .returning()
        queue = createdQueue
      }
    }

    const [playSession] = await db
      .insert(playSessions)
      .values({
        playlistId: input.playlistId,
        deviceId: input.deviceId,
        ownerId: authSession.user.id,
        queueId: queue.id,
        startedAt: new Date(),
      })
      .returning()

    deferTask(async () => {
      try {
        await startPlayback({
          playSession,
          queue,
        })
      } catch (e: unknown) {
        console.error('Error when starting playback, closing session...', e)
        await db
          .update(playSessions)
          .set({ stoppedAt: new Date() })
          .where(eq(playSessions.id, playSession.id))
      }
    })

    return Response.json(playSession)
  })
}

async function startPlayback({
  playSession,
  queue,
}: {
  queue: PlaylistQueue
  playSession: PlaySession
}) {
  const spotifyApi = await getServerSpotifyApi({ userId: playSession.ownerId })

  const queuePlaylist = await spotifyApi.playlists.getPlaylist(
    queue.queuePlaylistId
  )
  const [userPlaylist] = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, playSession.playlistId))

  if (queuePlaylist.tracks.total > 0) {
    await spotifyApi.playlists.removeItemsFromPlaylist(queuePlaylist.id, {
      tracks: queuePlaylist.tracks.items.map((item) => ({
        uri: item.track.uri,
      })),
    })
    console.info('Removed tracks from playlist', { sessionId: playSession.id })
  }

  const tracks = await llmSearchTracks({
    count: 3,
    queuePlaylist,
    userPlaylist,
    spotifyApi,
  })
  const firstTrack = tracks[0]
  console.info('Adding first tracks to playlist', {
    sessionId: playSession.id,
  })

  // only add the 1st track before starting, to make sure its the one that gets to be played first
  await spotifyApi.playlists.addItemsToPlaylist(queuePlaylist.id, [
    firstTrack.uri,
  ])
  await spotifyApi.player.startResumePlayback(
    playSession.deviceId,
    queuePlaylist.uri
  )
  console.info('Started playback', { sessionId: playSession.id })

  if (tracks.length > 1) {
    console.info('Adding remaining tracks to playlist', {
      sessionId: playSession.id,
    })
    await spotifyApi.playlists.addItemsToPlaylist(
      queuePlaylist.id,
      tracks.slice(1).map((track) => track.uri)
    )
  }

  console.info('Playlist queue updated ', {
    tracks: tracks.length,
    sessionId: playSession.id,
  })
}
