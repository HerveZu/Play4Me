import { Button, Form, Host, Section, Text } from '@expo/ui/swift-ui'
import { ConnectSpotifyButton, useSpotify } from '@/providers/spotify'
import { usePlaylists } from '@/providers/playlists'
import { useMutation } from '@tanstack/react-query'

export default function SettingsPage() {
    const { accessToken, disconnect } = useSpotify()
    const { playlists, clearAll } = usePlaylists()
    const connected = !!accessToken

    const { isPending, mutate: clearAllPlaylists } = useMutation({
        mutationFn: clearAll,
    })

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

                <Host>
                    <Button
                        role={'destructive'}
                        onPress={clearAllPlaylists}
                        disabled={!playlists.length || isPending}
                    >
                        Clear Playlists
                    </Button>
                </Host>
            </Form>
        </Host>
    )
}
