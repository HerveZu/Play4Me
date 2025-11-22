import { authClient } from '@/providers/auth'
import { Button, Host, Text, VStack } from '@expo/ui/swift-ui'
import { useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function SocialSignIn() {
  const router = useRouter()
  const { data } = authClient.useSession()

  const handleLogin = async () => {
    await authClient.signIn.social({
      provider: 'spotify',
      callbackURL: '/',
    })
  }

  // the redirection occurs on a web popup
  // thus we need to redirect manually on native
  useEffect(() => {
    data && router.push('/')
  }, [data, router])

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
