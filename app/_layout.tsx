import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import 'react-native-url-polyfill/auto'
import { Slot, SplashScreen } from 'expo-router'

const queryClient = new QueryClient()

SplashScreen.preventAutoHideAsync()
export default function RootLayout() {
  return (
    <>
      <StatusBar />
      <QueryClientProvider client={queryClient}>
        <Slot />
      </QueryClientProvider>
    </>
  )
}
