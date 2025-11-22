import { Button, Form, Host, Section, Text } from '@expo/ui/swift-ui'
import { authClient, useAuth } from '@/providers/auth'
import { usePlayback } from '@/providers/playback'

export default function SettingsPage() {
  const { user } = useAuth()
  const { devices, setPlaybackSettings, playbackSettings } = usePlayback()

  return (
    <Host style={{ flex: 1 }}>
      <Form>
        <Section>
          <Text>{`Connected as ${user.name}`}</Text>
          <Text weight={'light'}>{user.email}</Text>
        </Section>

        {devices.length > 0 ? (
          <Section title="Playback Device">
            {devices.map((device) => (
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
        ) : (
          <Section>
            <Text>No device currently available.</Text>
          </Section>
        )}
        <Host>
          <Button role={'destructive'} onPress={authClient.signOut}>
            Sign Out
          </Button>
        </Host>
      </Form>
    </Host>
  )
}
