import {
  Form,
  Host,
  HStack,
  Image,
  Section,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui'
import { usePlaylists } from '@/providers/playlists'
import { useRouter } from 'expo-router'

export default function HomePage() {
  const { playlists } = usePlaylists()
  const router = useRouter()

  return (
    <Host style={{ flex: 1 }}>
      <Form>
        <Section>
          {playlists?.map((playlist) => (
            <HStack
              key={playlist.id}
              onPress={() => router.push(`/player?playlistId=${playlist.id}`)}
            >
              <VStack alignment={'leading'} spacing={10}>
                <HStack spacing={10}>
                  <Image systemName={'music.note'} size={18} />
                  <Text weight={'semibold'}>{playlist.title}</Text>
                </HStack>
                <Text weight={'light'}>{playlist.description}</Text>
              </VStack>
              <Spacer />
              <Image systemName={'chevron.right'} />
            </HStack>
          ))}
        </Section>
      </Form>
    </Host>
  )
}
