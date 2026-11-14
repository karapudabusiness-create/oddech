import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/stores/toast';
import { useTheme } from '@/theme';
import { Text } from './Text';

const DURATION_MS = 5000;

/** Dolny komunikat z opcjonalną akcją (np. „Cofnij” po usunięciu). */
export function ToastHost({ bottomOffset = 72 }: { bottomOffset?: number }) {
  const { id, message, actionLabel, onAction, hide } = useToast();
  const { colors, radii, spacing, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    AccessibilityInfo.announceForAccessibility(message);
    const t = setTimeout(hide, DURATION_MS);
    return () => clearTimeout(t);
  }, [id, message, hide]);

  if (!message) return null;
  const bg = scheme === 'dark' ? colors.surfaceSoft : colors.text;
  const fg = scheme === 'dark' ? colors.text : colors.background;

  return (
    <Animated.View
      key={id}
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(150)}
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom: insets.bottom + bottomOffset,
      }}
    >
      <View
        accessibilityLiveRegion="polite"
        style={{
          backgroundColor: bg,
          borderRadius: radii.lg,
          paddingVertical: spacing.md,
          paddingLeft: spacing.lg,
          paddingRight: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <Text style={{ color: fg, flex: 1 }}>{message}</Text>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onAction();
              hide();
            }}
            style={{
              minHeight: 44,
              minWidth: 44,
              paddingHorizontal: spacing.md,
              justifyContent: 'center',
            }}
          >
            <Text
              variant="bodyStrong"
              style={{ color: scheme === 'dark' ? colors.primary : colors.gradientEnd }}
            >
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
