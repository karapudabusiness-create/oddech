import { Check } from 'lucide-react-native';
import { Pressable } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { MIN_TOUCH, useTheme } from '@/theme';

export function Checkbox({
  checked,
  onToggle,
  accessibilityLabel,
}: {
  checked: boolean;
  onToggle: () => void;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  const size = 28;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      onPress={onToggle}
      hitSlop={(MIN_TOUCH - size) / 2}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: checked ? colors.secondaryStrong : colors.border,
        backgroundColor: checked ? colors.secondaryStrong : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}
    >
      {checked ? (
        <Animated.View entering={ZoomIn.duration(180)}>
          <Check color={colors.onSecondaryStrong} size={18} strokeWidth={3} />
        </Animated.View>
      ) : null}
    </Pressable>
  );
}
