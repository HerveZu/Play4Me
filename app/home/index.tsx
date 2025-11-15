import { Button, Form, Host, Section, Text } from '@expo/ui/swift-ui'
import { type Playlist, usePlaylists } from '@/providers/playlists'
import { PlaybackSettings, useSpotify } from '@/providers/spotify'
import { PlaybackState, SpotifyApi, Track } from '@spotify/web-api-ts-sdk'
import Groq from 'groq-sdk'
import { addHours, isAfter, milliseconds } from 'date-fns'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { PlayingIndicator } from '@/lib/PlayingIndicator'

const groq = new Groq({
    apiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
})

const PLAYBACK_STATE_QUERY_KEY = 'playback-state'

export default function HomePage() {
    const { playlists } = usePlaylists()
    const { spotifyApi } = useSpotify()

    const { data: playbackState } = useQuery({
        queryKey: [PLAYBACK_STATE_QUERY_KEY, spotifyApi ? 1 : 0],
        refetchInterval: milliseconds({ seconds: 30 }),
        queryFn: async () =>
            spotifyApi ? await spotifyApi?.player.getPlaybackState() : null,
    })

    return (
        <Host style={{ flex: 1 }}>
            <Form>
                <Section>
                    {playbackState?.is_playing && (
                        <Host>
                            <PlayingIndicator />
                            <Host>
                                <Text
                                    design={'rounded'}
                                >{`Playing on ${playbackState.device.name}`}</Text>
                            </Host>
                        </Host>
                    )}
                </Section>

                {playlists.map((playlist, i) => (
                    <PlaylistSection
                        key={i}
                        playlist={playlist}
                        state={playbackState ?? null}
                    />
                ))}
            </Form>
        </Host>
    )
}

const SelectedMusicSchema = z.array(
    z.object({
        title: z.string().describe('The song name'),
        artist: z.string().describe('The main artist of the song'),
    })
)

function PlaylistSection({
    playlist,
    state,
}: {
    playlist: Playlist
    state: PlaybackState | null
}) {
    const { spotifyApi, playbackSettings } = useSpotify()
    const { activePlaylist, setActivePlaylist } = usePlaylists()
    const [currentlyPlaying, setCurrentlyPlaying] = useState<string>()
    const queryClient = useQueryClient()

    const active = activePlaylist && activePlaylist.id === playlist.id

    const queueNext = useCallback(
        async (hardSkip: boolean) => {
            if (!spotifyApi) {
                return
            }
            await queueFromPlaylist(playlist, {
                hardSkip,
                spotifyApi,
                playbackSettings,
            })
        },
        [spotifyApi, playbackSettings, playlist]
    )

    const { mutate: start, isPending: isStarting } = useMutation({
        mutationFn: () => queueNext(true),
        onSuccess: async () => {
            setActivePlaylist(playlist.id)
            await queryClient.invalidateQueries({
                queryKey: [PLAYBACK_STATE_QUERY_KEY],
            })
        },
    })

    const { mutate: stop, isPending: isStopping } = useMutation({
        mutationFn: async () => {
            state?.device.id &&
                (await spotifyApi?.player.pausePlayback(state.device.id))
        },
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [PLAYBACK_STATE_QUERY_KEY],
            }),
        onSettled: () => setActivePlaylist(null),
    })

    useEffect(() => {
        if (!active) {
            return
        }

        const newCurrentlyPlaying = state?.item?.uri
        setCurrentlyPlaying(newCurrentlyPlaying)

        // queue next when track changes
        if (currentlyPlaying && currentlyPlaying !== newCurrentlyPlaying) {
            console.log('Track changed, queuing next song')
            queueNext(false).then(() => console.log('Queued next song'))
        }
    }, [currentlyPlaying, state, queueNext, active])

    return (
        <Section title={playlist.name}>
            <Text lineLimit={3}>{playlist.description}</Text>
            <Host>
                {active ? (
                    <Button
                        disabled={isStopping}
                        variant={'card'}
                        role={'destructive'}
                        onPress={() => stop()}
                    >
                        Stop
                    </Button>
                ) : (
                    <Button
                        disabled={!spotifyApi || isStarting}
                        variant={'card'}
                        onPress={start}
                    >
                        Play on Spotify
                    </Button>
                )}
            </Host>
        </Section>
    )
}

async function queueFromPlaylist(
    playlist: Playlist,
    {
        playbackSettings,
        spotifyApi,
        hardSkip,
    }: {
        hardSkip: boolean
        playbackSettings: PlaybackSettings
        spotifyApi: SpotifyApi
    }
) {
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

Return 10 songs, all different.

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
    const expectedTrackCount = 2

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

        if (matchedTracks.length >= expectedTrackCount) {
            break
        }
    }

    if (matchedTracks.length === 0) {
        console.warn('No tracks found for playlist', playlist.name)
        return
    }

    console.log('Adding tracks to Spotify queue')

    if (
        hardSkip &&
        playbackSettings.autoplay &&
        playbackSettings.playbackDeviceId
    ) {
        console.log('Starting or resuming playback on device: ', {
            deviceId: playbackSettings.playbackDeviceId,
        })
        await spotifyApi.player.transferPlayback([
            playbackSettings.playbackDeviceId,
        ])
        await spotifyApi.player.startResumePlayback(
            playbackSettings.playbackDeviceId,
            undefined,
            matchedTracks.map((track) => track.uri)
        )
    }

    await spotifyApi.player.addItemToPlaybackQueue(
        matchedTracks[0].uri,
        playbackSettings.playbackDeviceId
    )
}
