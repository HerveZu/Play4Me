import {
    AuthRequest,
    DiscoveryDocument,
    makeRedirectUri,
    useAuthRequest,
} from 'expo-auth-session'
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
    ICachable,
    ICachingStrategy,
    IResponseDeserializer,
    SpotifyApi,
    UserProfile,
} from '@spotify/web-api-ts-sdk'
import { useStorageState } from '@/lib/useStorageState'
import AsyncStorage from '@react-native-async-storage/async-storage'

const spotifyDiscovery: DiscoveryDocument = {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
}

const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!
const SPOTIFY_REDIRECT_URI = makeRedirectUri({ path: '--/callback/spotify' })
const SPOTIFY_SCOPES = [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-recently-played',
]

const createUrlEncodedString = (data: Record<string, string | number>) => {
    return Object.keys(data)
        .map(
            (key) =>
                encodeURIComponent(key) + '=' + encodeURIComponent(data[key])
        )
        .join('&')
}

async function exchangeCodeForToken(
    { codeVerifier, redirectUri, clientId }: AuthRequest,
    code: string
): Promise<AccessToken> {
    const result = await fetch(spotifyDiscovery.tokenEndpoint ?? '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: createUrlEncodedString({
            client_id: clientId,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier ?? '',
        }),
    })

    const text = await result.text()

    if (!result.ok) {
        throw new Error(
            `Failed to exchange code for token: ${result.statusText}, ${text}`
        )
    }

    return JSON.parse(text) as AccessToken
}

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
    setPlaybackSettings: (settings: PlaybackSettings) => Promise<void>
}
const SpotifyContext = createContext<SpotifyContextType | null>(null)

class AsyncStorageCachingStrategy implements ICachingStrategy {
    async get<T>(cacheKey: string): Promise<(T & ICachable) | null> {
        const json = await AsyncStorage.getItem(cacheKey)
        return json ? (JSON.parse(json) as T & ICachable) : null
    }

    async getOrCreate<T>(
        cacheKey: string,
        createFunction: () => Promise<T & ICachable & object>,
        updateFunction?: (item: T) => Promise<T & ICachable & object>
    ): Promise<T & ICachable> {
        const item = await this.get<T>(cacheKey)
        if (item) {
            await updateFunction?.(item)
            return item
        }
        const newItem = await createFunction()
        this.setCacheItem(cacheKey, newItem)
        return newItem
    }

    remove(cacheKey: string): void {
        AsyncStorage.removeItem(cacheKey)
    }

    setCacheItem<T>(cacheKey: string, item: T & ICachable): void {
        AsyncStorage.setItem(cacheKey, JSON.stringify(item))
    }
}

// https://github.com/spotify/spotify-web-api-ts-sdk/issues/127
class UnhealthyResponseDeserializer implements IResponseDeserializer {
    async deserialize<T>(response: Response): Promise<T> {
        const text = await response.text()
        if (text.length > 0) {
            try {
                return JSON.parse(text) as T
            } catch {}
        }

        return null as T
    }
}

export function SpotifyProvider({ children }: PropsWithChildren) {
    const { data: accessToken, persist: persistAccessToken } =
        useStorageState<AccessToken | null>('spotify_access_token', null)
    const { data: playbackSettings, persist: setPlaybackSettings } =
        useStorageState<PlaybackSettings>('spotify_playback_settings', {
            autoplay: true,
        })
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)

    const [request, response, promptAsync] = useAuthRequest(
        {
            clientId: SPOTIFY_CLIENT_ID,
            scopes: SPOTIFY_SCOPES,
            redirectUri: SPOTIFY_REDIRECT_URI,
        },
        spotifyDiscovery
    )

    const disconnect = useCallback(async () => {
        await persistAccessToken(null)
    }, [persistAccessToken])

    const connect = useCallback(async () => {
        await promptAsync()
    }, [promptAsync])

    const spotifyApi = useMemo(() => {
        try {
            return accessToken
                ? SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, accessToken, {
                      cachingStrategy: new AsyncStorageCachingStrategy(),
                      deserializer: new UnhealthyResponseDeserializer(),
                  })
                : null
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

    return (
        <SpotifyContext.Provider
            value={{
                playbackSettings,
                setPlaybackSettings,
                spotifyApi,
                connect,
                disconnect,
                currentUser,
            }}
        >
            {children}
        </SpotifyContext.Provider>
    )
}
