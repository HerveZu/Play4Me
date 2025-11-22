import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { useTheme } from '@react-navigation/core'
import { HStack } from '@expo/ui/swift-ui'
import { frame } from '@expo/ui/swift-ui/modifiers'

const BAR_MAX_HEIGHT = 20
const BAR_MIN_SCALE = 0.2
const ANIMATION_DURATION = 400

/**
 * A single animated bar.
 * It animates its `scaleY` transform to simulate growing from the bottom.
 */
const AnimatedBar = ({ delay = 500 }) => {
  // We use useRef to keep the animated value persistent across renders
  const anim = useRef(new Animated.Value(0)).current
  const theme = useTheme()

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        // Animate "up"
        Animated.timing(anim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          delay: delay,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        // Animate "down"
        Animated.timing(anim, {
          toValue: BAR_MIN_SCALE,
          duration: ANIMATION_DURATION,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [anim, delay])

  // We animate `scaleY` (vertical scale) instead of `height`
  // This allows us to use `useNativeDriver: true` for performance.
  const scaleY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [BAR_MIN_SCALE, 1], // Map 0 -> 20% scale, 1 -> 100% scale
  })

  // When scaling, the default is from the center.
  // We use `translateY` to shift the bar down as it scales
  // so it looks like it's "growing" from the bottom.
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      (BAR_MAX_HEIGHT * (1 - BAR_MIN_SCALE)) / 2, // (20 * (1 - 0.2)) / 2 = 8
      0,
    ],
  })

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          transform: [{ scaleY }, { translateY }],
          backgroundColor: theme.colors.primary,
        },
      ]}
    />
  )
}

export const PlayingIndicator = () => {
  return (
    <HStack modifiers={[frame({ width: 25, height: 25 })]}>
      <View style={styles.container}>
        <AnimatedBar delay={0} />
        <AnimatedBar delay={200} />
        <AnimatedBar delay={400} />
      </View>
    </HStack>
  )
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_MAX_HEIGHT,
    width: 20,
    justifyContent: 'space-between',
  },
  bar: {
    width: 4,
    height: BAR_MAX_HEIGHT,
    borderRadius: 2,
  },
})
