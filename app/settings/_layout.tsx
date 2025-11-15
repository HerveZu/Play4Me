import { Stack } from 'expo-router'
import { useRefreshOnFocus } from '@/lib/useRefreshOnFocus'

export default function SettingsLayout() {
    useRefreshOnFocus()

    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    title: 'Settings',
                    headerTintColor: 'foreground',
                    headerTransparent: true,
                }}
            />
        </Stack>
    )
}
