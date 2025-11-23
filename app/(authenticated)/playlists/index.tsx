import {
  Button,
  ContextMenu,
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
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { UserPlaylist } from '@/app/(authenticated)/api/playlist/index+api'
import { formatRelative, startOfDay } from 'date-fns'
import { capitalizeFirstLetter } from '@/lib/utils'
import { PlayingIndicator } from '@/lib/PlayingIndicator'
import { frame, padding } from '@expo/ui/swift-ui/modifiers'
import { useQuery } from '@tanstack/react-query'
import { getClientSpotifyApi } from '@/lib/spotify/client'
import { useWindowDimensions } from 'react-native'

export default function HomePage() {
  const { playlists, deletePlaylist } = usePlaylists()
  const router = useRouter()

  const playlistsPerDay = useMemo(() => {
    const playlistPerDay = new Map<number | 'never', UserPlaylist[]>()
    playlists.forEach((playlist) => {
      if (!playlist.lastPlayedAt) {
        playlistPerDay.set('never', [
          ...(playlistPerDay.get('never') ?? []),
          playlist,
        ])
        return
      }
      const date = startOfDay(new Date(playlist.lastPlayedAt))
      const dayPlaylists = playlistPerDay.get(date.getTime()) ?? []
      playlistPerDay.set(date.getTime(), [...dayPlaylists, playlist])
    })
    return [...playlistPerDay.entries()]
  }, [playlists])

  return (
    <Host style={{ flex: 1 }}>
      <Form>
        {playlistsPerDay.length === 0 && (
          <Section>
            <HStack>
              <Text weight={'semibold'}>Create your first playlist!</Text>
              <Spacer />
              <Button
                systemImage={'chevron.right'}
                variant={'glass'}
                onPress={() => router.push('/new-playlist')}
              />
            </HStack>
          </Section>
        )}
        {playlistsPerDay.map(([day, playlists]) => (
          <Section
            key={day.toString()}
            title={
              day !== 'never'
                ? capitalizeFirstLetter(
                    formatRelative(day, new Date(), {}).split('at')[0]
                  )
                : 'Never played yet'
            }
          >
            {playlists.map((playlist) => (
              <ContextMenu activationMethod={'longPress'} key={playlist.id}>
                <ContextMenu.Preview>
                  <PlaylistPreview playlist={playlist} />
                </ContextMenu.Preview>
                <ContextMenu.Trigger>
                  <HStack
                    onPress={() =>
                      router.push(`/player?playlistId=${playlist.id}`)
                    }
                    alignment={'top'}
                  >
                    <PlaylistItem playlist={playlist} />
                    <Spacer />
                  </HStack>
                </ContextMenu.Trigger>
                <ContextMenu.Items>
                  <Button
                    systemImage={'waveform'}
                    onPress={() =>
                      router.push(`/player?playlistId=${playlist.id}`)
                    }
                  >
                    Player
                  </Button>
                  <Button
                    role={'destructive'}
                    systemImage={'trash'}
                    onPress={() => deletePlaylist({ playlistId: playlist.id })}
                  >
                    Delete
                  </Button>
                </ContextMenu.Items>
              </ContextMenu>
            ))}
          </Section>
        ))}
      </Form>
    </Host>
  )
}

function PlaylistItem({ playlist }: { playlist: UserPlaylist }) {
  return (
    <VStack alignment={'leading'} spacing={10}>
      <HStack spacing={10}>
        {playlist.active ? (
          <PlayingIndicator />
        ) : (
          <Image systemName={'music.note'} size={18} />
        )}
        <Text weight={'semibold'}>{playlist.title}</Text>
      </HStack>
      <Text weight={'light'} lineLimit={1}>
        {playlist.description}
      </Text>
    </VStack>
  )
}

function PlaylistPreview({ playlist }: { playlist: UserPlaylist }) {
  const { data } = useQuery({
    queryKey: ['playlist-playback', playlist.active],
    queryFn: async () => {
      if (!playlist.active) return null
      const spotifyApi = await getClientSpotifyApi()
      return await spotifyApi.player.getPlaybackState()
    },
  })
  const { width } = useWindowDimensions()

  return (
    <VStack
      modifiers={[frame({ width: width }), padding({ vertical: 20 })]}
      spacing={40}
    >
      <VStack
        alignment={'leading'}
        spacing={10}
        modifiers={[padding({ horizontal: 20 })]}
      >
        <Text weight={'semibold'} size={20}>
          {playlist.title}
        </Text>
        <Text>{playlist.description}</Text>
      </VStack>

      {data?.device && (
        <HStack spacing={10}>
          <Spacer />
          <PlayingIndicator />
          <Text>{`Playing on ${data?.device.name}`}</Text>
          <Spacer />
        </HStack>
      )}
    </VStack>
  )
}
