import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

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

const PLAYLISTS_KEY = 'play4me_playlists'

type PlaylistsContextType = {
    loading: boolean
    playlists: Playlist[]
    addPlaylist: (playlist: {
        name: string
        description: string
    }) => Promise<Playlist>
    removePlaylist: (data: { id: string }) => Promise<void>
}
const PlaylistsContext = createContext<PlaylistsContextType | null>(null)

export function PlaylistsProvider({ children }: PropsWithChildren) {
    const [playlists, setPlaylists] = useState<Playlist[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        AsyncStorage.getItem(PLAYLISTS_KEY)
            .then((json) => {
                if (json) setPlaylists(JSON.parse(json))
            })
            .finally(() => setLoading(false))
    }, [])

    const persist = useCallback(async (next: Playlist[]) => {
        setPlaylists(next)
        await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(next))
    }, [])

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

    return (
        <PlaylistsContext.Provider
            value={{
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
