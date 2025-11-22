import React from 'react'
import { PlaybackProvider } from '@/providers/playback'
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs'
import { PlaylistsProvider } from '@/providers/playlists'
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
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="playlists">
        <Label>Playlists</Label>
        <Icon sf="music.note.list" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="new-playlist">
        <Icon sf="sparkles" />
        <Label>New Playlist</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="player" role={'search'}>
        <Icon sf="speaker.2" />
        <Label>Player</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf="gear" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
