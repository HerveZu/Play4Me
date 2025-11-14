import { Stack } from 'expo-router'

export default function SettingsLayout() {
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
