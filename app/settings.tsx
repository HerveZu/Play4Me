import { Button, Form, Host, Section, Text } from '@expo/ui/swift-ui'
import { ConnectSpotifyButton, useSpotify } from '@/providers/spotify'

export default function SettingsPage() {
    const { accessToken, disconnect } = useSpotify()
    const connected = !!accessToken

    return (
        <Host style={{ flex: 1 }}>
            <Form>
                <Section title="Spotify">
                    {connected ? (
                        <Text>{accessToken}</Text>
                    ) : (
                        <Text>No Spotify account linked</Text>
                    )}
                    <Host>
                        {!connected ? (
                            <ConnectSpotifyButton>Connect</ConnectSpotifyButton>
                        ) : (
                            <Button role={'destructive'} onPress={disconnect}>
                                Disconnect
                            </Button>
                        )}
                    </Host>
                </Section>
            </Form>
        </Host>
    )
}
