import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';

import { MIN_TOUCH, useTheme } from '@/theme';

export interface IconButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  /** Wymagane – czytniki ekranu nie widzą ikony. */
  accessibilityLabel: string;
  children: ReactNode;
  tone?: 'plain' | 'soft' | 'primary';
  size?: number;
  style?: ViewStyle;
}

export function IconButton({
  children,
  tone = 'plain',
  size = MIN_TOUCH,
  style,
  ...rest
}: IconButtonProps) {
  const { colors } = useTheme();
  const bg =
    tone === 'soft' ? colors.surfaceSoft : tone === 'primary' ? colors.primary : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={Math.max(0, (MIN_TOUCH - size) / 2)}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          opacity: rest.disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
