import { AuthRequest, makeRedirectUri } from 'expo-auth-session'
import {
  AccessToken,
  ICachable,
  ICachingStrategy,
  IResponseDeserializer,
  SpotifyApi,
} from '@spotify/web-api-ts-sdk'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const SPOTIFY_CONST = {
  discovery: {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
  },
  clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!,
  redirectUri: makeRedirectUri({ path: '--/callback/spotify' }),
  scopes: [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-recently-played',
    'playlist-read-private',
    'playlist-modify-private',
  ],
  asyncStorageAccessKey: 'spotify_access_token',
}

const createUrlEncodedString = (data: Record<string, string | number>) => {
  return Object.keys(data)
    .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
    .join('&')
}

export async function exchangeCodeForToken(
  { codeVerifier, redirectUri, clientId }: AuthRequest,
  code: string
): Promise<AccessToken> {
  const result = await fetch(SPOTIFY_CONST.discovery.tokenEndpoint ?? '', {
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

export async function getSpotifyApiFromCache(): Promise<SpotifyApi | null> {
  const accessTokenRaw = await AsyncStorage.getItem(
    SPOTIFY_CONST.asyncStorageAccessKey
  )

  if (!accessTokenRaw) {
    return null
  }

  const accessToken = JSON.parse(accessTokenRaw) as AccessToken
  return getSpotifyApi(accessToken)
}

export function getSpotifyApi(accessToken: AccessToken): SpotifyApi {
  return SpotifyApi.withAccessToken(SPOTIFY_CONST.clientId, accessToken, {
    cachingStrategy: new AsyncStorageCachingStrategy(),
    deserializer: new UnhealthyResponseDeserializer(),
  })
}
