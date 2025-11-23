import { createContext, PropsWithChildren, useContext, useEffect } from 'react'
import { CreatePlaylistInput } from '@/app/(authenticated)/api/playlist/create+api'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth'
import { StopPlaylistInput } from '@/app/(authenticated)/api/playlist/stop+api'
import { StartPlaylistInput } from '@/app/(authenticated)/api/playlist/start+api'
import { UserPlaylist } from '@/app/(authenticated)/api/playlist/index+api'
import { SplashScreen } from 'expo-router'
import { milliseconds } from 'date-fns'
import { DeletePlaylistInput } from '@/app/(authenticated)/api/playlist/delete+api'
import { EditPlaylistInput } from '@/app/(authenticated)/api/playlist/edit+api'

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
  deletePlaylist: (input: DeletePlaylistInput) => Promise<void>
  editPlaylist: (input: EditPlaylistInput) => Promise<UserPlaylist>
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
    refetchInterval: milliseconds({ seconds: 30 }),
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

  const { mutateAsync: deletePlaylist } = useMutation({
    mutationFn: async (input: DeletePlaylistInput) => {
      await fetch('/api/playlist/delete', {
        method: 'DELETE',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => refetch(),
  })

  const { mutateAsync: editPlaylist } = useMutation({
    mutationFn: async (input: EditPlaylistInput) =>
      await fetch<UserPlaylist>('/api/playlist/edit', {
        method: 'PUT',
        body: JSON.stringify(input),
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
        deletePlaylist,
        editPlaylist,
      }}
    >
      {children}
    </PlaylistsContext.Provider>
  )
}
