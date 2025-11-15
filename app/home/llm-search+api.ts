import { z } from 'zod'
import Groq from 'groq-sdk'
import { addHours, isAfter } from 'date-fns'
import { AccessToken, SpotifyApi, Track } from '@spotify/web-api-ts-sdk'
import { SPOTIFY_CONST } from '@/lib/spotify'
import { Playlist } from '@/providers/playlists'

export const LlmSearchSchema = z.object({
  spotifyToken: z.custom<AccessToken>(),
  count: z.number(),
  playlist: z.custom<Playlist>(),
})

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

const SelectedMusicSchema = z.array(
  z.object({
    title: z.string().describe('The song name'),
    artist: z.string().describe('The main artist of the song'),
  })
)

export async function POST(request: Request) {
  const { count, spotifyToken, playlist } = LlmSearchSchema.parse(
    await request.json()
  )

  const spotifyApi = SpotifyApi.withAccessToken(
    SPOTIFY_CONST.clientId,
    spotifyToken
  )
  const [currentlyPlayingTrack, recentlyPlayedTracks] = await Promise.all([
    spotifyApi.player.getCurrentlyPlayingTrack(),
    spotifyApi.player.getRecentlyPlayedTracks(50),
  ])

  const history = recentlyPlayedTracks.items
    .filter((track) =>
      isAfter(new Date(track.played_at), addHours(new Date(), -12))
    )
    .map((track) => ({
      title: track.track.name,
      artists: track.track.artists.map((artist) => artist.name).join(','),
      album: track.track.album.name,
    }))

  if (currentlyPlayingTrack?.item) {
    history.push({
      title: currentlyPlayingTrack.item.name,
      artists: '',
      album: '',
    })
  }

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
    const duplicate = recentlyPlayedTracks.items.some(
      (item) => item.track.uri === matchedTrack?.uri
    )
    if (matchedTrack && !duplicate) {
      matchedTracks.push(matchedTrack)
    }

    if (matchedTracks.length >= count) {
      break
    }
  }

  return Response.json(matchedTracks)
}
