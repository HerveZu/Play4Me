import { Stack } from 'expo-router'

export default function PlayerLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Player',
          headerTintColor: 'foreground',
          headerTransparent: true,
          headerLargeTitle: true,
        }}
      />
    </Stack>
  )
}
