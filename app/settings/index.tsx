import { Button, Form, Host, Section, Text } from '@expo/ui/swift-ui'
import { useSpotify } from '@/providers/spotify'
import { usePlaylists } from '@/providers/playlists'
import { useMutation } from '@tanstack/react-query'

export default function SettingsPage() {
    const { currentUser, disconnect, connect } = useSpotify()
    const { playlists, clearAll } = usePlaylists()

    const { isPending: isClearingPlaylist, mutate: clearAllPlaylists } =
        useMutation({
            mutationFn: clearAll,
        })

    const { isPending: isDisconnectingSpotify, mutate: disconnectSpotify } =
        useMutation({
            mutationFn: disconnect,
        })

    return (
        <Host style={{ flex: 1 }}>
            <Form>
                <Section title="Spotify">
                    <Host>
                        {currentUser ? (
                            <Text>{currentUser.display_name}</Text>
                        ) : (
                            <Text>No Spotify account linked</Text>
                        )}
                    </Host>
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

                <Host>
                    <Button
                        role={'destructive'}
                        onPress={clearAllPlaylists}
                        disabled={!playlists.length || isClearingPlaylist}
                    >
                        Clear Playlists
                    </Button>
                </Host>
            </Form>
        </Host>
    )
}
