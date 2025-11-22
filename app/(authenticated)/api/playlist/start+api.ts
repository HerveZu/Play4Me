import { withSession } from '@/lib/auth'
import { db } from '@/db'
import {
  Playlist,
  playlistQueues,
  playlists,
  PlaySession,
  playSessions,
} from '@/db/schema/public'
import { and, eq, isNull } from 'drizzle-orm'
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

    let [[queue], [userPlaylist]] = await Promise.all([
      db
        .select()
        .from(playlistQueues)
        .where(eq(playlistQueues.ownerId, authSession.user.id)),
      db.select().from(playlists).where(eq(playlists.id, input.playlistId)),
    ])

    const spotifyApi = await getServerSpotifyApi({
      userId: authSession.user.id,
    })
    const spotifyUser = await spotifyApi.currentUser.profile()

    // refreshing the playlist has issues
    // see: https://community.spotify.com/t5/Spotify-for-Developers/How-to-refresh-a-playlist-after-a-change/td-p/5076245
    if (queue) {
      const existingQueuePlaylist = await spotifyApi.playlists.getPlaylist(
        queue.queuePlaylistId
      )
      if (existingQueuePlaylist) {
        console.info('Playlist queue exists, deleting...', {
          playlistId: queue.queuePlaylistId,
        })
        await fetch(
          `https://api.spotify.com/v1/playlists/${existingQueuePlaylist.id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${await spotifyApi.getAccessToken()}`,
            },
          }
        )
      }
    }

    console.info('Creating a new queue playlist')
    const queuePlaylist = await spotifyApi.playlists.createPlaylist(
      spotifyUser.id,
      {
        name: `Play4Me • ${userPlaylist.title}`,
        description: userPlaylist.description,
        public: false,
      }
    )

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
