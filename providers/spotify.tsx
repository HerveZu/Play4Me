import { makeRedirectUri, useAuthRequest } from 'expo-auth-session'
import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Button, ButtonProps } from '@expo/ui/swift-ui'

const spotifyDiscovery = {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
}

const SPOTIFY_ACCESS_TOKEN_KEY = 'spotify_access_token'

export function useSpotify(): SpotifyContextType {
    const context = useContext(SpotifyContext)

    if (context === null) {
        throw new Error('useSpotify must be used within a SpotifyProvider')
    }

    return context
}

type SpotifyContextType = {
    accessToken: string | null
    setAccessToken: (accessToken: string) => void
    disconnect: () => void
}
const SpotifyContext = createContext<SpotifyContextType | null>(null)

export function SpotifyProvider({ children }: PropsWithChildren) {
    const [accessToken, setAccessToken] = useState<string | null>(null)

    useEffect(() => {
        AsyncStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY).then(setAccessToken)
    }, [setAccessToken])

    const setAccessTokenAndStore = useCallback(
        (accessToken: string) => {
            setAccessToken(accessToken)
            AsyncStorage.setItem(SPOTIFY_ACCESS_TOKEN_KEY, accessToken).then(
                () => console.log('Spotify access token saved')
            )
        },
        [setAccessToken]
    )

    const disconnect = useCallback(() => {
        setAccessToken(null)
        AsyncStorage.removeItem(SPOTIFY_ACCESS_TOKEN_KEY)
    }, [])

    return (
        <SpotifyContext.Provider
            value={{
                accessToken,
                setAccessToken: setAccessTokenAndStore,
                disconnect,
            }}
        >
            {children}
        </SpotifyContext.Provider>
    )
}

export function ConnectSpotifyButton({
    disabled,
    ...props
}: Omit<ButtonProps, 'onPress'>) {
    const { accessToken, setAccessToken } = useSpotify()
    const [, response, promptAsync] = useAuthRequest(
        {
            clientId: '4f4a8c46176f47aa9c64257361e5d955',
            scopes: ['user-read-playback-state', 'user-modify-playback-state'],
            redirectUri: makeRedirectUri({ path: '--/callback/spotify' }),
        },
        spotifyDiscovery
    )

    useEffect(() => {
        if (response?.type === 'success') {
            const { code } = response.params
            setAccessToken(code)
        }
    }, [response, setAccessToken])

    return (
        <Button
            disabled={!!accessToken || disabled}
            onPress={() => promptAsync()}
            {...props}
        />
    )
}
