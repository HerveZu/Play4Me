import { type AuthSession, withSession } from '@/lib/auth'
import { db } from '@/db'
import {
  type PlaylistQueue,
  playlistQueues,
  type PlaySession,
  playSessions,
} from '@/db/schema/public'
import { and, eq, isNull } from 'drizzle-orm'
import { deferTask } from 'expo-server'
import { Playlist, SpotifyApi, Track, TrackItem } from '@spotify/web-api-ts-sdk'
import { z } from 'zod'
import Groq from 'groq-sdk'
import { milliseconds } from 'date-fns'
import { getServerSpotifyApi } from '@/lib/spotify-server'

export type StartPlaylistInput = {
  playlistId: string
  deviceId: string
}

export async function POST(request: Request) {
  return await withSession(request, async (session) => {
    const input = (await request.json()) as StartPlaylistInput
    const [activeSession] = await db
      .select()
      .from(playSessions)
      .where(
        and(
          eq(playSessions.ownerId, session.user.id),
          eq(playSessions.playlistId, input.playlistId),
          isNull(playSessions.stoppedAt)
        )
      )

    if (activeSession) {
      return Response.json(activeSession)
    }

    const spotifyApi = await getServerSpotifyApi(session)

    let [queue] = await db
      .select()
      .from(playlistQueues)
      .where(eq(playlistQueues.ownerId, session.user.id))

    const spotifyUser = await spotifyApi.currentUser.profile()

    if (!queue) {
      console.log('No queue found, creating one')
      const queuePlaylist = await spotifyApi.playlists.createPlaylist(
        spotifyUser.id,
        {
          name: 'Play4Me',
          description: 'Play4Me uses this playlist to queue songs.',
          public: false,
        }
      )
      const [createdQueue] = await db
        .insert(playlistQueues)
        .values({
          queuePlaylistId: queuePlaylist.id,
          ownerId: session.user.id,
        })
        .returning()
      queue = createdQueue
    }

    const [newSession] = await db
      .insert(playSessions)
      .values({
        playlistId: input.playlistId,
        deviceId: input.deviceId,
        ownerId: session.user.id,
        queueId: queue.id,
        startedAt: new Date(),
      })
      .returning()

    deferTask(async () => {
      try {
        await playlistLoop({
          playSession: newSession,
          authSession: session,
          queue,
        })
      } catch (e: unknown) {
        console.error('Error in playlist loop', e)
      } finally {
        console.log('Playlist loop finished, stopping session', {
          sessionId: newSession.id,
        })
        await db
          .update(playSessions)
          .set({ stoppedAt: new Date() })
          .where(eq(playSessions.id, newSession.id))
      }
    })

    return Response.json(newSession)
  })
}

async function playlistLoop({
  authSession,
  playSession,
  queue,
}: {
  authSession: AuthSession
  playSession: PlaySession
  queue: PlaylistQueue
}) {
  const spotifyApi = await getServerSpotifyApi(authSession)
  const playlist = await spotifyApi.playlists.getPlaylist(queue.queuePlaylistId)

  if (playlist.tracks.total > 0) {
    await spotifyApi.playlists.removeItemsFromPlaylist(playlist.id, {
      tracks: playlist.tracks.items.map((item) => ({
        uri: item.track.uri,
      })),
    })
    console.log('Removed tracks from playlist', { sessionId: playSession.id })
  }

  const tracks = await llmSearchTracks({ count: 3, playlist, spotifyApi })
  await spotifyApi.playlists.addItemsToPlaylist(
    playlist.id,
    tracks.map((track) => track.uri)
  )
  console.log('Added tracks to playlist', { sessionId: playSession.id })
  await spotifyApi.player.startResumePlayback(
    playSession.deviceId,
    playlist.uri
  )
  console.log('Started playback', { sessionId: playSession.id })
  let lastCheckedPlaying = (await spotifyApi.player.getCurrentlyPlayingTrack())
    ?.item

  while (true) {
    await new Promise((resolve) =>
      setTimeout(resolve, milliseconds({ seconds: 30 }))
    )

    try {
      const updateResult = await playlistLoopUpdate({
        playSessionId: playSession.id,
        authSession,
        lastCheckedPlaying,
      })
      lastCheckedPlaying = updateResult.currentlyPlaying
    } catch (e: unknown) {
      console.error('Error in playlist loop update', {
        error: e,
        sessionId: playSession.id,
      })
      return
    }
  }
}

async function playlistLoopUpdate({
  playSessionId,
  authSession,
  lastCheckedPlaying,
}: {
  playSessionId: string
  authSession: AuthSession
  lastCheckedPlaying: TrackItem
}): Promise<{ currentlyPlaying: TrackItem }> {
  const [{ play_sessions: playSession, playlist_queues: queue }] = await db
    .select()
    .from(playSessions)
    .innerJoin(playlistQueues, eq(playSessions.queueId, playlistQueues.id))
    .where(eq(playSessions.id, playSessionId))
    .limit(1)

  if (!playSession) {
    console.log('Play session ended, stopping playlist loop', {
      sessionId: playSessionId,
    })
    return { currentlyPlaying: lastCheckedPlaying }
  }

  const spotifyApi = await getServerSpotifyApi(authSession)

  const currentlyPlaying = (await spotifyApi.player.getCurrentlyPlayingTrack())
    .item

  if (currentlyPlaying.uri === lastCheckedPlaying.uri) {
    console.log('Currently playing track unchanged, skipping update', {
      sessionId: playSession.id,
    })
    return { currentlyPlaying }
  }

  console.log('Updating playlist queue', { sessionId: playSession.id })

  const playlist = await spotifyApi.playlists.getPlaylist(queue.queuePlaylistId)

  console.log('Adding more tracks to playlist queue', {
    sessionId: playSession.id,
  })

  const newTracks = await llmSearchTracks({
    count: 1,
    playlist,
    spotifyApi,
  })

  await spotifyApi.playlists.addItemsToPlaylist(
    playlist.id,
    newTracks.map((track) => track.uri)
  )

  return { currentlyPlaying }
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

const SelectedMusicSchema = z.array(
  z.object({
    title: z.string().describe('The song name'),
    artist: z.string().describe('The main artist of the song'),
  })
)

async function llmSearchTracks({
  count,
  playlist,
  spotifyApi,
}: {
  count: number
  playlist: Playlist
  spotifyApi: SpotifyApi
}) {
  const history = playlist.tracks.items.map((track) => ({
    songTitle: track.track.name,
  }))

  const systemPrompt = `
You are an expert music curator and playlist generator. 
Your task is to analyze the provided playlist description 
and generate a JSON array representing the best song that fits the theme and mood.
Add variances to the song selection.
Never pick a song that is present in the history unless explicitly allowed in the playlist description.

Return ${count * 2} songs, all different.

### PLAYLIST DETAILS

DESCRIPTION: ${playlist.description}
HISTORY: ${JSON.stringify(history)}
`

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: systemPrompt,
      },
    ],
    model: process.env.GROQ_MODEL!,
    temperature: 0.8,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'SelectedSongs',
        description: 'An array of selected songs',
        schema: z.toJSONSchema(SelectedMusicSchema),
      },
    },
  })

  const jsonString = chatCompletion.choices[0]?.message?.content
  const selectedMusic = SelectedMusicSchema.parse(
    JSON.parse(jsonString ?? '[]')
  )

  const matchedTracks: Track[] = []

  for (const song of selectedMusic.sort(() => Math.random() - 0.5)) {
    const searchResult = await spotifyApi.search(
      `track:"${song.title}" artist:"${song.artist}"`,
      ['track'],
      undefined,
      1
    )
    const matchedTrack = searchResult.tracks?.items.at(0)
    const duplicate = [
      ...matchedTracks,
      ...playlist.tracks.items.map((x) => x.track),
    ].some((item) => item.uri === matchedTrack?.uri)

    if (matchedTrack && !duplicate) {
      matchedTracks.push(matchedTrack)
    }

    if (matchedTracks.length >= count) {
      break
    }
  }

  return matchedTracks
}
