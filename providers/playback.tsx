import { createContext, PropsWithChildren, useContext, useMemo } from 'react'
import { Device } from '@spotify/web-api-ts-sdk'
import { useStorageState } from '@/lib/useStorageState'
import { useQuery } from '@tanstack/react-query'
import { getClientSpotifyApi } from '@/lib/spotify/client'

export function usePlayback(): PlaybackContextType {
  const context = useContext(PlaybackContext)

  if (context === null) {
    throw new Error('useSpotify must be used within a SpotifyProvider')
  }

  return context
}

export type PlaybackSettings = Partial<{
  playbackDeviceId: string
}>

type PlaybackContextType = {
  playbackSettings: PlaybackSettings
  defaultPlaybackDevice: Device | null
  devices: Device[]
  setPlaybackSettings: (settings: PlaybackSettings) => Promise<void>
}
const PlaybackContext = createContext<PlaybackContextType | null>(null)

export function PlaybackProvider({ children }: PropsWithChildren) {
  const { data: playbackSettings, persist: setPlaybackSettings } =
    useStorageState<PlaybackSettings>('play4me_playback_settings', {})

  const { data: devices } = useQuery({
    queryKey: ['devices', playbackSettings.playbackDeviceId],
    queryFn: async () => {
      const spotifyApi = await getClientSpotifyApi()
      return await spotifyApi.player.getAvailableDevices()
    },
  })

  const defaultPlaybackDevice = useMemo(
    () =>
      devices?.devices.find(
        (device) => device.id === playbackSettings.playbackDeviceId
      ) ??
      devices?.devices[0] ??
      null,
    [devices, playbackSettings.playbackDeviceId]
  )

  return (
    <PlaybackContext.Provider
      value={{
        playbackSettings,
        setPlaybackSettings,
        defaultPlaybackDevice,
        devices: devices?.devices ?? [],
      }}
    >
      {children}
    </PlaybackContext.Provider>
  )
}
