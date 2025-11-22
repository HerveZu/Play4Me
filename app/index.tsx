import { useRouter } from 'expo-router'
import { authClient } from '@/providers/auth'
import { useEffect } from 'react'

export default function IndexPage() {
  const router = useRouter()
  const { isPending, data } = authClient.useSession()

  useEffect(() => {
    if (isPending) {
      return
    }
    router.replace(data ? '/playlists' : '/sign-in')
  }, [router, data, isPending])

  return null
}
