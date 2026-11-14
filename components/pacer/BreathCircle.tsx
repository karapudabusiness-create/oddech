import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { phaseAt, type PacerConfig } from '@/features/pacer/engine';
import { useTheme } from '@/theme';

const MIN_SCALE = 0.5;

/**
 * Koło oddechu. Skala liczona co klatkę na wątku UI z czasu sesji (sinusoidalne wygładzenie w engine).
 * reduceMotion: koło nie zmienia rozmiaru – zmienia się tylko intensywność wypełnienia.
 */
export function BreathCircle({
  elapsed,
  config,
  size,
  reduceMotion,
}: {
  elapsed: SharedValue<number>;
  config: PacerConfig;
  size: number;
  reduceMotion: boolean;
}) {
  const { colors, scheme } = useTheme();

  const circleStyle = useAnimatedStyle(() => {
    const { level } = phaseAt(elapsed.get(), config);
    if (reduceMotion) return { transform: [{ scale: 0.85 }], opacity: 0.45 + 0.55 * level };
    return { transform: [{ scale: MIN_SCALE + (1 - MIN_SCALE) * level }], opacity: 1 };
  });

  const haloStyle = useAnimatedStyle(() => {
    const { level } = phaseAt(elapsed.get(), config);
    if (reduceMotion) return { transform: [{ scale: 0.95 }], opacity: 0.25 };
    return { transform: [{ scale: 0.62 + 0.42 * level }], opacity: 0.18 + 0.22 * level };
  });

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Stały obrys docelowego rozmiaru – punkt odniesienia dla wdechu */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: scheme === 'dark' ? 'rgba(230,241,244,0.18)' : 'rgba(46,125,175,0.25)',
        }}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.secondary,
          },
          haloStyle,
        ]}
      />
      <Animated.View
        style={[
          { width: size * 0.86, height: size * 0.86, borderRadius: size, overflow: 'hidden' },
          circleStyle,
        ]}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
