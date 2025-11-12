import { Button, ButtonProps } from 'react-native'
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
}
const SpotifyContext = createContext<SpotifyContextType | null>(null)

export function SpotifyProvider({ children }: PropsWithChildren) {
    const [accessToken, setAccessToken] = useState<string | null>(null)

    useEffect(() => {
        AsyncStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY).then(setAccessToken)
    }, [setAccessToken])

    const setAccessTokenAndStore = useCallback(
        (accessToken: string) => {
            setAccessToken(null)
            AsyncStorage.setItem(SPOTIFY_ACCESS_TOKEN_KEY, accessToken).then(
                () => console.log('Spotify access token saved')
            )
        },
        [setAccessToken]
    )

    return (
        <SpotifyContext.Provider
            value={{ accessToken, setAccessToken: setAccessTokenAndStore }}
        >
            {children}
        </SpotifyContext.Provider>
    )
}

export function ConnectSpotifyButton({
    disabled,
    ...props
}: Omit<ButtonProps, 'onPress'>) {
    const [request, response, promptAsync] = useAuthRequest(
        {
            clientId: '4f4a8c46176f47aa9c64257361e5d955',
            scopes: ['user-read-playback-state', 'user-modify-playback-state'],
            redirectUri: makeRedirectUri(),
        },
        spotifyDiscovery
    )

    useEffect(() => {
        if (response?.type === 'success') {
            const { code } = response.params
            AsyncStorage.setItem(SPOTIFY_ACCESS_TOKEN_KEY, code).then(() =>
                console.log('Spotify access token saved')
            )
        }
    }, [response])

    return (
        <Button
            disabled={!request || disabled}
            onPress={() => promptAsync()}
            {...props}
        />
    )
}
