import { db } from '@/db'
import { eq } from 'drizzle-orm'
import { withSession } from '@/lib/auth'
import { accounts } from '@/db/schema/auth'

export type UserAccounts = (typeof accounts.$inferSelect)[]

export async function GET(request: Request) {
  return await withSession(request, async (session) => {
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, session.user.id))

    return Response.json(userAccounts as UserAccounts)
  })
}
