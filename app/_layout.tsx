import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { SpotifyProvider } from '@/providers/spotify'
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs'
import { PlaylistsProvider } from '@/providers/playlists'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function RootLayout() {
    return (
        <>
            <StatusBar />
            <QueryClientProvider client={queryClient}>
                <SpotifyProvider>
                    <PlaylistsProvider>
                        <NativeTabs>
                            <NativeTabs.Trigger name="home">
                                <Label>Play4Me</Label>
                                <Icon
                                    sf="music.note.list"
                                    drawable="custom_android_drawable"
                                />
                            </NativeTabs.Trigger>
                            <NativeTabs.Trigger name="new-playlist">
                                <Icon sf="sparkles" />
                                <Label>Create</Label>
                            </NativeTabs.Trigger>
                            <NativeTabs.Trigger name="settings" role={'search'}>
                                <Icon sf="powerplug" />
                            </NativeTabs.Trigger>
                        </NativeTabs>
                    </PlaylistsProvider>
                </SpotifyProvider>
            </QueryClientProvider>
        </>
    )
}
