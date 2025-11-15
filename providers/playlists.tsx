import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useMemo,
} from 'react'
import { useStorageState } from '@/lib/useStorageState'

export function usePlaylists(): PlaylistsContextType {
    const context = useContext(PlaylistsContext)

    if (context === null) {
        throw new Error('useSpotify must be used within a SpotifyProvider')
    }

    return context
}

export type Playlist = {
    id: string
    name: string
    description: string
    createdAt: number
}

type PlaylistsContextType = {
    loading: boolean
    playlists: Playlist[]
    activePlaylist: Playlist | null
    setActivePlaylist: (id: string | null) => void
    addPlaylist: (playlist: {
        name: string
        description: string
    }) => Promise<Playlist>
    removePlaylist: (data: { id: string }) => Promise<void>
}
const PlaylistsContext = createContext<PlaylistsContextType | null>(null)

export function PlaylistsProvider({ children }: PropsWithChildren) {
    const {
        data: playlists,
        persist,
        loading,
    } = useStorageState<Playlist[]>('play4me_playlists', [])

    const { data: activePlaylistId, persist: setActivePlaylistId } =
        useStorageState<string | null>('play4me_active_playlist', null)

    const addPlaylist = useCallback(
        async ({
            name,
            description,
        }: {
            name: string
            description: string
        }) => {
            const pl: Playlist = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                name: name.trim(),
                description: description.trim(),
                createdAt: Date.now(),
            }
            const next = [pl, ...playlists]
            await persist(next)
            return pl
        },
        [persist, playlists]
    )

    const removePlaylist = useCallback(
        async ({ id }: { id: string }) => {
            const next = playlists.filter((p) => p.id !== id)
            await persist(next)
        },
        [persist, playlists]
    )

    const activePlaylist = useMemo(
        () => playlists.find((p) => p.id === activePlaylistId),
        [activePlaylistId, playlists]
    )

    return (
        <PlaylistsContext.Provider
            value={{
                activePlaylist: activePlaylist ?? null,
                setActivePlaylist: setActivePlaylistId,
                loading,
                playlists,
                addPlaylist,
                removePlaylist,
            }}
        >
            {children}
        </PlaylistsContext.Provider>
    )
}
