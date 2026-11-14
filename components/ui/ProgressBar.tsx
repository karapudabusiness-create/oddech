import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme';

export function ProgressBar({
  value,
  height = 10,
  label,
}: {
  value: number;
  height?: number;
  label: string;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, value));
  const width = useSharedValue(clamped);

  useEffect(() => {
    width.set(withTiming(clamped, { duration: reduceMotion ? 0 : 450 }));
  }, [clamped, reduceMotion, width]);

  const style = useAnimatedStyle(() => ({ width: `${width.get() * 100}%` }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: colors.surfaceSoft,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[{ height: '100%', borderRadius: height / 2, overflow: 'hidden' }, style]}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
