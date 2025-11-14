import { Stack } from 'expo-router'
import { ThemeProvider as NavThemeProvider } from '@react-navigation/native'

import { useColorScheme } from '@/lib/useColorScheme'
import { NAV_THEME } from '@/theme'
import { StatusBar } from 'expo-status-bar'
import '../global.css'

export const unstable_settings = {
    anchor: '(tabs)',
}

export default function RootLayout() {
    const { colorScheme, isDarkColorScheme } = useColorScheme()

    return (
        <>
            <StatusBar
                key={`root-status-bar-${isDarkColorScheme ? 'light' : 'dark'}`}
                style={isDarkColorScheme ? 'light' : 'dark'}
            />
            <NavThemeProvider value={NAV_THEME[colorScheme]}>
                <Stack>
                    <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                    />
                </Stack>
            </NavThemeProvider>
        </>
    )
}
