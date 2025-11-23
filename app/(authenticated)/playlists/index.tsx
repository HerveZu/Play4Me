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
import { SFSymbols6_0 } from 'sf-symbols-typescript'

export default function HomePage() {
  const { playlists, deletePlaylist, editPlaylist } = usePlaylists()
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
                : undefined
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
                    systemImage={
                      playlist.settings.usePreferences ? 'heart.slash' : 'heart'
                    }
                    onPress={() =>
                      editPlaylist({
                        ...playlist,
                        playlistId: playlist.id,
                        settings: {
                          ...playlist.settings,
                          usePreferences: !playlist.settings.usePreferences,
                        },
                      })
                    }
                  >
                    {playlist.settings.usePreferences
                      ? 'Without preferences'
                      : 'Use preferences'}
                  </Button>
                  <Button
                    systemImage={
                      playlist.settings.dontRepeatFromHistory
                        ? 'eyeglasses'
                        : 'eyeglasses.slash'
                    }
                    onPress={() =>
                      editPlaylist({
                        ...playlist,
                        playlistId: playlist.id,
                        settings: {
                          ...playlist.settings,
                          dontRepeatFromHistory:
                            !playlist.settings.dontRepeatFromHistory,
                        },
                      })
                    }
                  >
                    {playlist.settings.dontRepeatFromHistory
                      ? 'Allow history repeat'
                      : "Don't repeat from history"}
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
      <HStack>
        <HStack spacing={10}>
          {playlist.active ? (
            <PlayingIndicator />
          ) : (
            <Image systemName={'music.note'} size={18} />
          )}
          <Text weight={'semibold'}>{playlist.title}</Text>
        </HStack>
        <Spacer minLength={10} />
        <HStack spacing={4}>
          {playlist.settings.usePreferences && (
            <Image size={18} systemName={'heart'} />
          )}
          {playlist.settings.dontRepeatFromHistory && (
            <Image size={18} systemName={'eyeglasses.slash'} />
          )}
        </HStack>
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

  const settings: { icon: SFSymbols6_0; label: string; active: boolean }[] = [
    {
      icon: 'heart',
      label: 'Use preferences',
      active: !!playlist.settings.usePreferences,
    },
    {
      icon: 'eyeglasses.slash',
      label: "Don't repeat from history",
      active: !!playlist.settings.dontRepeatFromHistory,
    },
  ]

  const activeSettings = settings.filter((setting) => setting.active)

  return (
    <VStack modifiers={[frame({ width: width })]} alignment={'leading'}>
      <VStack modifiers={[padding({ all: 20 })]} spacing={40}>
        <VStack alignment={'leading'} spacing={10}>
          <Text weight={'semibold'} size={18}>
            {playlist.title}
          </Text>
          <Text color={'secondary'}>{playlist.description}</Text>
        </VStack>

        {activeSettings.length > 0 && (
          <VStack spacing={5} alignment={'leading'}>
            {activeSettings.map((setting, i) => (
              <HStack key={i} spacing={20}>
                <VStack
                  alignment={'leading'}
                  modifiers={[frame({ width: 20 })]}
                >
                  <Image size={18} systemName={setting.icon} />
                </VStack>
                <Text>{setting.label}</Text>
              </HStack>
            ))}
          </VStack>
        )}
        {data?.device && (
          <HStack spacing={10}>
            <Spacer />
            <PlayingIndicator />
            <Text>{`Playing on ${data?.device.name}`}</Text>
            <Spacer />
          </HStack>
        )}
      </VStack>
    </VStack>
  )
}
