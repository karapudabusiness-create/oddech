import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { MIN_TOUCH, useTheme } from '@/theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  fullWidth,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors, radii, spacing } = useTheme();
  const bg: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.secondaryStrong,
    soft: colors.surfaceSoft,
    ghost: 'transparent',
    danger: 'transparent',
  };
  const fg: Record<ButtonVariant, string> = {
    primary: colors.onPrimary,
    secondary: colors.onSecondaryStrong,
    soft: colors.primaryText,
    ghost: colors.primaryText,
    danger: colors.dangerText,
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      hitSlop={size === 'sm' ? 6 : 0}
      style={({ pressed }) => [
        {
          minHeight: size === 'sm' ? 36 : MIN_TOUCH + 4,
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
          borderRadius: radii.pill,
          backgroundColor: bg[variant],
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {icon}
          <Text
            variant={size === 'sm' ? 'caption' : 'bodyStrong'}
            style={{ color: fg[variant], fontWeight: '700' }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
