import { useEffect, useState } from 'react'
import { Circle, Image, VStack } from '@expo/ui/swift-ui'
import {
  foregroundStyle,
  frame,
  padding,
  rotationEffect,
  saturation,
  zIndex,
} from '@expo/ui/swift-ui/modifiers'

export type VinylState = 'paused' | 'pending' | 'playing'

const VinyConst = {
  FPS: 60,
  TEXT_SIZE: 28,
  CIRCLE_COUNT: 20,
}

export function VinylDisk({
  color,
  size,
  state,
}: {
  color: string
  size: number
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
              foregroundStyle(
                i % 2 === 0
                  ? {
                      color: 'black',
                      type: 'color',
                    }
                  : {
                      type: 'angularGradient',
                      center: { x: 0.5, y: 0.5 },
                      colors: [
                        'rgb(10, 10, 10)',
                        'rgb(35,35,35)',
                        'rgb(10, 10, 10)',
                        'rgb(35,35,35)',
                        'rgb(10, 10, 10)',
                      ],
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
          foregroundStyle({ color: color, type: 'color' }),
          saturation(0.2),
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
