import { useEffect, useMemo, useState } from 'react'
import { Form, Host, Section, Switch, TextField } from '@expo/ui/swift-ui'
import { usePlaylists } from '@/providers/playlists'
import { useNavigation, useRouter } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { HeaderButton } from '@/lib/HeaderButton'
import { frame } from '@expo/ui/swift-ui/modifiers'
import { z } from 'zod'

const CreatePlaylistInputSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  settings: z.object({
    usePreferences: z.boolean().optional(),
    dontRepeatFromHistory: z.boolean().optional(),
  }),
})

export default function NewPlaylistPage() {
  const [playlistDetails, setPlaylistDetails] = useState({
    title: '',
    description: '',
    settings: {
      usePreferences: true,
      dontRepeatFromHistory: true,
    },
  })
  const router = useRouter()
  const navigation = useNavigation()

  const { createPlaylist } = usePlaylists()

  const { mutate: handleCreatePlaylist, isPending } = useMutation({
    mutationKey: ['create-playlist', playlistDetails],
    mutationFn: async () => {
      const playlist = await createPlaylist(playlistDetails)
      router.push(`/player?playlistId=${playlist.id}`)
    },
  })

  const disabled = useMemo(
    () =>
      isPending || !!CreatePlaylistInputSchema.safeParse(playlistDetails).error,
    [isPending, playlistDetails]
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
          <TextField
            placeholder="Title"
            defaultValue={playlistDetails.title}
            onChangeText={(title) =>
              setPlaylistDetails((playlist) => ({ ...playlist, title }))
            }
          />
        </Section>

        <Section title="Describe what'd you like to listen to">
          <TextField
            placeholder={' '} // Empty strings break it
            defaultValue={playlistDetails.description}
            onChangeText={(description) =>
              setPlaylistDetails((playlist) => ({ ...playlist, description }))
            }
            multiline
            modifiers={[frame({ minHeight: 100 })]}
          />
        </Section>

        <Section title={'Music selection'}>
          <Switch
            value={playlistDetails.settings.usePreferences}
            onValueChange={(usePreferences) =>
              setPlaylistDetails((playlist) => ({
                ...playlist,
                settings: {
                  ...playlist.settings,
                  usePreferences,
                },
              }))
            }
            label={'Use my preferences'}
          />
          <Switch
            value={playlistDetails.settings.dontRepeatFromHistory}
            onValueChange={(dontRepeatFromHistory) =>
              setPlaylistDetails((playlist) => ({
                ...playlist,
                settings: {
                  ...playlist.settings,
                  dontRepeatFromHistory,
                },
              }))
            }
            label="Don't repeat from history"
          />
        </Section>
      </Form>
    </Host>
  )
}
