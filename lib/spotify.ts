import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { differenceInSeconds } from 'date-fns'

export const SPOTIFY = {
  clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!,
}

export function getSpotifyApi({
  accessToken,
  expiresAt,
}: {
  accessToken: string
  expiresAt: Date
}) {
  return SpotifyApi.withAccessToken(SPOTIFY.clientId, {
    token_type: 'Bearer',
    refresh_token: '', // prevent from refreshing the token as better-auth takes care of it
    access_token: accessToken,
    expires: expiresAt.getTime(),
    expires_in: differenceInSeconds(new Date(), expiresAt),
  })
}
