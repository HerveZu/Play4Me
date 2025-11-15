import { Stack } from 'expo-router'

export default function NewPlaylistLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Create Your Playlist',
          headerTintColor: 'foreground',
          headerTransparent: true,
        }}
      />
    </Stack>
  )
}
