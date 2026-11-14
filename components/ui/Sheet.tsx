import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { X } from 'lucide-react-native';

import { strings } from '@/i18n';
import { useTheme } from '@/theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Dolny arkusz (bottom sheet) oparty na Modal + Reanimated. */
export function Sheet({ visible, onClose, title, children, footer }: SheetProps) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);
  // Montujemy od razu przy otwarciu (wzorzec „dostosuj stan podczas renderu”), odmontowujemy po animacji.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      progress.set(
        withTiming(1, { duration: reduceMotion ? 0 : 260, easing: Easing.out(Easing.cubic) }),
      );
    } else {
      progress.set(
        withTiming(0, { duration: reduceMotion ? 0 : 200 }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, progress, reduceMotion]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.get()) * 400 }],
    opacity: reduceMotion ? progress.get() : 1,
  }));

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[{ flex: 1, backgroundColor: colors.overlay }, backdropStyle]}>
        <Pressable
          style={{ flex: 1 }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={strings.common.close}
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: height * 0.85,
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            paddingBottom: insets.bottom + spacing.lg,
          },
          sheetStyle,
        ]}
      >
        <View style={{ alignItems: 'center', paddingTop: spacing.sm }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: spacing.xl,
            paddingRight: spacing.sm,
            paddingTop: spacing.sm,
          }}
        >
          <Text variant="heading" accessibilityRole="header" style={{ flex: 1 }}>
            {title ?? ''}
          </Text>
          <IconButton accessibilityLabel={strings.common.close} onPress={onClose}>
            <X color={colors.textMuted} size={22} />
          </IconButton>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg }}
        >
          {children}
        </ScrollView>
        {footer ? <View style={{ paddingHorizontal: spacing.xl }}>{footer}</View> : null}
      </Animated.View>
    </Modal>
  );
}
