import { Stack, useRouter } from 'expo-router'
import { useRefreshOnFocus } from '@/lib/useRefreshOnFocus'
import { Button, Host } from '@expo/ui/swift-ui'

export default function PlaylistsLayout() {
  useRefreshOnFocus()
  const router = useRouter()

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Playlists',
          headerTintColor: 'foreground',
          headerTransparent: true,
          headerLargeTitle: true,
          headerRight: () => (
            <Host matchContents>
              <Button
                variant={'glass'}
                systemImage={'plus'}
                onPress={() => router.push('/new-playlist')}
              />
            </Host>
          ),
        }}
      />
    </Stack>
  )
}
