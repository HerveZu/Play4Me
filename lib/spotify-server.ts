import { auth } from '@/lib/auth'
import { getSpotifyApi } from '@/lib/spotify'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

export async function getServerSpotifyApi({
  userId,
}: {
  userId: string
}): Promise<SpotifyApi> {
  const { accessToken, accessTokenExpiresAt } = await auth.api.getAccessToken({
    body: {
      providerId: 'spotify',
      userId,
    },
  })
  return getSpotifyApi({ accessToken, expiresAt: accessTokenExpiresAt! })
}
