import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Text } from './Text';

export interface ScreenProps extends ScrollViewProps {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  scroll?: boolean;
  children: ReactNode;
}

/** Wspólny układ ekranów zakładek: bezpieczne marginesy, nagłówek, przewijanie. */
export function Screen({
  title,
  subtitle,
  headerRight,
  scroll = true,
  children,
  contentContainerStyle,
  ...rest
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const header = title ? (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
      }}
    >
      <View style={{ flex: 1 }}>
        {subtitle ? (
          <Text variant="caption" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {headerRight}
    </View>
  ) : null;

  const padding = {
    paddingTop: insets.top + spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  };

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.background }, padding]}>
        {header}
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[padding, { gap: spacing.lg }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {header}
      {children}
    </ScrollView>
  );
}
