import { useEffect, useMemo, useState } from 'react'
import { Button, Form, Host, Section, TextField } from '@expo/ui/swift-ui'
import { usePlaylists } from '@/providers/playlists'
import { useNavigation, useRouter } from 'expo-router'
import { frame } from '@expo/ui/swift-ui/modifiers'
import { useMutation } from '@tanstack/react-query'

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
        <Host matchContents>
          <Button
            disabled={disabled}
            variant={'glass'}
            systemImage={'checkmark'}
            onPress={handleCreatePlaylist}
          />
        </Host>
      ),
    })
  }, [disabled, handleCreatePlaylist, navigation])

  return (
    <Host style={{ flex: 1 }}>
      <Form>
        <Section>
          <TextField
            placeholder="Playlist name"
            defaultValue={'My Playlist'}
            onChangeText={setPlaylistName}
          />
          <TextField
            placeholder={'Cool music for a good mood :)'}
            onChangeText={setDescription}
            multiline
            numberOfLines={10}
            modifiers={[frame({ minHeight: 50 })]}
          />
        </Section>
      </Form>
    </Host>
  )
}
