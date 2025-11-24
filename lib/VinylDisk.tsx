import { useEffect, useMemo, useState } from 'react'
import { Circle, Image, VStack } from '@expo/ui/swift-ui'
import {
  foregroundStyle,
  frame,
  padding,
  rotationEffect,
  saturation,
  zIndex,
} from '@expo/ui/swift-ui/modifiers'
import { useTheme } from '@react-navigation/core'
import { AppState, useColorScheme } from 'react-native'

export type VinylState = 'paused' | 'pending' | 'playing'

const VinyConst = {
  FPS: 60,
  TEXT_SIZE: 34,
  CIRCLE_COUNT: 20,
  COLORS: {
    dark: [
      'rgb(10, 10, 10)',
      'rgb(35, 35, 35)',
      'rgb(10, 10, 10)',
      'rgb(35, 35, 35)',
      'rgb(10, 10, 10)',
    ],
    light: [
      'rgb(35, 35, 35)',
      'rgb(100, 100, 100)',
      'rgb(35, 35, 35)',
      'rgb(100, 100, 100)',
      'rgb(35, 35, 35)',
    ],
  },
}

export function VinylDisk({
  size,
  state,
}: {
  size: number
  state: VinylState
}) {
  const [rotation, setRotation] = useState(0)
  const colorScheme = useColorScheme()
  const theme = useTheme()

  useEffect(() => {
    if (state !== 'playing') return
    function startInterval() {
      return setInterval(() => {
        setRotation((rotation) => rotation + 5)
      }, 1000 / VinyConst.FPS)
    }
    let handler = startInterval()

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active') {
        clearInterval(handler)
      } else {
        handler = startInterval()
      }
    })

    return () => {
      clearInterval(handler)
      subscription.remove()
    }
  }, [state])

  const innerDiskSize = useMemo(() => 0.4 * size, [size])

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
              foregroundStyle(
                i % 2 === 0
                  ? {
                      color: 'black',
                      type: 'color',
                    }
                  : {
                      type: 'angularGradient',
                      center: { x: 0.5, y: 0.5 },
                      colors: VinyConst.COLORS[colorScheme ?? 'light'],
                    }
              ),
              frame({ height: circleSize, width: circleSize }),
              zIndex(i),
              padding({
                top: -((size + circleSize) / 2),
              }),
            ]}
          />
        )
      })}
      <Circle
        modifiers={[
          foregroundStyle({ color: theme.colors.primary, type: 'color' }),
          saturation(0.5),
          frame({ height: innerDiskSize, width: innerDiskSize }),
          padding({ top: -(size + innerDiskSize) / 2 }),
          zIndex(VinyConst.CIRCLE_COUNT + 1),
        ]}
      />
      <Image
        systemName={'music.note'}
        size={VinyConst.TEXT_SIZE}
        modifiers={[
          padding({ top: -(size + VinyConst.TEXT_SIZE * 1.25) / 2 }),
          zIndex(VinyConst.CIRCLE_COUNT + 2),
        ]}
      />
    </VStack>
  )
}
