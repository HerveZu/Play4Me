import { useEffect, useMemo, useState } from 'react'
import {
  CircularProgress,
  Form,
  Host,
  HStack,
  Image,
  Section,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui'
import { usePlaylists } from '@/providers/playlists'
import { clipShape, frame, padding } from '@expo/ui/swift-ui/modifiers'
import { usePlayback } from '@/providers/playback'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getClientSpotifyApi } from '@/lib/spotify/client'
import { milliseconds } from 'date-fns'
import { PlayingIndicator } from '@/lib/PlayingIndicator'
import { VinylDisk, VinylState } from '@/lib/VinylDisk'
import { Image as ExpoImage } from 'expo-image'

export default function NewPlaylistPage() {
  const { playlists, start, stop } = usePlaylists()
  const { defaultPlaybackDevice } = usePlayback()
  const { playlistId } = useLocalSearchParams()
  const navigation = useNavigation()
  const queryClient = useQueryClient()

  const playlist = useMemo(
    () =>
      playlists.find((playlist) => playlist.id === playlistId) ??
      playlists.find((playlist) => playlist.active) ??
      playlists[0] ??
      null,
    [playlists, playlistId]
  )

  useEffect(() => {
    navigation.setOptions({
      title: playlist?.title ?? 'Play4Me',
    })
  }, [navigation, playlist?.title])

  const isActive = useMemo(
    () => playlists.some((p) => p.id === playlist.id && playlist.active),
    [playlist, playlists]
  )

  const [state, setState] = useState<VinylState>(
    isActive ? 'playing' : 'paused'
  )

  useEffect(() => {
    setState(isActive ? 'playing' : 'paused')
  }, [isActive])

  const { mutateAsync: controlPlaylist } = useMutation({
    mutationKey: ['control-playlist', state, defaultPlaybackDevice],
    mutationFn: async ({ playlistId }: { playlistId: string }) => {
      setState('pending')

      try {
        switch (state) {
          case 'paused':
            await start({
              playlistId,
              deviceId: defaultPlaybackDevice?.id ?? '',
            })
            return
          case 'playing':
            await stop({ playlistId })
            return
        }
      } finally {
        setState(state)
      }
    },
    onSuccess: () =>
      queryClient.refetchQueries({ queryKey: [PLAYBACK_QUERY_KEY] }),
  })

  return (
    <Host style={{ flex: 1 }}>
      <Form>
        <Section modifiers={[padding({ vertical: 4 })]}>
          <HStack
            onPress={() =>
              state !== 'pending' &&
              controlPlaylist({ playlistId: playlist.id })
            }
          >
            <Spacer />
            <VinylDisk size={260} state={state} />
            <Spacer />
          </HStack>
          <HStack alignment={'center'} spacing={10}>
            {state === 'pending' && <CircularProgress />}
            <HStack spacing={10}>
              <Spacer />
              <Text>
                {state === 'playing' ? `Tap to pause` : `Tap to play`}
              </Text>
              <Image systemName={'circle.fill'} size={5} />
              {defaultPlaybackDevice && (
                <Text weight={'light'} lineLimit={1}>
                  {defaultPlaybackDevice.name}
                </Text>
              )}
              <Spacer />
            </HStack>
          </HStack>
        </Section>

        <PlaybackInfo />
      </Form>
    </Host>
  )
}

const PLAYBACK_QUERY_KEY = 'playback'
function PlaybackInfo() {
  const { data } = useQuery({
    queryKey: [PLAYBACK_QUERY_KEY],
    refetchInterval: milliseconds({ seconds: 30 }),
    queryFn: async () => {
      const spotifyApi = await getClientSpotifyApi()
      return await spotifyApi.player.getPlaybackState()
    },
  })

  if (!data?.item || !('artists' in data.item)) {
    return null
  }

  return (
    data.device && (
      <Section>
        <HStack spacing={15}>
          <HStack
            modifiers={[
              frame({ width: 40, height: 40 }),
              clipShape('roundedRectangle'),
            ]}
          >
            <ExpoImage
              source={{ uri: data.item.album.images[0].url }}
              contentFit={'contain'}
              style={{ width: '100%', height: '100%' }}
            />
          </HStack>
          <VStack alignment={'leading'} spacing={2}>
            <Text weight={'semibold'} lineLimit={1}>
              {data.item.name}
            </Text>
            <Text lineLimit={1} size={16} color={'secondary'}>
              {data.item.artists.map((artist) => artist.name).join(' & ')}
            </Text>
          </VStack>
        </HStack>

        <HStack spacing={15}>
          <Spacer />
          {data.is_playing && <PlayingIndicator />}
          <Text
            lineLimit={1}
          >{`${data.is_playing ? 'Playing' : 'Paused'} on ${data.device.name}`}</Text>
          <Spacer />
        </HStack>
      </Section>
    )
  )
}
