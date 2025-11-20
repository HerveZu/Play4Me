import {
  Circle,
  CircularProgress,
  Form,
  Host,
  HStack,
  Section,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui'
import { usePlaylists } from '@/providers/playlists'
import { usePlayback } from '@/providers/playback'
import { UserPlaylist } from '@/app/(authenticated)/api/playlist/index+api'
import { useEffect, useMemo, useState } from 'react'
import {
  foregroundStyle,
  frame,
  padding,
  rotationEffect,
  saturation,
  shadow,
  zIndex,
} from '@expo/ui/swift-ui/modifiers'

export default function HomePage() {
  const { playlists } = usePlaylists()
  return (
    <Host style={{ flex: 1 }}>
      <Form>
        {playlists?.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </Form>
    </Host>
  )
}

function PlaylistCard({ playlist }: { playlist: UserPlaylist }) {
  const { playlists } = usePlaylists()

  const isActive = useMemo(
    () => playlists?.some((p) => p.id === playlist.id && playlist.active),
    [playlists, playlist.id, playlist.active]
  )

  const { start, stop } = usePlaylists()
  const { defaultPlaybackDevice } = usePlayback()
  const [state, setState] = useState<VinylState>(
    isActive ? 'playing' : 'paused'
  )

  function handlePress() {
    if (state === 'playing') {
      setState('pending')
      stop({ playlistId: playlist.id })
        .then(() => setState('paused'))
        .catch(() => setState('playing'))
    } else {
      setState('pending')
      start({
        playlistId: playlist.id,
        deviceId: defaultPlaybackDevice?.id ?? '',
      })
        .then(() => setState('playing'))
        .catch(() => setState('paused'))
    }
  }
  return (
    <Section modifiers={[padding({ all: 4 })]}>
      <VStack onPress={handlePress}>
        <VStack alignment={'leading'}>
          <HStack>
            <Text weight={'bold'}>{playlist.title}</Text>
            <Spacer />
            {state === 'pending' && <CircularProgress />}
          </HStack>
          <Spacer />
          <Text>{playlist.description}</Text>
        </VStack>

        <Spacer minLength={30} />
        <HStack>
          <Spacer />
          <VinylDisk
            color={'red'}
            size={240}
            playlist={playlist}
            state={state}
          />
          <Spacer />
        </HStack>
      </VStack>
    </Section>
  )
}

type VinylState = 'paused' | 'pending' | 'playing'

const VinyConst = {
  FPS: 60,
  TEXT_SIZE: 24,
  CIRCLE_COUNT: 20,
}

function VinylDisk({
  color,
  size,
  playlist,
  state,
}: {
  color: string
  size: number
  playlist: UserPlaylist
  state: VinylState
}) {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    if (state !== 'playing') return
    const handler = setInterval(() => {
      setRotation((rotation) => rotation + 5)
    }, 1000 / VinyConst.FPS)

    return () => clearInterval(handler)
  }, [state])

  const innerDiskSize = 0.4 * size

  return (
    <VStack modifiers={[padding({ top: size }), rotationEffect(rotation)]}>
      {Array.from({ length: VinyConst.CIRCLE_COUNT }).map((_, i) => {
        const circleSize =
          ((VinyConst.CIRCLE_COUNT - i) / VinyConst.CIRCLE_COUNT) *
            (size - innerDiskSize) +
          innerDiskSize

        return (
          <Circle
            key={i}
            modifiers={[
              foregroundStyle({
                color: i % 2 === 0 ? 'black' : 'rgba(255,255,255,0.1)',
                type: 'color',
              }),
              frame({ height: circleSize, width: circleSize }),
              zIndex(i),
              padding({
                top: -((size + circleSize) / 2),
              }),
              shadow({
                radius: i === 0 ? 3 : 0,
                color: 'black',
              }),
            ]}
          />
        )
      })}
      <Circle
        modifiers={[
          foregroundStyle({ color: color, type: 'color' }),
          saturation(0.2),
          frame({ height: innerDiskSize, width: innerDiskSize }),
          padding({ top: -(size + innerDiskSize) / 2 }),
          zIndex(VinyConst.CIRCLE_COUNT + 1),
        ]}
      />
      <Text
        size={VinyConst.TEXT_SIZE}
        weight={'semibold'}
        modifiers={[
          padding({ top: -(size + VinyConst.TEXT_SIZE * 1.25) / 2 }),
          zIndex(VinyConst.CIRCLE_COUNT + 2),
        ]}
      >
        {playlist.title.slice(0, 3).toUpperCase()}
      </Text>
    </VStack>
  )
}
