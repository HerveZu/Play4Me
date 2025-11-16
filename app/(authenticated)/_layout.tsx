import React from 'react'
import { PlaybackProvider } from '@/providers/playback'
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs'
import { PlaylistsProvider, usePlaylists } from '@/providers/playlists'
import { AuthProvider } from '@/providers/auth'

export default function AuthenticatedLayout() {
  return (
    <AuthProvider>
      <PlaybackProvider>
        <PlaylistsProvider>
          <Tabs />
        </PlaylistsProvider>
      </PlaybackProvider>
    </AuthProvider>
  )
}

function Tabs() {
  const { playlists } = usePlaylists()

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="home" hidden={!playlists?.length}>
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
