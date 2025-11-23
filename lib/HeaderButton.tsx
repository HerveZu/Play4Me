import {
  TouchableOpacity,
  TouchableOpacityProps,
  useColorScheme,
} from 'react-native'
import { SymbolView } from 'expo-symbols'
import { useTheme } from '@react-navigation/core'
import { alpha } from '@/lib/utils'
import { SFSymbols6_0 } from 'sf-symbols-typescript'

export function HeaderButton({
  sfSymbol,
  style,
  disabled,
  ...props
}: { sfSymbol: SFSymbols6_0 } & Omit<TouchableOpacityProps, 'children'>) {
  const theme = useTheme()
  const colorScheme = useColorScheme()

  return (
    <TouchableOpacity
      {...props}
      style={[
        {
          display: 'flex',
          marginLeft: 5, // not aligned by default (liquid glass?)
        },
        style,
      ]}
    >
      <SymbolView
        name={sfSymbol}
        tintColor={alpha(
          colorScheme === 'dark' ? theme.colors.border : theme.colors.text,
          disabled ? 0.3 : 1
        )}
      />
    </TouchableOpacity>
  )
}
