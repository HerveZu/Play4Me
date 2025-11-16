import { Button, Form, Host, Section, Text } from '@expo/ui/swift-ui'
import { usePlaylists } from '@/providers/playlists'
import { usePlayback } from '@/providers/playback'
import { Playlist } from '@/app/(authenticated)/api/playlist/index+api'
import { PlayingIndicator } from '@/lib/PlayingIndicator'
import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'

export default function HomePage() {
  const { playlists } = usePlaylists()
  const activePlaylist = useMemo(
    () => playlists?.find((playlist) => playlist.active),
    [playlists]
  )

  return (
    <Host style={{ flex: 1 }}>
      <Form>
        {activePlaylist && (
          <Section>
            <Host>
              <PlayingIndicator />
              <Host>
                <Text
                  design={'rounded'}
                >{`Playing ${activePlaylist.title}`}</Text>
              </Host>
            </Host>
          </Section>
        )}

        {playlists?.map((playlist) => (
          <PlaylistSection key={playlist.id} playlist={playlist} />
        ))}
      </Form>
    </Host>
  )
}

function PlaylistSection({ playlist }: { playlist: Playlist }) {
  const { start, stop } = usePlaylists()
  const { defaultPlaybackDevice } = usePlayback()

  const { mutate: startPlaylist, isPending: isStarting } = useMutation({
    mutationFn: async ({ deviceId }: { deviceId: string }) => {
      await start({ playlistId: playlist.id, deviceId: deviceId })
    },
  })

  const { mutate: stopPlaylist, isPending: isStopping } = useMutation({
    mutationFn: async () => await stop({ playlistId: playlist.id }),
  })

  return (
    <Section title={playlist.title}>
      <Text lineLimit={3}>{playlist.description}</Text>
      <Host>
        {playlist.active ? (
          <Button
            disabled={isStopping}
            variant={'card'}
            role={'destructive'}
            onPress={stopPlaylist}
          >
            Stop
          </Button>
        ) : (
          <Button
            disabled={!defaultPlaybackDevice?.id || isStarting}
            variant={'card'}
            onPress={() =>
              defaultPlaybackDevice?.id &&
              startPlaylist({
                deviceId: defaultPlaybackDevice.id,
              })
            }
          >
            Play on {defaultPlaybackDevice?.name ?? 'Spotify'}
          </Button>
        )}
      </Host>
    </Section>
  )
}
