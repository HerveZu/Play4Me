import { SafeAreaView } from 'react-native-safe-area-context'
import { ConnectSpotifyButton } from '@/providers/spotify'

export default function Page() {
    return (
        <SafeAreaView>
            <ConnectSpotifyButton title="Connect Spotify" />
        </SafeAreaView>
    )
}
