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
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
    AccessToken,
    InMemoryCachingStrategy,
    SpotifyApi,
    UserProfile,
} from '@spotify/web-api-ts-sdk'

const spotifyDiscovery: DiscoveryDocument = {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
}

const SPOTIFY_CLIENT_ID = '4f4a8c46176f47aa9c64257361e5d955'
const SPOTIFY_ACCESS_TOKEN_KEY = 'spotify_access_token'
const SPOTIFY_REDIRECT_URI = makeRedirectUri({ path: '--/callback/spotify' })

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

type SpotifyContextType = {
    spotifyApi: SpotifyApi | null
    currentUser: UserProfile | null
    connect: () => Promise<void>
    disconnect: () => Promise<void>
}
const SpotifyContext = createContext<SpotifyContextType | null>(null)

export function SpotifyProvider({ children }: PropsWithChildren) {
    const [accessToken, setAccessToken] = useState<AccessToken | null>(null)
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)

    const [request, response, promptAsync] = useAuthRequest(
        {
            clientId: SPOTIFY_CLIENT_ID,
            scopes: ['user-read-playback-state', 'user-modify-playback-state'],
            redirectUri: SPOTIFY_REDIRECT_URI,
        },
        spotifyDiscovery
    )

    const disconnect = useCallback(async () => {
        setAccessToken(null)
        await AsyncStorage.removeItem(SPOTIFY_ACCESS_TOKEN_KEY)
    }, [setAccessToken])

    const connect = useCallback(async () => {
        await promptAsync()
    }, [promptAsync])

    const spotifyApi = useMemo(() => {
        try {
            return accessToken
                ? SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, accessToken, {
                      cachingStrategy: new InMemoryCachingStrategy(),
                  })
                : null
        } catch {
            disconnect()
            return null
        }
    }, [accessToken, disconnect])

    useEffect(() => {
        AsyncStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY).then((accessToken) =>
            setAccessToken(JSON.parse(accessToken || 'null'))
        )
    }, [setAccessToken])

    useEffect(() => {
        if (!spotifyApi) {
            setCurrentUser(null)
            return
        }
        spotifyApi.currentUser.profile().then(setCurrentUser).catch(disconnect)
    }, [spotifyApi, disconnect])

    const setAccessTokenAndStore = useCallback(
        (accessToken: AccessToken) => {
            setAccessToken(accessToken)
            AsyncStorage.setItem(
                SPOTIFY_ACCESS_TOKEN_KEY,
                JSON.stringify(accessToken)
            ).then(() => console.log('Spotify access token saved'))
        },
        [setAccessToken]
    )

    useEffect(() => {
        if (request && response?.type === 'success') {
            exchangeCodeForToken(request, response.params.code).then(
                setAccessTokenAndStore
            )
        }
    }, [request, response, setAccessTokenAndStore])

    return (
        <SpotifyContext.Provider
            value={{
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
