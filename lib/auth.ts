import { betterAuth } from 'better-auth'
import { expo } from '@better-auth/expo'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db'
import * as authSchema from '@/db/schema/auth'
import { authClient } from '@/providers/auth'
import { SPOTIFY } from '@/lib/spotify'
import { playlists } from '@/db/schema/public'
import { DEFAULT_PLAYLIST } from '@/lib/defaults'

export type AuthSession = NonNullable<
  ReturnType<typeof authClient.useSession>['data']
>

export const auth = betterAuth({
  plugins: [expo()],
  socialProviders: {
    spotify: {
      clientId: SPOTIFY.clientId,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      scope: [
        'user-top-read',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-recently-played',
        'playlist-read-private',
        'playlist-modify-private',
      ],
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db.insert(playlists).values({
            title: DEFAULT_PLAYLIST.title,
            description: DEFAULT_PLAYLIST.description,
            ownerId: user.id,
            settings: DEFAULT_PLAYLIST.settings,
          })
        },
      },
    },
  },
  database: drizzleAdapter(db, {
    usePlural: true,
    provider: 'pg',
    schema: authSchema,
  }),
  trustedOrigins: ['com.play4me://'],
})

export async function withSession(
  request: Request,
  handler: (session: AuthSession) => Promise<Response>
) {
  const authResult = await ensureAuthenticated(request)

  return authResult.success ? handler(authResult.session) : authResult.response
}

export async function ensureAuthenticated(
  request: Request
): Promise<
  | { success: true; session: AuthSession }
  | { success: false; response: Response }
> {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return {
      success: false,
      response: new Response('Unauthorized', { status: 401 }),
    }
  }

  return { success: true, session }
}
