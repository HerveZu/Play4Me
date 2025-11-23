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
        {playlistsPerDay.map(([day, playlists]) => (
          <Section
            key={day.toString()}
            title={capitalizeFirstLetter(
              formatRelative(day, new Date(), {}).split('at')[0]
            )}
          >
            {playlists.map((playlist) => (
              <HStack
                key={playlist.id}
                onPress={() => router.push(`/player?playlistId=${playlist.id}`)}
              >
                <VStack alignment={'leading'} spacing={10}>
                  <HStack spacing={10}>
                    {playlist.active ? (
                      <PlayingIndicator />
                    ) : (
                      <Image systemName={'music.note'} size={18} />
                    )}
                    <Text weight={'semibold'}>{playlist.title}</Text>
                  </HStack>
                  <Text weight={'light'}>{playlist.description}</Text>
                </VStack>
                <Spacer />

                <ContextMenu>
                  <ContextMenu.Trigger>
                    <Image systemName={'chevron.right'} />
                  </ContextMenu.Trigger>
                  <ContextMenu.Items>
                    <Button
                      systemImage={'play'}
                      onPress={() =>
                        router.push(`/player?playlistId=${playlist.id}`)
                      }
                    >
                      Play
                    </Button>
                    <Button
                      role={'destructive'}
                      systemImage={'trash'}
                      onPress={() =>
                        deletePlaylist({ playlistId: playlist.id })
                      }
                    >
                      Delete
                    </Button>
                  </ContextMenu.Items>
                </ContextMenu>
              </HStack>
            ))}
          </Section>
        ))}
      </Form>
    </Host>
  )
}
