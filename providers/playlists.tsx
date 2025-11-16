import { createContext, PropsWithChildren, useContext } from 'react'
import { CreatePlaylistInput } from '@/app/(authenticated)/api/playlist/create+api'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth'
import { StopPlaylistInput } from '@/app/(authenticated)/api/playlist/stop+api'
import { StartPlaylistInput } from '@/app/(authenticated)/api/playlist/start+api'
import { Playlist } from '@/app/(authenticated)/api/playlist/index+api'

export function usePlaylists(): PlaylistsContextType {
  const context = useContext(PlaylistsContext)

  if (context === null) {
    throw new Error('useSpotify must be used within a SpotifyProvider')
  }

  return context
}

type PlaylistsContextType = {
  playlists: Playlist[] | undefined
  start: (input: StartPlaylistInput) => Promise<void>
  stop: (input: StopPlaylistInput) => Promise<void>
  createPlaylist: (input: CreatePlaylistInput) => Promise<Playlist>
}
const PlaylistsContext = createContext<PlaylistsContextType | null>(null)

export function PlaylistsProvider({ children }: PropsWithChildren) {
  const { fetch } = useAuth()

  const { data: playlists, refetch } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => await fetch<Playlist[]>('/api/playlist'),
  })

  const { mutateAsync: createPlaylist } = useMutation({
    mutationFn: async (playlist: CreatePlaylistInput) =>
      await fetch<Playlist>('/api/playlist/create', {
        method: 'POST',
        body: JSON.stringify(playlist),
      }),
    onSuccess: () => refetch,
  })

  const { mutateAsync: start } = useMutation({
    mutationFn: async (input: StartPlaylistInput) => {
      await fetch<Playlist>('/api/playlist/start', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => refetch(),
  })

  const { mutateAsync: stop } = useMutation({
    mutationFn: async (input: StopPlaylistInput) => {
      await fetch<Playlist>('/api/playlist/stop', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => refetch(),
  })

  return (
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
