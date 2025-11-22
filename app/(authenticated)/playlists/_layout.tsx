import { Stack } from 'expo-router'
import { useRefreshOnFocus } from '@/lib/useRefreshOnFocus'
import { View } from 'react-native'
import { Button, Host, HStack } from '@expo/ui/swift-ui'

export default function PlaylistsLayout() {
  useRefreshOnFocus()

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
            <View>
              <Host matchContents>
                <HStack alignment={'center'}>
                  <Button systemImage={'plus'}>New playlist</Button>
                </HStack>
              </Host>
            </View>
          ),
        }}
      />
    </Stack>
  )
}
