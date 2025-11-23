import { ensureAuthenticated } from '@/lib/auth'

export default async function middleware(request: Request) {
  await ensureAuthenticated(request)
}
