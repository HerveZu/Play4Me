import { SafeAreaView } from 'react-native-safe-area-context'
import { ConnectSpotifyButton } from '@/providers/spotify'
import { Text } from '@/components/nativewindui/Text'

export default function Page() {
    return (
        <SafeAreaView>
            <Text className={'text-primary'}>Settings</Text>
            <ConnectSpotifyButton variant={'primary'}>
                <Text>Connect to Spotify</Text>
            </ConnectSpotifyButton>
        </SafeAreaView>
    )
}
