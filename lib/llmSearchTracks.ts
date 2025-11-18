import {
  Playlist as SpotifyPlaylist,
  SpotifyApi,
  Track,
} from '@spotify/web-api-ts-sdk'
import Groq from 'groq-sdk'
import { z } from 'zod'
import { Playlist } from '@/db/schema/public'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

const SelectedMusicSchema = z.array(
  z.object({
    title: z.string().describe('The song name'),
    artist: z.string().describe('The main artist of the song'),
  })
)

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
  const playerHistory = await spotifyApi.player.getRecentlyPlayedTracks(50)

  const historyItems = [
    ...queuePlaylist.tracks.items,
    ...playerHistory.items,
  ].map((historyItem) => ({
    type: historyItem.track.type,
    name: historyItem.track.name,
  }))

  const systemPrompt = `
You are an expert music curator and radio programmer.

Your task is to analyze the user’s playlist description and generate 
**an array of ${count * 2} song recommendations** intended to fill the next **${count} scheduled radio slots**.  
Each slot should have **two candidate songs**, allowing dynamic radio-style decision-making.

**Rules:**
- Treat the output as programming a live radio sequence.
- For each upcoming slot, provide **2 different possible songs** that match the required energy, theme, and mood.
- Maintain smooth radio-style transitions (energy flow, genre coherence, mood shaping).
- Always respect the requested genres. If diversity is requested, vary only *within* the allowed genres.
- Include natural variance—avoid repetitive patterns in era, style, or artists.
- Never select any song that appears in the provided history unless explicitly allowed.

**Radio Description**
${userPlaylist.description}

**Previously scheduled items**
${JSON.stringify(historyItems)}
`

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: systemPrompt,
      },
    ],
    model: process.env.GROQ_MODEL!,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'RadioSelectedSongs',
        description: 'The next songs to scheduled',
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
