import { authClient } from '@/providers/auth'
import { Button, Host, Text, VStack } from '@expo/ui/swift-ui'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'

export default function SocialSignIn() {
  const router = useRouter()
  const { data } = authClient.useSession()

  const handleLogin = async () => {
    await authClient.signIn.social({
      provider: 'spotify',
      callbackURL: '/success',
    })
  }

  useEffect(() => {
    data && router.replace('/player')
  }, [router, data])

  return (
    <Host style={{ flex: 1 }}>
      <VStack spacing={48}>
        <Text size={24}>Welcome to Play4Me!</Text>
        <Button onPress={handleLogin} variant={'glassProminent'}>
          Login with Spotify
        </Button>
      </VStack>
    </Host>
  )
}
