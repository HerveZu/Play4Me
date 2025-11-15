import { useState } from 'react'
import { Button, Form, Host, Section, TextField } from '@expo/ui/swift-ui'
import { usePlaylists } from '@/providers/playlists'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { frame } from '@expo/ui/swift-ui/modifiers'

export default function NewPlaylistPage() {
  const [playlistName, setPlaylistName] = useState('')
  const [description, setDescription] = useState('')
  const router = useRouter()

  const { addPlaylist } = usePlaylists()

  const { isPending, mutate: addToPlaylist } = useMutation({
    mutationFn: async () => {
      await addPlaylist({ name: playlistName, description })
      router.push('/home')
    },
  })

  const disabled = isPending || !playlistName || !description

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
            modifiers={[frame({ height: 50 })]}
          />
        </Section>

        <Host>
          <Button variant="link" onPress={addToPlaylist} disabled={disabled}>
            Add to Playlists
          </Button>
        </Host>
      </Form>
    </Host>
  )
}
