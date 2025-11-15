import type { Playlist } from '@/providers/playlists'
import { SpotifyApi, Track } from '@spotify/web-api-ts-sdk'
import { addHours, isAfter } from 'date-fns'
import { z } from 'zod'
import Groq from 'groq-sdk'

const groq = new Groq({
    apiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
})

const SelectedMusicSchema = z.array(
    z.object({
        title: z.string().describe('The song name'),
        artist: z.string().describe('The main artist of the song'),
    })
)

export async function fetchSongsForPlaylist(
    playlist: Playlist,
    {
        spotifyApi,
        count,
    }: {
        count: number
        spotifyApi: SpotifyApi
    }
): Promise<Track[]> {
    const recentlyPlayedTracks =
        await spotifyApi.player.getRecentlyPlayedTracks()

    const history = recentlyPlayedTracks.items
        .filter((track) =>
            isAfter(new Date(track.played_at), addHours(new Date(), -12))
        )
        .map((track) => ({
            title: track.track.name,
            artists: track.track.artists.map((artist) => artist.name).join(','),
            album: track.track.album.name,
        }))

    const systemPrompt = `
You are an expert music curator and playlist generator. 
Your task is to analyze the provided playlist description 
and generate a JSON array representing the best song that fits the theme and mood.
Add variances to the song selection and don't pick a song that is preset in the history.

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
        model: process.env.EXPO_PUBLIC_GROQ_MODEL!,
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
        if (matchedTrack) {
            matchedTracks.push(matchedTrack)
        }

        if (matchedTracks.length >= count) {
            break
        }
    }

    return matchedTracks
}
