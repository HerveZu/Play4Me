import { useEffect, useMemo, useState } from 'react'
import {
  Form,
  Host,
  HStack,
  Image,
  Section,
  Text,
  TextField,
  VStack,
} from '@expo/ui/swift-ui'
import { usePlaylists } from '@/providers/playlists'
import { useNavigation, useRouter } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { HeaderButton } from '@/lib/HeaderButton'

export default function NewPlaylistPage() {
  const [playlistName, setPlaylistName] = useState('')
  const [description, setDescription] = useState('')
  const router = useRouter()
  const navigation = useNavigation()

  const { createPlaylist } = usePlaylists()

  const { mutate: handleCreatePlaylist, isPending } = useMutation({
    mutationFn: async () => {
      const playlist = await createPlaylist({
        title: playlistName,
        description,
      })
      router.push(`/player?playlistId=${playlist.id}`)
    },
  })

  const disabled = useMemo(
    () => isPending || !playlistName || !description,
    [isPending, playlistName, description]
  )
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderButton
          disabled={disabled}
          sfSymbol={'checkmark'}
          onPress={() => handleCreatePlaylist()}
        />
      ),
    })
  }, [disabled, handleCreatePlaylist, navigation])

  return (
    <Host style={{ flex: 1 }}>
      <Form>
        <Section>
          <HStack spacing={10}>
            <Image systemName={'info.circle'} size={18} />
            <VStack alignment={'leading'} spacing={4}>
              <Text weight={'light'}>
                Songs will be automatically added as the playlist runs. Your
                music preference and playback history will be taken into
                account.
              </Text>
            </VStack>
          </HStack>
        </Section>

        <Section title={'Playlist details'}>
          <TextField
            placeholder="Playlist name"
            defaultValue={'My Playlist'}
            onChangeText={setPlaylistName}
          />
          <TextField
            placeholder={'Cool music for a good mood :)'}
            onChangeText={setDescription}
            multiline
          />
        </Section>
      </Form>
    </Host>
  )
}
