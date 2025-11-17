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
