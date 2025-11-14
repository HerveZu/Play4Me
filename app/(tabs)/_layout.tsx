import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs'
import React from 'react'
import { useColorScheme } from '@/lib/useColorScheme'
import { SpotifyProvider } from '@/providers/spotify'
import { COLORS } from '@/theme/colors'

export default function TabsLayout() {
    const { colorScheme } = useColorScheme()

    return (
        <SpotifyProvider>
            <NativeTabs tintColor={COLORS[colorScheme ?? 'light'].primary}>
                <NativeTabs.Trigger name="index">
                    <Label>Home</Label>
                    <Icon sf="house.fill" drawable="custom_android_drawable" />
                </NativeTabs.Trigger>
                <NativeTabs.Trigger name="settings">
                    <Icon sf="gear" drawable="custom_settings_drawable" />
                    <Label>Settings</Label>
                </NativeTabs.Trigger>
                <NativeTabs.Trigger name="new-playlist" role={'search'}>
                    <Icon sf="music.note" />
                </NativeTabs.Trigger>
            </NativeTabs>
        </SpotifyProvider>
    )
}
