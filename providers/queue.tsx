import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
} from 'react'
import { Playlist, Track } from '@spotify/web-api-ts-sdk'
import { useSpotify } from '@/providers/spotify'
import { useStorageState } from '@/lib/useStorageState'

type QueueContextType = {
    queueTracks: (tracks: Track[]) => Promise<void>
    resetAndFocus: (deviceId: string, tracks: Track[]) => Promise<void>
    pauseQueue: (deviceId: string) => Promise<void>
}

const QueueContext = createContext<QueueContextType | null>(null)

export function useQueue(): QueueContextType {
    const context = useContext(QueueContext)

    if (context === null) {
        throw new Error('useQueue must be used within a QueueProvider')
    }

    return context
}

export function QueueProvider({ children }: PropsWithChildren) {
    const { currentUser, spotifyApi } = useSpotify()
    const { data: queuePlaylistId, persist: setQueuePlaylistId } =
        useStorageState<string | null>('play4me_queue_playlist', null)

    const getOrCreateQueuePlaylist = useCallback(async () => {
        if (!spotifyApi || !currentUser) {
            throw new Error('Spotify API or user not available')
        }

        let queuePlaylist: Playlist | null = null

        try {
            queuePlaylist = queuePlaylistId
                ? await spotifyApi.playlists.getPlaylist(queuePlaylistId)
                : null
        } catch {
            // not found, let's create it
        }

        if (!queuePlaylist) {
            console.log('Creating queue playlist')
            queuePlaylist = await spotifyApi.playlists.createPlaylist(
                currentUser.id,
                {
                    name: 'Play4Me',
                    description: 'Play4Me uses this playlist to queue songs.',
                    public: false,
                }
            )
        }

        await setQueuePlaylistId(queuePlaylist.id)
        return queuePlaylist
    }, [currentUser, queuePlaylistId, setQueuePlaylistId, spotifyApi])

    const queueTracks = useCallback(
        async (tracks: Track[]) => {
            if (!spotifyApi) {
                throw new Error('Spotify API or user not available')
            }

            const playlist = await getOrCreateQueuePlaylist()
            await spotifyApi.playlists.addItemsToPlaylist(
                playlist.id,
                tracks.map((track) => track.uri)
            )
        },
        [getOrCreateQueuePlaylist, spotifyApi]
    )

    const resetAndFocus = useCallback(
        async (deviceId: string, tracks: Track[]) => {
            if (!spotifyApi) {
                throw new Error('Spotify API or user not available')
            }

            const playlist = await getOrCreateQueuePlaylist()
            console.log(
                playlist.id,
                playlist.name,
                tracks.map((track) => track.uri)
            )

            if (playlist.tracks.total > 0) {
                await spotifyApi.playlists.removeItemsFromPlaylist(
                    playlist.id,
                    {
                        tracks: playlist.tracks.items.map((item) => ({
                            uri: item.track.uri,
                        })),
                    }
                )
                console.log('Removed tracks from playlist')
            }
            await spotifyApi.playlists.addItemsToPlaylist(
                playlist.id,
                tracks.map((track) => track.uri)
            )
            console.log('Added tracks to playlist')
            await spotifyApi.player.startResumePlayback(deviceId, playlist.uri)
            console.log('Started playback')
        },
        [getOrCreateQueuePlaylist, spotifyApi]
    )

    const pauseQueue = useCallback(
        async (deviceId: string) => {
            if (!spotifyApi) {
                throw new Error('Spotify API or user not available')
            }
            await spotifyApi.player.pausePlayback(deviceId)
            console.log('Paused playback')
        },
        [spotifyApi]
    )

    return (
        <QueueContext.Provider
            value={{ pauseQueue, queueTracks, resetAndFocus }}
        >
            {children}
        </QueueContext.Provider>
    )
}
