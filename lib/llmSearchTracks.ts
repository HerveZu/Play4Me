import {
  Playlist as SpotifyPlaylist,
  SpotifyApi,
  Track,
} from '@spotify/web-api-ts-sdk'
import { z } from 'zod'
import { Playlist } from '@/db/schema/public'
import { GoogleGenAI } from '@google/genai'

const ScheduleMusicOptionSchema = z
  .object({
    title: z.string().describe('The song title'),
    artist: z.string().describe('The primary artist of the song'),
  })
  .describe('The music schedule option for one radio slot.')

const MusicSlotSchema = z
  .object({
    a: ScheduleMusicOptionSchema.describe('The slot option A.'),
    b: ScheduleMusicOptionSchema.describe('The slot option B.'),
  })
  .describe('The radio music schedule slot.')

const MusicSlotsSchema = z.array(
  MusicSlotSchema.describe(
    'The scheduled songs slots. They must be unique and not contain duplicates.'
  )
)

type HistoryItem = { name: string; type: string; uri: string }

export async function llmSearchTracks({
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
  console.info('Searching tracks for playlist', {
    playlistId: userPlaylist.id,
    settings: userPlaylist.settings,
  })

  const [playerHistory, topArtists] = await Promise.all([
    userPlaylist?.settings.dontRepeatFromHistory
      ? spotifyApi.player.getRecentlyPlayedTracks(50)
      : { items: [] },
    userPlaylist?.settings.usePreferences
      ? spotifyApi.currentUser.topItems('artists', 'medium_term', 50)
      : { items: [] },
  ])

  const historyItems: HistoryItem[] = [
    ...queuePlaylist.tracks.items,
    ...playerHistory.items,
  ].map((historyItem) => ({
    type: historyItem.track.type,
    name: historyItem.track.name,
    uri: historyItem.track.uri,
  }))

  const genAI = new GoogleGenAI({})
  const result = await genAI.models.generateContent({
    model: 'gemini-3-pro-preview',
    config: {
      responseSchema: MusicSlotsSchema,
    },
    contents: [
      `
  You are an expert music radio programmer.

  Your task is to analyze the user’s radio description and generate
  **an array of ${count * 2} song recommendations** intended to fill the next **${count} scheduled radio slots**.
  Each slot should have **two candidate songs**, allowing dynamic radio-style decision-making.
  Choose songs similar to the user's top artists and genres when applicable.

  Rules:
  - Treat the output as programming a live radio sequence.
  - For each upcoming slot, provide **2 different possible songs** that match the required energy, theme, and mood.
  - Maintain smooth radio-style transitions (energy flow, genre coherence, mood shaping).
  - Always respect the requested genres. If diversity is requested, vary only *within* the allowed genres.
  - Include natural variance—avoid repetitive patterns in era, style, or artists.
  - Never select any song that appears in the provided history unless explicitly allowed.
      `,
      `Radio Description: ${userPlaylist.description}`,
      `Scheduled history: ${JSON.stringify(historyItems.map(({ name, type }) => ({ name, type })))}`,
      `My top artists and genres: ${JSON.stringify(topArtists.items.map((artist) => ({ genres: artist.genres, name: artist.name })))}`,
    ],
  })

  const musicSlots = MusicSlotsSchema.parse(result.data)
  const matchedTracks: Track[] = []

  for (const musicSlot of musicSlots) {
    const slotSong = await songForSlot({
      slot: musicSlot,
      history: [...historyItems, ...matchedTracks],
      spotifyApi,
    })

    if (slotSong) {
      matchedTracks.push(slotSong)
    }

    if (matchedTracks.length >= count) {
      break
    }
  }

  return matchedTracks
}

async function songForSlot({
  slot,
  history,
  spotifyApi,
}: {
  slot: z.infer<typeof MusicSlotSchema>
  history: HistoryItem[]
  spotifyApi: SpotifyApi
}): Promise<Track | null> {
  const slotResults = await Promise.all(
    [slot.a, slot.b].map(async (option) => {
      const results = await spotifyApi.search(
        `track:"${option.title}" artist:"${option.artist}"`,
        ['track'],
        undefined,
        1
      )

      return results.tracks?.items.at(0)
    })
  )

  return (
    slotResults.find(
      (result) =>
        result && !history.some((historyItem) => historyItem.uri === result.uri)
    ) ?? null
  )
}
