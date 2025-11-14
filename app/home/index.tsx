import { Button, Host, List, Section, Text } from '@expo/ui/swift-ui'
import { usePlaylists } from '@/providers/playlists'

export default function HomePage() {
    const { playlists } = usePlaylists()
    return (
        <Host style={{ flex: 1 }}>
            <List scrollEnabled={true}>
                {playlists.map((playlist, i) => (
                    <Section key={i} title={playlist.name}>
                        <Text lineLimit={3}>{playlist.description}</Text>
                        <Host>
                            <Button variant={'card'} systemImage={'play'}>
                                Play on Spotify
                            </Button>
                        </Host>
                    </Section>
                ))}
            </List>
        </Host>
    )
}
