import type { Config } from '@netlify/functions'
import { db } from '../../db'
import { eq, isNull } from 'drizzle-orm'
import {
  PlaylistQueue,
  playlistQueues,
  playlists,
  PlaySession,
  playSessions,
} from '../../db/schema/public'
import { llmSearchTracks } from '../../lib/llmSearchTracks'
import { getServerSpotifyApi } from '../../lib/spotifyServer'

export default async () => {
  const activeSessions = await db
    .select()
    .from(playSessions)
    .innerJoin(playlistQueues, eq(playSessions.queueId, playlistQueues.id))
    .where(isNull(playSessions.stoppedAt))

  console.info('Updating playback for active sessions', {
    sessionsCount: activeSessions.length,
  })
  await Promise.all(
    activeSessions.map(({ play_sessions, playlist_queues }) =>
      updatePlayback({ playSession: play_sessions, queue: playlist_queues })
    )
  )
}

export const config: Config = {
  schedule: '* * * * *',
}

const MIN_TRACKS_IN_QUEUE = 10

async function updatePlayback({
  playSession,
  queue,
}: {
  playSession: PlaySession
  queue: PlaylistQueue
}) {
  const spotifyApi = await getServerSpotifyApi({ userId: playSession.ownerId })

  const [queuePlaylist, currentlyPlaying] = await Promise.all([
    spotifyApi.playlists.getPlaylist(queue.queuePlaylistId),
    spotifyApi.player.getCurrentlyPlayingTrack(),
  ])

  const playingItemFromQueue = currentlyPlaying && queuePlaylist.tracks.items
    .map((item, position) => ({ ...item, position }))
    .find((item) => item.track.uri === currentlyPlaying.item.uri)

  if (!playingItemFromQueue) {
    console.info(
      'Currently playing track not found in queue, stopping session',
      {
        sessionId: playSession.id,
      }
    )
    await db
      .update(playSessions)
      .set({ stoppedAt: new Date() })
      .where(eq(playSessions.id, playSession.id))
    return
  }

  const tracksToGo = queuePlaylist.tracks.total - playingItemFromQueue.position
  const missingTracks = MIN_TRACKS_IN_QUEUE - tracksToGo

  if (missingTracks <= 0) {
    console.info('Queue is full, skipping update', {
      sessionId: playSession.id,
    })
    return
  }

  console.info('Updating playlist queue', {
    sessionId: playSession.id,
    missingTracks,
  })

  const [userPlaylist] = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, playSession.playlistId))

  console.info('Adding more tracks to playlist queue', {
    sessionId: playSession.id,
  })

  const newTracks = await llmSearchTracks({
    count: Math.ceil(1.5 * missingTracks), // schedule more tracks to avoid rescheduling for each song end
    userPlaylist,
    queuePlaylist,
    spotifyApi,
  })

  await spotifyApi.playlists.addItemsToPlaylist(
    queuePlaylist.id,
    newTracks.map((track) => track.uri)
  )

  return
}
