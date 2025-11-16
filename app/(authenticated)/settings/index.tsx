import { Button, Form, Host, Section, Text } from '@expo/ui/swift-ui'
import { useQuery } from '@tanstack/react-query'
import { authClient, useAuth } from '@/providers/auth'
import { type UserAccounts } from '@/app/(authenticated)/api/user/accounts+api'
import { usePlayback } from '@/providers/playback'

export default function SettingsPage() {
  const { user, session, fetch } = useAuth()
  const { devices, setPlaybackSettings, playbackSettings } = usePlayback()

  const { data: userAccounts } = useQuery({
    queryKey: ['user-accounts', session.token],
    queryFn: async () => await fetch<UserAccounts>('/api/user/accounts'),
  })

  return (
    <Host style={{ flex: 1 }}>
      <Form>
        <Section>
          <Text>{`Connected as ${user.name}`}</Text>
          <Text>{user.email}</Text>
        </Section>

        {userAccounts && (
          <Section title="Accounts">
            {userAccounts.map((account) => (
              <Text key={account.id}>{account.providerId}</Text>
            ))}
          </Section>
        )}

        {devices.length > 0 && (
          <Section title="Default Device">
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
