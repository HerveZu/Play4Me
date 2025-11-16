import { auth, AuthSession } from '@/lib/auth'
import { getSpotifyApi } from '@/lib/spotify'

export async function getServerSpotifyApi(session: AuthSession) {
  const { accessToken, accessTokenExpiresAt } = await auth.api.getAccessToken({
    body: {
      providerId: 'spotify',
      userId: session.user.id,
    },
  })
  return getSpotifyApi({ accessToken, expiresAt: accessTokenExpiresAt! })
}
