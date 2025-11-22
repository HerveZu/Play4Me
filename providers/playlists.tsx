import { createContext, PropsWithChildren, useContext, useEffect } from 'react'
import { CreatePlaylistInput } from '@/app/(authenticated)/api/playlist/create+api'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth'
import { StopPlaylistInput } from '@/app/(authenticated)/api/playlist/stop+api'
import { StartPlaylistInput } from '@/app/(authenticated)/api/playlist/start+api'
import { UserPlaylist } from '@/app/(authenticated)/api/playlist/index+api'
import { SplashScreen } from 'expo-router'

export function usePlaylists(): PlaylistsContextType {
  const context = useContext(PlaylistsContext)

  if (context === null) {
    throw new Error('useSpotify must be used within a SpotifyProvider')
  }

  return context
}

type PlaylistsContextType = {
  playlists: UserPlaylist[]
  start: (input: StartPlaylistInput) => Promise<void>
  stop: (input: StopPlaylistInput) => Promise<void>
  createPlaylist: (input: CreatePlaylistInput) => Promise<UserPlaylist>
}
const PlaylistsContext = createContext<PlaylistsContextType | null>(null)

export function PlaylistsProvider({ children }: PropsWithChildren) {
  const { fetch } = useAuth()

  const {
    data: playlists,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => await fetch<UserPlaylist[]>('/api/playlist'),
  })

  const { mutateAsync: createPlaylist } = useMutation({
    mutationFn: async (playlist: CreatePlaylistInput) =>
      await fetch<UserPlaylist>('/api/playlist/create', {
        method: 'POST',
        body: JSON.stringify(playlist),
      }),
    onSuccess: () => refetch(),
  })

  const { mutateAsync: start } = useMutation({
    mutationFn: async (input: StartPlaylistInput) => {
      await fetch('/api/playlist/start', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => refetch(),
  })

  const { mutateAsync: stop } = useMutation({
    mutationFn: async (input: StopPlaylistInput) => {
      await fetch('/api/playlist/stop', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => refetch(),
  })

  useEffect(() => {
    !isLoading && SplashScreen.hide()
  }, [isLoading])

  return !playlists ? null : (
    <PlaylistsContext.Provider
      value={{
        createPlaylist,
        start,
        stop,
        playlists,
      }}
    >
      {children}
    </PlaylistsContext.Provider>
  )
}
