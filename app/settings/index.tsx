import { Button, Form, Host, Section, Switch, Text } from '@expo/ui/swift-ui'
import { useSpotify } from '@/providers/spotify'
import { useMutation, useQuery } from '@tanstack/react-query'
import { milliseconds } from 'date-fns'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Updates from 'expo-updates'

export default function SettingsPage() {
  const { currentUser, disconnect, connect } = useSpotify()

  const { playbackSettings, setPlaybackSettings, spotifyApi } = useSpotify()

  const { data: devices } = useQuery({
    queryKey: ['available-devices', spotifyApi ? 1 : 0],
    refetchInterval: milliseconds({ seconds: 30 }),
    queryFn: async () =>
      spotifyApi ? await spotifyApi.player.getAvailableDevices() : null,
  })

  const { isPending: isDisconnectingSpotify, mutate: disconnectSpotify } =
    useMutation({
      mutationFn: disconnect,
    })

  return (
    <Host style={{ flex: 1 }}>
      <Form>
        <Section title="Spotify">
          {currentUser && (
            <Text>{`Connected as ${currentUser.display_name}`}</Text>
          )}
          <Host>
            {currentUser ? (
              <Button
                role={'destructive'}
                onPress={disconnectSpotify}
                disabled={isDisconnectingSpotify}
              >
                Disconnect
              </Button>
            ) : (
              <Button onPress={connect}>Connect</Button>
            )}
          </Host>
        </Section>

        {devices?.devices.length && (
          <Section title="Default Device">
            {devices?.devices.map((device) => (
              <Button
                key={device.id}
                onPress={() =>
                  setPlaybackSettings({
                    ...playbackSettings,
                    playbackDeviceId: device.id ?? undefined,
                  })
                }
                systemImage={
                  playbackSettings.playbackDeviceId === device.id
                    ? 'checkmark'
                    : undefined
                }
              >
                {device.name}
              </Button>
            ))}
          </Section>
        )}

        <Section title="Queue">
          <Switch
            value={!!playbackSettings.autoplay}
            onValueChange={(autoPlay) =>
              setPlaybackSettings({
                ...playbackSettings,
                autoplay: autoPlay,
              })
            }
            label={'Auto Play'}
          />
        </Section>

        <Host>
          <Button
            role={'destructive'}
            onPress={() => AsyncStorage.clear(() => Updates.reloadAsync())}
          >
            Clear All Data
          </Button>
        </Host>
      </Form>
    </Host>
  )
}
