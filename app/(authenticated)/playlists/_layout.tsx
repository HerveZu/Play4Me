import { Stack, useRouter } from 'expo-router'
import { useRefreshOnFocus } from '@/lib/useRefreshOnFocus'
import { HeaderButton } from '@/lib/HeaderButton'

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
            <HeaderButton
              sfSymbol={'plus'}
              onPress={() => router.push('/new-playlist')}
            />
          ),
        }}
      />
    </Stack>
  )
}
