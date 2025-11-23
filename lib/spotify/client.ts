import { authClient } from '@/providers/auth'
import { getSpotifyApi } from '@/lib/spotify/index'

export async function getClientSpotifyApi() {
  const accessTokenResult = await authClient.getAccessToken({
    providerId: 'spotify',
  })

  if (accessTokenResult.error) {
    throw new Error(
      `Failed to get access token: ${accessTokenResult.error.message}`
    )
  }

  const {
    data: { accessToken, accessTokenExpiresAt },
  } = accessTokenResult

  return getSpotifyApi({
    accessToken,
    expiresAt: accessTokenExpiresAt!,
  })
}
