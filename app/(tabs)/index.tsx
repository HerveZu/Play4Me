import { SafeAreaView } from 'react-native-safe-area-context'
import { useSpotify } from '@/providers/spotify'
import { Text } from 'react-native'

export default function Page() {
    const spotify = useSpotify()

    return (
        <SafeAreaView>
            <Text>{spotify.accessToken}</Text>
        </SafeAreaView>
    )
}
