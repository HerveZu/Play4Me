import { betterAuth } from 'better-auth'
import { expo } from '@better-auth/expo'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db'
import * as authSchema from '@/db/schema/auth'
import { authClient } from '@/providers/auth'

export type AuthSession = NonNullable<
  ReturnType<typeof authClient.useSession>['data']
>

export const auth = betterAuth({
  plugins: [expo()],
  socialProviders: {
    spotify: {
      clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      scope: [
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-recently-played',
        'playlist-read-private',
        'playlist-modify-private',
      ],
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
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  // todo: RLS, authenticated user

  return handler(session)
}
