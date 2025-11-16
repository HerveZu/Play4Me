import { IResponseDeserializer, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { differenceInSeconds } from 'date-fns'

export const SPOTIFY = {
  clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!,
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

export function getSpotifyApi({
  accessToken,
  expiresAt,
}: {
  accessToken: string
  expiresAt: Date
}) {
  return SpotifyApi.withAccessToken(
    SPOTIFY.clientId,
    {
      token_type: 'Bearer',
      refresh_token: '', // prevent from refreshing the token as better-auth takes care of it
      access_token: accessToken,
      expires: expiresAt.getTime(),
      expires_in: differenceInSeconds(new Date(), expiresAt),
    },
    {
      deserializer: new UnhealthyResponseDeserializer(),
    }
  )
}
