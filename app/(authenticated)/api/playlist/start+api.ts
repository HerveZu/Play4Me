import { type AuthSession, withSession } from '@/lib/auth'
import { db } from '@/db'
import {
  type Playlist,
  type PlaylistQueue,
  playlistQueues,
  playlists,
  type PlaySession,
  playSessions,
} from '@/db/schema/public'
import { and, eq, isNull } from 'drizzle-orm'
import { deferTask } from 'expo-server'
import {
  Episode,
  Playlist as SpotifyPlaylist,
  SpotifyApi,
  Track,
} from '@spotify/web-api-ts-sdk'
import { z } from 'zod'
import Groq from 'groq-sdk'
import { milliseconds } from 'date-fns'
import { getServerSpotifyApi } from '@/lib/spotify-server'

type PlaybackTrack = Track | Episode

export type StartPlaylistInput = {
  playlistId: string
  deviceId: string
}

export async function POST(request: Request) {
  return await withSession(request, async (session) => {
    const input = (await request.json()) as StartPlaylistInput

    const stoppedSessions = await db
      .update(playSessions)
      .set({ stoppedAt: new Date() })
      .where(
        and(
          eq(playSessions.ownerId, session.user.id),
          isNull(playSessions.stoppedAt)
        )
      )
      .returning()

    console.log('Stopped sessions before stating playlist', {
      sessionIds: stoppedSessions.map((s) => s.id),
    })

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
          playlistId: input.playlistId,
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
  playlistId,
}: {
  authSession: AuthSession
  playSession: PlaySession
  queue: PlaylistQueue
  playlistId: string
}) {
  const spotifyApi = await getServerSpotifyApi(authSession)
  const queuePlaylist = await spotifyApi.playlists.getPlaylist(
    queue.queuePlaylistId
  )
  const [userPlaylist] = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, playlistId))

  if (queuePlaylist.tracks.total > 0) {
    await spotifyApi.playlists.removeItemsFromPlaylist(queuePlaylist.id, {
      tracks: queuePlaylist.tracks.items.map((item) => ({
        uri: item.track.uri,
      })),
    })
    console.log('Removed tracks from playlist', { sessionId: playSession.id })
  }

  const tracks = await llmSearchTracks({
    count: 3,
    queuePlaylist,
    userPlaylist,
    spotifyApi,
  })
  const firstTrack = tracks[0]
  console.log('Adding first tracks to playlist', { sessionId: playSession.id })

  // only add the 1st track before starting, to make sure its the one that gets to be played first
  await spotifyApi.playlists.addItemsToPlaylist(queuePlaylist.id, [
    firstTrack.uri,
  ])
  await spotifyApi.player.startResumePlayback(
    playSession.deviceId,
    queuePlaylist.uri
  )
  console.log('Started playback', { sessionId: playSession.id })

  if (tracks.length > 1) {
    console.log('Adding remaining tracks to playlist', {
      sessionId: playSession.id,
    })
    await spotifyApi.playlists.addItemsToPlaylist(
      queuePlaylist.id,
      tracks.slice(1).map((track) => track.uri)
    )
  }

  let lastCheckedPlaying: PlaybackTrack | null = null

  while (true) {
    await new Promise((resolve) =>
      setTimeout(resolve, milliseconds({ seconds: 30 }))
    )

    try {
      const userActiveSessions = await db
        .select()
        .from(playSessions)
        .innerJoin(playlistQueues, eq(playSessions.queueId, playlistQueues.id))
        .where(
          and(
            eq(playSessions.id, playSession.id),
            isNull(playSessions.stoppedAt)
          )
        )

      if (!userActiveSessions.length) {
        console.log('Play session ended, stopping playlist loop', {
          sessionId: playSession.id,
        })
        return
      }

      const [upToDatePlaySession] = userActiveSessions

      const { currentlyPlaying } = await playlistLoopUpdate({
        playSession: upToDatePlaySession.play_sessions,
        playQueue: upToDatePlaySession.playlist_queues,
        playlistId: userPlaylist.id,
        authSession,
        lastCheckedPlaying,
      })
      lastCheckedPlaying = currentlyPlaying
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
  playQueue,
  playSession,
  playlistId,
  authSession,
  lastCheckedPlaying,
}: {
  playSession: PlaySession
  playQueue: PlaylistQueue
  playlistId: string
  authSession: AuthSession
  lastCheckedPlaying: PlaybackTrack | null
}): Promise<{ currentlyPlaying: PlaybackTrack }> {
  const spotifyApi = await getServerSpotifyApi(authSession)

  const currentlyPlaying = (await spotifyApi.player.getCurrentlyPlayingTrack())
    .item

  if (lastCheckedPlaying && currentlyPlaying.uri === lastCheckedPlaying.uri) {
    console.log('Currently playing track unchanged, skipping update', {
      sessionId: playSession.id,
    })
    return { currentlyPlaying }
  }

  console.log('Updating playlist queue', { sessionId: playSession.id })

  const [userPlaylist] = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, playlistId))
  const queuePlaylist = await spotifyApi.playlists.getPlaylist(
    playQueue.queuePlaylistId
  )

  console.log('Adding more tracks to playlist queue', {
    sessionId: playSession.id,
  })

  const newTracks = await llmSearchTracks({
    count: 1,
    userPlaylist,
    queuePlaylist,
    spotifyApi,
  })

  await spotifyApi.playlists.addItemsToPlaylist(
    queuePlaylist.id,
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
  userPlaylist,
  queuePlaylist,
  spotifyApi,
}: {
  count: number
  userPlaylist: Playlist
  queuePlaylist: SpotifyPlaylist
  spotifyApi: SpotifyApi
}) {
  const history = queuePlaylist.tracks.items.map((track) => ({
    songTitle: track.track.name,
  }))

  const systemPrompt = `
You are an expert music curator and playlist generator. 
Your task is to analyze the provided playlist description 
and generate a JSON array representing the best song that fits the theme and mood.
Add variances to the song selection.
Never pick a song that is present in the history unless explicitly allowed in the playlist description.
Stick to the requested music genres even when diversity is asked.

Return ${count * 2} songs, all different.

### PLAYLIST DETAILS

DESCRIPTION: ${userPlaylist.description}
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
      ...queuePlaylist.tracks.items.map((x) => x.track),
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
