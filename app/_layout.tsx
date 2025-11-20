import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import 'react-native-url-polyfill/auto'
import { Slot } from 'expo-router'
import { useHideSplashScreenOnAuth } from '@/providers/auth'

const queryClient = new QueryClient()

export default function RootLayout() {
  useHideSplashScreenOnAuth()

  return (
    <>
      <StatusBar />
      <QueryClientProvider client={queryClient}>
        <Slot />
      </QueryClientProvider>
    </>
  )
}
