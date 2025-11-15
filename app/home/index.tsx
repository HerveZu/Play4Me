import { Button, Form, Host, Section, Text } from '@expo/ui/swift-ui'
import { type Playlist, usePlaylists } from '@/providers/playlists'
import { useSpotify } from '@/providers/spotify'
import { PlaybackState, SpotifyApi, Track } from '@spotify/web-api-ts-sdk'
import { milliseconds } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { PlayingIndicator } from '@/lib/PlayingIndicator'
import { useRouter } from 'expo-router'
import { useQueue } from '@/providers/queue'

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
              <Button variant={'card'} onPress={() => router.push('/settings')}>
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

  const getTracks = useCallback(
    async (spotifyApi: SpotifyApi, { count }: { count: number }) => {
      const spotifyToken = await spotifyApi.getAccessToken()
      const llmSearch = await fetch('/home/llm-search', {
        method: 'POST',
        body: JSON.stringify({ playlist, spotifyToken, count }),
      })
      return (await llmSearch.json()) as Track[]
    },
    [playlist]
  )

  const { mutate: start, isPending: isStarting } = useMutation({
    mutationFn: async () => {
      if (!spotifyApi || !defaultPlaybackDevice?.id) {
        return
      }
      const selectedTracks = await getTracks(spotifyApi, { count: 3 })
      await resetAndFocus(defaultPlaybackDevice.id, selectedTracks)
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
      if (!spotifyApi || !defaultPlaybackDevice?.id) {
        return
      }
      getTracks(spotifyApi, { count: 1 })
        .then(queueTracks)
        .then(() => console.log('Queued next song'))
    }
  }, [
    active,
    currentlyPlaying,
    defaultPlaybackDevice?.id,
    getTracks,
    queueTracks,
    spotifyApi,
    state?.item?.uri,
  ])

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
            disabled={!spotifyApi || isStarting || !defaultPlaybackDevice}
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
