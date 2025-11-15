import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { SpotifyProvider } from '@/providers/spotify'
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs'
import { PlaylistsProvider, usePlaylists } from '@/providers/playlists'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'react-native-url-polyfill/auto'
import { QueueProvider } from '@/providers/queue'

const queryClient = new QueryClient()

export default function RootLayout() {
    return (
        <>
            <StatusBar />
            <QueryClientProvider client={queryClient}>
                <SpotifyProvider>
                    <PlaylistsProvider>
                        <QueueProvider>
                            <Tabs />
                        </QueueProvider>
                    </PlaylistsProvider>
                </SpotifyProvider>
            </QueryClientProvider>
        </>
    )
}

function Tabs() {
    const { playlists } = usePlaylists()

    return (
        <NativeTabs>
            <NativeTabs.Trigger name="home" hidden={playlists.length === 0}>
                <Label>Play4Me</Label>
                <Icon sf="music.note.list" drawable="custom_android_drawable" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="new-playlist">
                <Icon sf="sparkles" />
                <Label>Create</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="settings" role={'search'}>
                <Icon sf="powerplug" />
                <Label>Settings</Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    )
}
