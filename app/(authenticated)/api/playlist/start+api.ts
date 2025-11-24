import { withSession } from '@/lib/auth'
import { db } from '@/db'
import {
  Playlist,
  PlaylistQueue,
  playlistQueues,
  playlists,
  PlaySession,
  playSessions,
} from '@/db/schema/public'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { getServerSpotifyApi } from '@/lib/spotify/server'
import { llmSearchTracks } from '@/lib/llmSearchTracks'
import { Playlist as SpotifyPlaylist } from '@spotify/web-api-ts-sdk'

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

    const userPlaylists = await db
      .select()
      .from(playlists)
      .leftJoin(playSessions, eq(playlists.id, playSessions.playlistId))
      .leftJoin(playlistQueues, eq(playSessions.queueId, playlistQueues.id))
      .where(
        and(
          eq(playlists.id, input.playlistId),
          eq(playlists.ownerId, authSession.user.id)
        )
      )
      .orderBy(desc(playSessions.stoppedAt), desc(playSessions.startedAt))
      .limit(1)

    if (!userPlaylists) {
      return Response.json({ error: 'Playlist not found' }, { status: 404 })
    }

    const { playlists: userPlaylist, playlist_queues: lastQueueUsed } =
      userPlaylists[0]

    const spotifyApi = await getServerSpotifyApi({
      userId: authSession.user.id,
    })

    let queuePlaylist: SpotifyPlaylist | null
    try {
      queuePlaylist = lastQueueUsed
        ? await spotifyApi.playlists.getPlaylist(lastQueueUsed.queuePlaylistId)
        : null
    } catch {
      queuePlaylist = null
    }

    if (lastQueueUsed && queuePlaylist) {
      console.log('Using existing queue playlist', {
        queue: lastQueueUsed.id,
        playlistId: lastQueueUsed.queuePlaylistId,
      })
    } else {
      const spotifyUser = await spotifyApi.currentUser.profile()

      console.info('No queue last used, creating a new queue playlist...')
      queuePlaylist = await spotifyApi.playlists.createPlaylist(
        spotifyUser.id,
        {
          name: `Play4Me • ${userPlaylist.title.slice(0, 30)}`,
          description: userPlaylist.description.slice(0, 100),
          public: false,
        }
      )
    }

    let queue: PlaylistQueue
    if (lastQueueUsed) {
      console.info('Updating queue with new playlist id')
      const [updatedQueue] = await db
        .update(playlistQueues)
        .set({
          queuePlaylistId: queuePlaylist.id,
        })
        .where(eq(playlistQueues.id, lastQueueUsed.id))
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

    try {
      await startPlayback({
        playSession,
        queuePlaylist,
        userPlaylist,
      })
    } catch (e: unknown) {
      console.error('Error when starting playback, closing session...', e)
      await db
        .update(playSessions)
        .set({ stoppedAt: new Date() })
        .where(eq(playSessions.id, playSession.id))
      throw e
    }

    return Response.json(playSession)
  })
}

async function startPlayback({
  playSession,
  userPlaylist,
  queuePlaylist,
}: {
  userPlaylist: Playlist
  queuePlaylist: SpotifyPlaylist
  playSession: PlaySession
}) {
  const spotifyApi = await getServerSpotifyApi({ userId: playSession.ownerId })

  if (queuePlaylist.tracks.total > 0) {
    await spotifyApi.playlists.removeItemsFromPlaylist(queuePlaylist.id, {
      tracks: queuePlaylist.tracks.items.map((item) => ({
        uri: item.track.uri,
      })),
    })
    console.info('Removed tracks from playlist', { sessionId: playSession.id })
  }

  const tracks = await llmSearchTracks({
    count: 10,
    queuePlaylist,
    userPlaylist,
    spotifyApi,
  })

  if (tracks.length === 0) {
    throw new Error('No tracks scheduled for playlist')
  }

  console.info('Adding tracks to playlist', {
    sessionId: playSession.id,
    tracksCount: tracks.length,
  })

  await spotifyApi.playlists.addItemsToPlaylist(
    queuePlaylist.id,
    tracks.map((track) => track.uri)
  )

  await spotifyApi.player.startResumePlayback(
    playSession.deviceId,
    queuePlaylist.uri
  )

  console.info('Playlist queue updated ', {
    tracks: tracks.length,
    sessionId: playSession.id,
  })
}
