import { Stack } from 'expo-router'
import { useRefreshOnFocus } from '@/lib/useRefreshOnFocus'

export default function HomeLayout() {
    useRefreshOnFocus()

    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerTitle: 'Play4Me',
                    headerTintColor: 'foreground',
                    headerTransparent: true,
                }}
            />
        </Stack>
    )
}
