import { Button, Form, Host, Section, Text } from '@expo/ui/swift-ui'
import { type Playlist, usePlaylists } from '@/providers/playlists'
import { useSpotify } from '@/providers/spotify'
import { PlaybackState } from '@spotify/web-api-ts-sdk'
import { milliseconds } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { PlayingIndicator } from '@/lib/PlayingIndicator'
import { useRouter } from 'expo-router'
import { useQueue } from '@/providers/queue'
import { fetchSongsForPlaylist } from '@/lib/llmSearch'

const PLAYBACK_STATE_QUERY_KEY = 'playback-state'

export default function HomePage() {
    const { playlists, activePlaylist } = usePlaylists()
    const { spotifyApi, defaultPlaybackDevice } = useSpotify()
    const router = useRouter()

    const { data: playbackState } = useQuery({
        queryKey: [PLAYBACK_STATE_QUERY_KEY],
        refetchInterval: milliseconds({ seconds: 30 }),
        queryFn: async () =>
            spotifyApi ? await spotifyApi.player.getPlaybackState() : null,
        refetchIntervalInBackground: true,
    })

    return (
        <Host style={{ flex: 1 }}>
            <Form>
                {!defaultPlaybackDevice && (
                    <Section>
                        <Host>
                            <Button
                                variant={'card'}
                                onPress={() => router.push('/settings')}
                            >
                                Setup Required
                            </Button>
                        </Host>
                    </Section>
                )}
                {activePlaylist && playbackState?.is_playing && (
                    <Section>
                        <Host>
                            <PlayingIndicator />
                            <Host>
                                <Text
                                    design={'rounded'}
                                >{`Playing ${activePlaylist.name} on ${playbackState.device.name}`}</Text>
                            </Host>
                        </Host>
                    </Section>
                )}

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

function PlaylistSection({
    playlist,
    state,
}: {
    playlist: Playlist
    state: PlaybackState | null
}) {
    const { spotifyApi, defaultPlaybackDevice } = useSpotify()
    const { activePlaylist, setActivePlaylist } = usePlaylists()
    const [currentlyPlaying, setCurrentlyPlaying] = useState<string>()
    const queryClient = useQueryClient()
    const { resetAndFocus, queueTracks, pauseQueue } = useQueue()

    const active = activePlaylist && activePlaylist.id === playlist.id

    const { mutate: start, isPending: isStarting } = useMutation({
        mutationFn: async () => {
            spotifyApi &&
                defaultPlaybackDevice?.id &&
                (await resetAndFocus(
                    defaultPlaybackDevice.id,
                    await fetchSongsForPlaylist(playlist, {
                        count: 3,
                        spotifyApi: spotifyApi,
                    })
                ))
        },
        onSuccess: async () => {
            setActivePlaylist(playlist.id)
            await queryClient.invalidateQueries({
                queryKey: [PLAYBACK_STATE_QUERY_KEY],
            })
        },
    })

    const { mutate: stop, isPending: isStopping } = useMutation({
        mutationFn: async () => {
            state?.device.id && (await pauseQueue(state.device.id))
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
            fetchSongsForPlaylist(playlist, {
                spotifyApi: spotifyApi!,
                count: 2,
            })
                .then(queueTracks)
                .then(() => console.log('Queued next song'))
        }
    }, [currentlyPlaying, state, active, playlist, spotifyApi, queueTracks])

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
                        disabled={
                            !spotifyApi || isStarting || !defaultPlaybackDevice
                        }
                        variant={'card'}
                        onPress={start}
                    >
                        Play on {defaultPlaybackDevice?.name ?? 'Spotify'}
                    </Button>
                )}
            </Host>
        </Section>
    )
}
