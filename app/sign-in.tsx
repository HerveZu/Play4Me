import { authClient } from '@/providers/auth'
import { Button, Host } from '@expo/ui/swift-ui'
import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { ActivityIndicator } from 'react-native'

export default function SocialSignIn() {
  const session = authClient.useSession()
  const router = useRouter()

  useEffect(() => {
    session.data && router.replace('/home')
  }, [router, session])

  const handleLogin = async () => {
    await authClient.signIn.social({
      provider: 'spotify',
      callbackURL: '/success',
    })
  }
  return (
    <Host style={{ flex: 1 }}>
      {session.isPending ? (
        <Host>
          <ActivityIndicator />
        </Host>
      ) : (
        <Button onPress={handleLogin}>Login with Spotify</Button>
      )}
    </Host>
  )
}
