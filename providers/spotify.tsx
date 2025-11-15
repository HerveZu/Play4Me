import { useAuthRequest } from 'expo-auth-session'
import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    AccessToken,
    Device,
    SpotifyApi,
    UserProfile,
} from '@spotify/web-api-ts-sdk'
import { useStorageState } from '@/lib/useStorageState'
import { useQuery } from '@tanstack/react-query'
import {
    exchangeCodeForToken,
    getSpotifyApi,
    SPOTIFY_CONST,
} from '@/lib/spotify'

export function useSpotify(): SpotifyContextType {
    const context = useContext(SpotifyContext)

    if (context === null) {
        throw new Error('useSpotify must be used within a SpotifyProvider')
    }

    return context
}

export type PlaybackSettings = Partial<{
    playbackDeviceId: string
    autoplay: boolean
}>

type SpotifyContextType = {
    spotifyApi: SpotifyApi | null
    currentUser: UserProfile | null
    connect: () => Promise<void>
    disconnect: () => Promise<void>
    playbackSettings: PlaybackSettings
    defaultPlaybackDevice: Device | null
    setPlaybackSettings: (settings: PlaybackSettings) => Promise<void>
}
const SpotifyContext = createContext<SpotifyContextType | null>(null)

export function SpotifyProvider({ children }: PropsWithChildren) {
    const { data: accessToken, persist: persistAccessToken } =
        useStorageState<AccessToken | null>(
            SPOTIFY_CONST.asyncStorageAccessKey,
            null
        )
    const { data: playbackSettings, persist: setPlaybackSettings } =
        useStorageState<PlaybackSettings>('spotify_playback_settings', {
            autoplay: true,
        })
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)

    const [request, response, promptAsync] = useAuthRequest(
        {
            clientId: SPOTIFY_CONST.clientId,
            scopes: SPOTIFY_CONST.scopes,
            redirectUri: SPOTIFY_CONST.redirectUri,
        },
        SPOTIFY_CONST.discovery
    )

    const disconnect = useCallback(async () => {
        await persistAccessToken(null)
    }, [persistAccessToken])

    const connect = useCallback(async () => {
        await promptAsync()
    }, [promptAsync])

    const spotifyApi = useMemo(() => {
        try {
            return accessToken ? getSpotifyApi(accessToken) : null
        } catch {
            disconnect()
            return null
        }
    }, [accessToken, disconnect])

    useEffect(() => {
        if (!spotifyApi) {
            setCurrentUser(null)
            return
        }
        spotifyApi.currentUser.profile().then(setCurrentUser).catch(disconnect)
    }, [spotifyApi, disconnect])

    useEffect(() => {
        if (request && response?.type === 'success') {
            exchangeCodeForToken(request, response.params.code).then(
                persistAccessToken
            )
        }
    }, [request, response, persistAccessToken])

    const { data: devices } = useQuery({
        queryKey: ['devices', spotifyApi ? 1 : 0],
        queryFn: async () =>
            spotifyApi ? await spotifyApi?.player.getAvailableDevices() : null,
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
        <SpotifyContext.Provider
            value={{
                playbackSettings,
                setPlaybackSettings,
                spotifyApi,
                connect,
                disconnect,
                currentUser,
                defaultPlaybackDevice,
            }}
        >
            {children}
        </SpotifyContext.Provider>
    )
}
