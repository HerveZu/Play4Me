import { IResponseDeserializer, SpotifyApi } from '@spotify/web-api-ts-sdk'
import { differenceInSeconds } from 'date-fns'

export const SPOTIFY = {
  clientId: (process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ??
    process.env.SPOTIFY_CLIENT_ID)!,
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

export async function unfollowPlaylist(
  spotifyApi: SpotifyApi,
  playlistId: string
) {
  const result = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/followers`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${(await spotifyApi.getAccessToken())?.access_token}`,
      },
    }
  )

  if (!result.ok) {
    throw new Error(
      `Failed to delete playlist followers (${result.status}) ${await result.text()}`
    )
  }
}
